-- SaaS 상용화: 3플랜(starter/pro/business), 7일 체험, 사용량, 고객센터 티켓, 과금 이벤트
-- 기존 free -> starter, pro 유지. 랜딩/포털 RPC는 새 플랜 값에 맞게 갱신.

-- 1) users: 구독·체험·사용량·PG 확장 컬럼 (먼저 nullable로 추가)
alter table public.users
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_status text,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists pending_plan text,
  add column if not exists stripe_customer_id text,
  add column if not exists usage_month text,
  add column if not exists ai_calls_this_month integer not null default 0,
  add column if not exists document_sends_this_month integer not null default 0;

comment on column public.users.trial_ends_at is '체험 종료 시각(UTC). 신규 가입 시 기본 +7일.';
comment on column public.users.subscription_status is 'trialing | active | past_due | canceled | trial_expired';
comment on column public.users.current_period_end is '다음 결제·갱신 예정일(PG 연동 시)';
comment on column public.users.pending_plan is '예약된 다운그레이드 목표 플랜';

-- 2) 기존 plan 제약 해제 및 데이터 이관
alter table public.users drop constraint if exists users_plan_check;

update public.users set plan = 'starter' where plan = 'free';
update public.users set plan = 'pro' where plan = 'pro';

-- 기존 계정: 체험 없음·활성 구독으로 간주(그랜드파더)
update public.users
set
  subscription_status = coalesce(subscription_status, 'active'),
  trial_ends_at = null,
  cancel_at_period_end = false
where subscription_status is null or subscription_status = '';

alter table public.users
  add constraint users_plan_check check (plan in ('starter', 'pro', 'business'));

comment on column public.users.plan is '청구 플랜: starter | pro | business';

-- 신규 행 기본값(마이그레이션 이후 INSERT에만 적용)
alter table public.users alter column plan set default 'starter';

alter table public.users
  alter column subscription_status set default 'trialing';

-- trial_ends_at 기본은 DB default로 넣기 어려우면 앱/트리거에서 설정 — 여기서는 신규용 표현식
alter table public.users
  alter column trial_ends_at set default (now() + interval '7 days');

-- 기존 행에 잘못 들어간 default trial 방지: 이미 위에서 trial_ends_at = null 처리함

-- 3) 고객 포털: starter/pro/business 허용 (0010 본문 유지, 플랜 검사만 변경)
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

  v_plan := coalesce(v_c.owner_plan, 'starter');
  if v_plan not in ('starter', 'pro', 'business') then
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

