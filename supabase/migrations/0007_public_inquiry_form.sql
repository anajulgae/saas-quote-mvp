-- 고객 공개 문의 폼 (토큰 URL, SECURITY DEFINER 제출)

alter table public.business_settings
  add column if not exists public_inquiry_form_enabled boolean not null default false,
  add column if not exists public_inquiry_form_token text,
  add column if not exists public_inquiry_intro text,
  add column if not exists public_inquiry_consent_intro text,
  add column if not exists public_inquiry_consent_retention text,
  add column if not exists public_inquiry_completion_message text;

create unique index if not exists business_settings_public_inquiry_token_uidx
  on public.business_settings (public_inquiry_form_token)
  where public_inquiry_form_token is not null;

comment on column public.business_settings.public_inquiry_form_enabled is '고객용 공개 문의 폼 on/off';
comment on column public.business_settings.public_inquiry_form_token is '공개 문의 폼 URL 토큰(고유)';
comment on column public.business_settings.public_inquiry_intro is '폼 상단 안내(선택)';
comment on column public.business_settings.public_inquiry_consent_intro is '개인정보 수집·이용 안내';
comment on column public.business_settings.public_inquiry_consent_retention is '보관 기간 등 안내';
comment on column public.business_settings.public_inquiry_completion_message is '제출 완료 화면 문구';

-- 제출 속도 제한·감사(SECURITY DEFINER만 쓰기)
create table if not exists public.public_inquiry_submissions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  form_token text not null,
  phone_normalized text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_public_inq_sub_rate
  on public.public_inquiry_submissions (owner_user_id, form_token, phone_normalized, created_at desc);

alter table public.public_inquiry_submissions enable row level security;

-- 직접 접근 차단 (RPC만 사용)
create policy "public_inquiry_submissions_isolated"
  on public.public_inquiry_submissions
  for all
  using (false)
  with check (false);

-- 공개 폼 메타(비활성/토큰 불일치 시 최소 정보만)
create or replace function public.get_public_inquiry_form_payload(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if p_token is null or length(trim(p_token)) < 16 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_token');
  end if;

  select
    b.user_id,
    b.public_inquiry_form_enabled,
    b.business_name,
    b.owner_name,
    b.email,
    b.phone,
    coalesce(b.public_inquiry_intro, '') as intro,
    coalesce(b.public_inquiry_consent_intro, '') as consent_intro,
    coalesce(b.public_inquiry_consent_retention, '') as consent_retention,
    coalesce(b.public_inquiry_completion_message, '') as completion_message,
    u.plan
  into v_row
  from business_settings b
  join users u on u.id = b.user_id
  where b.public_inquiry_form_token = trim(p_token)
  limit 1;

  if v_row is null then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  if not coalesce(v_row.public_inquiry_form_enabled, false) then
    return jsonb_build_object(
      'valid', false,
      'reason', 'disabled',
      'businessName', coalesce(v_row.business_name, '')
    );
  end if;

  return jsonb_build_object(
    'valid', true,
    'businessName', coalesce(v_row.business_name, ''),
    'ownerName', coalesce(v_row.owner_name, ''),
    'contactEmail', coalesce(v_row.email, ''),
    'contactPhone', coalesce(v_row.phone, ''),
    'intro', v_row.intro,
    'consentIntro', v_row.consent_intro,
    'consentRetention', v_row.consent_retention,
    'completionMessage', v_row.completion_message,
    'ownerPlan', coalesce(v_row.plan, 'free')
  );
end;
$$;

revoke all on function public.get_public_inquiry_form_payload(text) from public;
grant execute on function public.get_public_inquiry_form_payload(text) to anon, authenticated, service_role;

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
    'ownerPlan', (select u.plan from users u where u.id = v_owner limit 1)
  );
end;
$$;

revoke all on function public.submit_public_inquiry(
  text, text, text, text, text, text, text, date, integer, integer, text, boolean, text
) from public;
grant execute on function public.submit_public_inquiry(
  text, text, text, text, text, text, text, date, integer, integer, text, boolean, text
) to anon, authenticated, service_role;

create or replace function public.apply_public_inquiry_ai_draft(
  p_token text,
  p_inquiry_id uuid,
  p_title text,
  p_service_category text,
  p_details text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_updated int;
begin
  if p_token is null or length(trim(p_token)) < 16 or p_inquiry_id is null then
    return false;
  end if;

  select b.user_id
  into v_owner
  from business_settings b
  where b.public_inquiry_form_token = trim(p_token)
    and coalesce(b.public_inquiry_form_enabled, false) = true
  limit 1;

  if v_owner is null then
    return false;
  end if;

  update inquiries i
  set
    title = case
      when p_title is not null and length(trim(p_title)) > 0 then left(trim(p_title), 500)
      else i.title
    end,
    service_category = case
      when p_service_category is not null and length(trim(p_service_category)) > 0
      then left(trim(p_service_category), 200)
      else i.service_category
    end,
    details = case
      when p_details is not null and length(trim(p_details)) > 0 then left(trim(p_details), 25000)
      else i.details
    end,
    updated_at = now()
  where i.id = p_inquiry_id
    and i.user_id = v_owner
    and i.channel = '웹폼'
    and i.created_at > now() - interval '15 minutes';

  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.apply_public_inquiry_ai_draft(text, uuid, text, text, text) from public;
grant execute on function public.apply_public_inquiry_ai_draft(text, uuid, text, text, text) to anon, authenticated, service_role;
