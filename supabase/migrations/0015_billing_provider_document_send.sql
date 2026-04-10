-- Billing provider state, webhook dedupe, and document_send ledger

alter table public.users
  add column if not exists trial_started_at timestamptz,
  add column if not exists billing_provider text,
  add column if not exists billing_provider_subscription_id text,
  add column if not exists billing_provider_price_id text,
  add column if not exists payment_method_brand text,
  add column if not exists payment_method_last4 text,
  add column if not exists billing_status_updated_at timestamptz not null default now();

update public.users
set
  trial_started_at = coalesce(
    trial_started_at,
    case
      when trial_ends_at is not null then trial_ends_at - interval '7 days'
      else created_at
    end
  ),
  current_period_end = coalesce(current_period_end, trial_ends_at),
  billing_status_updated_at = now()
where trial_started_at is null
   or (trial_ends_at is not null and current_period_end is null);

alter table public.users
  alter column trial_started_at set default now();

comment on column public.users.trial_started_at is '무료 체험 시작 시각(UTC)';
comment on column public.users.billing_provider is 'mock | stripe 등 결제 provider';
comment on column public.users.billing_provider_subscription_id is 'provider subscription id';
comment on column public.users.billing_provider_price_id is 'provider price id';
comment on column public.users.payment_method_brand is '등록된 기본 결제수단 brand';
comment on column public.users.payment_method_last4 is '등록된 기본 결제수단 마지막 네 자리';
comment on column public.users.billing_status_updated_at is '결제/구독 상태를 마지막으로 동기화한 시각';

create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null default '',
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

comment on table public.billing_webhook_events is 'billing webhook 중복 수신 방지 및 처리 이력';

create table if not exists public.document_send_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  document_kind text not null,
  document_id text not null,
  channel text not null,
  dedupe_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists document_send_events_user_id_created_at_idx
  on public.document_send_events (user_id, created_at desc);

comment on table public.document_send_events is '문서 전달 정책(email/share/pdf 등) 과금 집계 원장';

alter table public.document_send_events enable row level security;

create policy "document_send_events_select_own"
  on public.document_send_events
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.record_document_send(
  p_document_kind text,
  p_document_id text,
  p_channel text,
  p_dedupe_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ym text := to_char((timezone('utc', now()))::date, 'YYYY-MM');
  current_usage_month text;
  inserted_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  if trim(coalesce(p_document_kind, '')) = '' or trim(coalesce(p_document_id, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_document');
  end if;

  if trim(coalesce(p_channel, '')) = '' or trim(coalesce(p_dedupe_key, '')) = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_channel');
  end if;

  insert into public.document_send_events (
    user_id,
    document_kind,
    document_id,
    channel,
    dedupe_key,
    metadata
  )
  values (
    uid,
    trim(p_document_kind),
    trim(p_document_id),
    trim(p_channel),
    trim(p_dedupe_key),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id, dedupe_key) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return jsonb_build_object('ok', true, 'counted', false);
  end if;

  select usage_month
  into current_usage_month
  from public.users
  where id = uid
  for update;

  if current_usage_month is distinct from ym then
    update public.users
    set
      usage_month = ym,
      document_sends_this_month = 1,
      billing_status_updated_at = now()
    where id = uid;
  else
    update public.users
    set
      document_sends_this_month = document_sends_this_month + 1,
      billing_status_updated_at = now()
    where id = uid;
  end if;

  insert into public.billing_events (user_id, kind, message, metadata)
  values (
    uid,
    'document_send_counted',
    trim(p_document_kind) || ' / ' || trim(p_channel) || ' 전달 사용량이 집계되었습니다.',
    jsonb_build_object(
      'documentKind', trim(p_document_kind),
      'documentId', trim(p_document_id),
      'channel', trim(p_channel)
    ) || coalesce(p_metadata, '{}'::jsonb)
  );

  return jsonb_build_object('ok', true, 'counted', true);
end;
$$;

grant execute on function public.record_document_send(text, text, text, text, jsonb) to authenticated;