-- 4) 공개 랜딩: Pro·Business만 (0009 응답 형식 유지)
create or replace function public.get_public_business_landing(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slug text;
  v_row record;
  v_token text;
  v_form_on boolean;
begin
  v_slug := lower(trim(coalesce(p_slug, '')));
  if v_slug is null or length(v_slug) < 2 then
    return jsonb_build_object('valid', false, 'reason', 'invalid_slug');
  end if;

  select
    p.user_id,
    p.is_published,
    p.slug,
    p.template,
    p.business_name,
    p.headline,
    p.intro_one_line,
    p.about,
    p.services,
    p.contact_phone,
    p.contact_email,
    p.location,
    p.business_hours,
    p.social_links,
    p.hero_image_url,
    p.seo_title,
    p.seo_description,
    p.faq,
    p.trust_points,
    p.cta_text,
    p.inquiry_cta_enabled,
    p.updated_at,
    u.plan as owner_plan
  into v_row
  from business_public_pages p
  join users u on u.id = p.user_id
  where p.slug = v_slug
  limit 1;

  if v_row is null then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  if not coalesce(v_row.is_published, false) then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  if coalesce(v_row.owner_plan, 'starter') not in ('pro', 'business') then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  select
    coalesce(b.public_inquiry_form_enabled, false),
    b.public_inquiry_form_token
  into v_form_on, v_token
  from business_settings b
  where b.user_id = v_row.user_id
  limit 1;

  return jsonb_build_object(
    'valid', true,
    'page', jsonb_build_object(
      'slug', v_row.slug,
      'template', v_row.template,
      'businessName', coalesce(v_row.business_name, ''),
      'headline', coalesce(v_row.headline, ''),
      'introOneLine', coalesce(v_row.intro_one_line, ''),
      'about', coalesce(v_row.about, ''),
      'services', coalesce(v_row.services, '[]'::jsonb),
      'contactPhone', coalesce(v_row.contact_phone, ''),
      'contactEmail', coalesce(v_row.contact_email, ''),
      'location', coalesce(v_row.location, ''),
      'businessHours', coalesce(v_row.business_hours, ''),
      'socialLinks', coalesce(v_row.social_links, '[]'::jsonb),
      'heroImageUrl', v_row.hero_image_url,
      'seoTitle', coalesce(v_row.seo_title, ''),
      'seoDescription', coalesce(v_row.seo_description, ''),
      'faq', coalesce(v_row.faq, '[]'::jsonb),
      'trustPoints', coalesce(v_row.trust_points, '[]'::jsonb),
      'ctaText', coalesce(nullif(trim(v_row.cta_text), ''), '문의하기'),
      'inquiryCtaEnabled', coalesce(v_row.inquiry_cta_enabled, true),
      'updatedAt', v_row.updated_at
    ),
    'inquiryToken',
      case
        when coalesce(v_row.inquiry_cta_enabled, true)
          and v_form_on
          and v_token is not null
          and length(trim(v_token)) >= 16
        then trim(v_token)
        else null
      end
  );
end;
$$;

revoke all on function public.get_public_business_landing(text) from public;
grant execute on function public.get_public_business_landing(text) to anon, authenticated, service_role;

-- 5) 사용량 증가 (authenticated, 본인만)
create or replace function public.bump_user_usage(p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  ym text := to_char((timezone('utc', now()))::date, 'YYYY-MM');
  r record;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'no_auth');
  end if;

  select usage_month, ai_calls_this_month, document_sends_this_month
  into r
  from public.users
  where id = uid
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_user');
  end if;

  if r.usage_month is distinct from ym then
    update public.users
    set
      usage_month = ym,
      ai_calls_this_month = case when p_kind = 'ai' then 1 else 0 end,
      document_sends_this_month = case when p_kind = 'document_send' then 1 else 0 end
    where id = uid;
  else
    update public.users
    set
      ai_calls_this_month = ai_calls_this_month + case when p_kind = 'ai' then 1 else 0 end,
      document_sends_this_month = document_sends_this_month + case when p_kind = 'document_send' then 1 else 0 end
    where id = uid;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.bump_user_usage(text) to authenticated;

-- 6) 과금·구독 이벤트 로그
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  kind text not null,
  message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_events_user_id_created_at_idx
  on public.billing_events (user_id, created_at desc);

comment on table public.billing_events is '구독 변경·체험·(향후) 결제 웹훅 요약 로그';

alter table public.billing_events enable row level security;

create policy "billing_events_select_own"
  on public.billing_events
  for select
  to authenticated
  using (auth.uid() = user_id);

-- insert는 서버(service role) 또는 security definer로만 — 앱에서 service role 없으면 RPC로
create or replace function public.append_billing_event(p_kind text, p_message text, p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return;
  end if;
  insert into public.billing_events (user_id, kind, message, metadata)
  values (uid, p_kind, coalesce(p_message, ''), coalesce(p_metadata, '{}'::jsonb));
end;
$$;

grant execute on function public.append_billing_event(text, text, jsonb) to authenticated;

-- 7) 고객센터 문의 티켓
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  category text not null,
  subject text not null,
  body text not null,
  contact_email text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_user_id_idx on public.support_tickets (user_id, created_at desc);

comment on table public.support_tickets is '고객센터 문의(이메일·게시판 병행).';

alter table public.support_tickets enable row level security;

create policy "support_tickets_select_own"
  on public.support_tickets
  for select
  to authenticated
  using (user_id is not null and auth.uid() = user_id);

create policy "support_tickets_insert_logged_in"
  on public.support_tickets
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "support_tickets_insert_anon"
  on public.support_tickets
  for insert
  to anon
  with check (user_id is null);

create policy "support_tickets_select_anon_denied"
  on public.support_tickets
  for select
  to anon
  using (false);
