-- BYOA 카카오(알림톡) 연동 설정, 발송 로그, 고객 미니 포털 토큰, 청구 추심 보조 필드,
-- 공개 문의 제출 시 activity_logs 보강(신규 고객·접수 이벤트)

-- 고객 미니 포털(링크 1개로 견적·청구 요약)
alter table public.customers
  add column if not exists portal_token text;

create unique index if not exists customers_portal_token_uidx
  on public.customers (portal_token)
  where portal_token is not null;

comment on column public.customers.portal_token is '고객용 미니 포털(/c/[token]) — Pro에서 발급';

-- 청구 추심 보조
alter table public.invoices
  add column if not exists promised_payment_date date,
  add column if not exists next_collection_followup_at timestamptz,
  add column if not exists collection_tone text not null default 'neutral';

comment on column public.invoices.promised_payment_date is '고객 입금 약속일(운영 기록)';
comment on column public.invoices.next_collection_followup_at is '다음 추심·연락 예정일';
comment on column public.invoices.collection_tone is '리마인드 톤 힌트: polite|neutral|firm';

-- 사용자별 메시징 채널(BYOA — Bill-IO는 과금하지 않음)
create table if not exists public.messaging_channel_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  channel_kind text not null default 'kakao_alimtalk',
  provider_type text not null default 'custom_http',
  api_endpoint text not null default '',
  api_key text,
  api_key_header text not null default 'Authorization',
  sender_key text not null default '',
  template_code text not null default '',
  enabled boolean not null default false,
  extra_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, channel_kind)
);

create index if not exists idx_messaging_channel_configs_user
  on public.messaging_channel_configs (user_id);

comment on table public.messaging_channel_configs is '사용자 BYOA 메시징(알림톡 등) — 엔드포인트·키는 사용자가 직접 보유';

drop trigger if exists set_messaging_channel_configs_updated_at on public.messaging_channel_configs;
create trigger set_messaging_channel_configs_updated_at
  before update on public.messaging_channel_configs
  for each row
  execute function public.set_updated_at();

alter table public.messaging_channel_configs enable row level security;

create policy "messaging_channel_configs_select_own"
  on public.messaging_channel_configs for select to authenticated
  using (auth.uid() = user_id);
create policy "messaging_channel_configs_insert_own"
  on public.messaging_channel_configs for insert to authenticated
  with check (auth.uid() = user_id);
create policy "messaging_channel_configs_update_own"
  on public.messaging_channel_configs for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messaging_channel_configs_delete_own"
  on public.messaging_channel_configs for delete to authenticated
  using (auth.uid() = user_id);

-- 발송 시도 로그(서버에서 insert — RLS: 본인만 조회; insert는 service 또는 trigger 없이 앱이 authenticated로만 넣음)
create table if not exists public.messaging_send_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  channel_kind text not null default 'kakao_alimtalk',
  recipient_phone text not null,
  status text not null,
  error_message text,
  related_kind text,
  related_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_messaging_send_logs_user_created
  on public.messaging_send_logs (user_id, created_at desc);

comment on table public.messaging_send_logs is 'BYOA 알림톡 등 발송 시도 기록';

alter table public.messaging_send_logs enable row level security;

create policy "messaging_send_logs_select_own"
  on public.messaging_send_logs for select to authenticated
  using (auth.uid() = user_id);
create policy "messaging_send_logs_insert_own"
  on public.messaging_send_logs for insert to authenticated
  with check (auth.uid() = user_id);

