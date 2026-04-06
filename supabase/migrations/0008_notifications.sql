-- 운영자 알림(notifications) + 채널별 설정(notification_preferences)
-- 실시간: supabase_realtime publication 에 notifications 추가

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  inquiry_in_app boolean not null default true,
  inquiry_browser boolean not null default true,
  inquiry_email boolean not null default true,
  quote_events_in_app boolean not null default true,
  quote_events_browser boolean not null default false,
  quote_events_email boolean not null default false,
  invoice_events_in_app boolean not null default true,
  invoice_events_browser boolean not null default false,
  invoice_events_email boolean not null default false,
  reminder_events_in_app boolean not null default true,
  reminder_events_browser boolean not null default false,
  reminder_events_email boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.notification_preferences is '알림 채널(앱/브라우저/이메일) 및 이벤트군별 on/off';

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null default '',
  link_path text,
  related_entity_type text,
  related_entity_id uuid,
  is_read boolean not null default false,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read, created_at desc);

comment on table public.notifications is 'Bill-IO 운영자 알림(문의·견적·청구·리마인드 등)';

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

create policy "notification_preferences_own"
  on public.notification_preferences
  for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications_select_own"
  on public.notifications
  for select
  using (user_id = (select auth.uid()));

create policy "notifications_insert_own"
  on public.notifications
  for insert
  with check (user_id = (select auth.uid()));

create policy "notifications_update_own"
  on public.notifications
  for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 기존 사용자 백필
insert into public.notification_preferences (user_id)
select u.id from public.users u
where not exists (
  select 1 from public.notification_preferences p where p.user_id = u.id
);

-- 신규 문의 시 운영자 알림(공개 폼·앱 내 생성 공통)
create or replace function public.trg_notify_new_inquiry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cname text;
begin
  select coalesce(nullif(trim(c.company_name), ''), nullif(trim(c.name), ''), '고객')
  into v_cname
  from public.customers c
  where c.id = new.customer_id;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    link_path,
    related_entity_type,
    related_entity_id,
    dedupe_key
  )
  values (
    new.user_id,
    'new_inquiry',
    '새 문의가 접수되었습니다',
    format(
      '「%s」· %s · %s',
      left(trim(new.title), 200),
      v_cname,
      case when new.channel = '웹폼' then '웹폼' else '채널 ' || left(new.channel, 40) end
    ),
    '/inquiries?focus=' || new.id::text,
    'inquiry',
    new.id,
    'new_inquiry:' || new.id::text
  )
  on conflict (user_id, dedupe_key) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_inquiries_notify_new on public.inquiries;
create trigger trg_inquiries_notify_new
  after insert on public.inquiries
  for each row
  execute function public.trg_notify_new_inquiry();

-- Realtime (프로젝트에 publication 이 없으면 대시보드에서 notifications 테이블 Realtime 활성화)
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

alter table public.notifications replica identity full;

-- 공개 폼 RPC 응답에 owner id(이메일 등 후처리용) 포함
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
  p_honeypot text
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
  v_details := v_details || E'\n\n— 공개 문의 폼(웹)에서 제출됨';

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
    'inquiry.created',
    v_title || ' 문의가 등록되었습니다.',
    jsonb_build_object(
      'via', 'public_inquiry_form',
      'title', v_title,
      'channel', '웹폼'
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