-- 고객 포털 페이로드 (Pro + portal_token)
create or replace function public.get_customer_portal_payload(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_t text;
  v_c record;
  v_plan text;
  v_bs record;
  v_quotes jsonb := '[]'::jsonb;
  v_invs jsonb := '[]'::jsonb;
begin
  v_t := nullif(trim(coalesce(p_token, '')), '');
  if v_t is null or length(v_t) < 12 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_token');
  end if;

  select c.*, u.plan as owner_plan
  into v_c
  from customers c
  join users u on u.id = c.user_id
  where c.portal_token = v_t
  limit 1;

  if v_c is null then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  v_plan := coalesce(v_c.owner_plan, 'free');
  if v_plan <> 'pro' then
    return jsonb_build_object('valid', false, 'reason', 'unavailable');
  end if;

  select
    b.business_name,
    b.owner_name,
    b.email,
    b.phone,
    b.bank_account,
    b.payment_terms,
    coalesce(b.public_inquiry_form_enabled, false) as form_on,
    b.public_inquiry_form_token
  into v_bs
  from business_settings b
  where b.user_id = v_c.user_id
  limit 1;

  select coalesce((
    select jsonb_agg(t.obj order by t.ct desc)
    from (
      select
        jsonb_build_object(
          'id', q.id,
          'quoteNumber', q.quote_number,
          'title', q.title,
          'status', q.status::text,
          'total', q.total,
          'validUntil', q.valid_until,
          'sentAt', q.sent_at,
          'publicToken', q.public_share_token
        ) as obj,
        q.created_at as ct
      from quotes q
      where q.user_id = v_c.user_id and q.customer_id = v_c.id
      order by q.created_at desc
      limit 5
    ) t
  ), '[]'::jsonb)
  into v_quotes;

  select coalesce((
    select jsonb_agg(t.obj order by t.ct desc)
    from (
      select
        jsonb_build_object(
          'id', inv.id,
          'invoiceNumber', inv.invoice_number,
          'invoiceType', inv.invoice_type::text,
          'amount', inv.amount,
          'paymentStatus', inv.payment_status::text,
          'dueDate', inv.due_date,
          'requestedAt', inv.requested_at,
          'paidAt', inv.paid_at,
          'publicToken', inv.public_share_token
        ) as obj,
        inv.created_at as ct
      from invoices inv
      where inv.user_id = v_c.user_id and inv.customer_id = v_c.id
      order by inv.created_at desc
      limit 5
    ) t
  ), '[]'::jsonb)
  into v_invs;

  return jsonb_build_object(
    'valid', true,
    'businessName', coalesce(v_bs.business_name, ''),
    'ownerName', coalesce(v_bs.owner_name, ''),
    'contactEmail', coalesce(v_bs.email, ''),
    'contactPhone', coalesce(v_bs.phone, ''),
    'bankAccount', coalesce(v_bs.bank_account, ''),
    'paymentTerms', coalesce(v_bs.payment_terms, ''),
    'customerName', coalesce(v_c.name, ''),
    'publicInquiryFormOn', coalesce(v_bs.form_on, false),
    'publicInquiryFormToken', v_bs.public_inquiry_form_token,
    'quotes', v_quotes,
    'invoices', v_invs
  );
end;
$$;

revoke all on function public.get_customer_portal_payload(text) from public;
grant execute on function public.get_customer_portal_payload(text) to anon, authenticated, service_role;

-- 공개 문의: 신규 고객·웹폼 접수 activity 보강
create or replace function public.submit_public_inquiry(
  p_token text,
  p_name text,
  p_phone text,
  p_email text,
  p_title text,
  p_details text,
  p_service_category text,
  p_hoped_date date,
  p_budget_min integer,
  p_budget_max integer,
  p_extra_notes text,
  p_consent boolean,
  p_honeypot text,
  p_source text default null,
  p_source_slug text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_phone_norm text;
  v_email_trim text;
  v_cid uuid;
  v_title text;
  v_cat text;
  v_details text;
  v_iid uuid;
  v_now timestamptz := now();
  v_source text;
  v_slug text;
  v_new_customer boolean := false;
begin
  if p_honeypot is not null and length(trim(p_honeypot)) > 0 then
    return jsonb_build_object('ok', true, 'skipped', true);
  end if;

  if not coalesce(p_consent, false) then
    return jsonb_build_object('ok', false, 'error', 'consent_required');
  end if;

  if p_token is null or length(trim(p_token)) < 16 then
    return jsonb_build_object('ok', false, 'error', 'invalid_token');
  end if;

  select b.user_id
  into v_owner
  from business_settings b
  where b.public_inquiry_form_token = trim(p_token)
    and coalesce(b.public_inquiry_form_enabled, false) = true
  limit 1;

  if v_owner is null then
    return jsonb_build_object('ok', false, 'error', 'form_unavailable');
  end if;

  v_title := trim(coalesce(p_title, ''));
  if length(v_title) < 1 or length(v_title) > 500 then
    return jsonb_build_object('ok', false, 'error', 'validation_title');
  end if;

  if length(trim(coalesce(p_name, ''))) < 1 or length(trim(p_name)) > 120 then
    return jsonb_build_object('ok', false, 'error', 'validation_name');
  end if;

  if length(trim(coalesce(p_phone, ''))) < 8 or length(trim(p_phone)) > 40 then
    return jsonb_build_object('ok', false, 'error', 'validation_phone');
  end if;

  if length(trim(coalesce(p_details, ''))) < 4 or length(trim(p_details)) > 20000 then
    return jsonb_build_object('ok', false, 'error', 'validation_details');
  end if;

  v_phone_norm := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  if length(v_phone_norm) < 8 then
    return jsonb_build_object('ok', false, 'error', 'validation_phone');
  end if;

  v_email_trim := nullif(lower(trim(coalesce(p_email, ''))), '');

  if exists (
    select 1
    from public_inquiry_submissions s
    where s.owner_user_id = v_owner
      and s.form_token = trim(p_token)
      and s.phone_normalized = v_phone_norm
      and s.created_at > v_now - interval '45 seconds'
  ) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public_inquiry_submissions (owner_user_id, form_token, phone_normalized)
  values (v_owner, trim(p_token), v_phone_norm);

  select c.id
  into v_cid
  from customers c
  where c.user_id = v_owner
    and (
      regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') = v_phone_norm
      or (
        v_email_trim is not null
        and length(v_email_trim) > 3
        and lower(trim(coalesce(c.email, ''))) = v_email_trim
      )
    )
  order by case
    when regexp_replace(coalesce(c.phone, ''), '[^0-9]', '', 'g') = v_phone_norm then 0
    else 1
  end
  limit 1;

  if v_cid is null then
    v_new_customer := true;
    insert into customers (user_id, name, phone, email, notes, tags)
    values (
      v_owner,
      trim(p_name),
      trim(p_phone),
      v_email_trim,
      '공개 문의 폼(web)으로 최초 유입',
      '{}'::text[]
    )
    returning id into v_cid;
  else
    update customers
    set
      name = case when length(trim(coalesce(name, ''))) < 1 then trim(p_name) else name end,
      email = coalesce(customers.email, v_email_trim),
      phone = case when customers.phone is null or length(trim(customers.phone)) < 1 then trim(p_phone) else customers.phone end,
      updated_at = v_now
    where id = v_cid;
  end if;

  v_cat := nullif(trim(coalesce(p_service_category, '')), '');
  if v_cat is null then
    v_cat := '일반';
  end if;
  if length(v_cat) > 200 then
    v_cat := left(v_cat, 200);
  end if;

  v_details := trim(p_details);
  if p_extra_notes is not null and length(trim(p_extra_notes)) > 0 then
    v_details := v_details || E'\n\n■ 추가 메모\n' || trim(p_extra_notes);
  end if;

  v_source := nullif(trim(lower(coalesce(p_source, ''))), '');
  v_slug := nullif(trim(coalesce(p_source_slug, '')), '');

  v_details := v_details || E'\n\n— 공개 문의 폼(웹)에서 제출됨';
  if v_source is not null then
    v_details := v_details || E'\n■ 유입 출처: ' || v_source;
    if v_slug is not null then
      v_details := v_details || ' · ' || v_slug;
    end if;
  end if;

  insert into inquiries (
    user_id,
    customer_id,
    title,
    channel,
    service_category,
    details,
    requested_date,
    budget_min,
    budget_max,
    stage,
    follow_up_at
  )
  values (
    v_owner,
    v_cid,
    v_title,
    '웹폼',
    v_cat,
    v_details,
    coalesce(p_hoped_date, (v_now at time zone 'Asia/Seoul')::date),
    p_budget_min,
    p_budget_max,
    'new'::inquiry_stage,
    case
      when p_hoped_date is not null
      then (p_hoped_date::timestamp + time '10:00') at time zone 'Asia/Seoul'
      else null
    end
  )
  returning id into v_iid;

  insert into activity_logs (
    user_id,
    customer_id,
    inquiry_id,
    action,
    description,
    metadata
  )
  values (
    v_owner,
    v_cid,
    v_iid,
    'public_inquiry.submitted',
    '공개 문의 폼으로 접수되었습니다.',
    jsonb_build_object(
      'title', v_title,
      'channel', '웹폼',
      'source', coalesce(v_source, 'web_form'),
      'sourceSlug', v_slug,
      'newCustomer', v_new_customer
    )
  );

  if v_new_customer then
    insert into activity_logs (
      user_id,
      customer_id,
      inquiry_id,
      action,
      description,
      metadata
    )
    values (
      v_owner,
      v_cid,
      v_iid,
      'customer.auto_created_public_form',
      '공개 문의 폼으로 신규 고객이 자동 등록되었습니다.',
      jsonb_build_object('name', trim(p_name), 'via', 'public_inquiry_form')
    );
  end if;

  insert into activity_logs (
    user_id,
    customer_id,
    inquiry_id,
    action,
    description,
    metadata
  )
  values (
    v_owner,
    v_cid,
    v_iid,
    'inquiry.created',
    v_title || ' 문의가 등록되었습니다.',
    jsonb_build_object(
      'via', 'public_inquiry_form',
      'title', v_title,
      'channel', '웹폼',
      'source', coalesce(v_source, 'web_form'),
      'sourceSlug', v_slug
    )
  );

  return jsonb_build_object(
    'ok', true,
    'inquiryId', v_iid,
    'customerId', v_cid,
    'ownerUserId', v_owner,
    'ownerPlan', (select u.plan from users u where u.id = v_owner limit 1)
  );
end;
$$;

revoke all on function public.submit_public_inquiry(
  text, text, text, text, text, text, text, date, integer, integer, text, boolean, text, text, text
) from public;
grant execute on function public.submit_public_inquiry(
  text, text, text, text, text, text, text, date, integer, integer, text, boolean, text, text, text
) to anon, authenticated, service_role;
