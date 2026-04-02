-- Seed strategy
-- 1. Supabase Auth에서 테스트 계정을 먼저 하나 생성합니다.
-- 2. 아래 스크립트는 가장 먼저 생성된 auth.users 계정을 기준으로 샘플 데이터를 삽입합니다.
-- 3. 이미 데이터가 있으면 on conflict / where not exists 로 중복 삽입을 피합니다.

with target_user as (
  select id, email
  from auth.users
  order by created_at asc
  limit 1
)
insert into public.users (id, full_name, business_name, phone)
select
  id,
  '김민준',
  '민준 스튜디오',
  '010-2841-5532'
from target_user
on conflict (id) do update
set
  full_name = excluded.full_name,
  business_name = excluded.business_name,
  phone = excluded.phone;

with target_user as (
  select id, email
  from auth.users
  order by created_at asc
  limit 1
)
insert into public.business_settings (
  user_id,
  business_name,
  owner_name,
  email,
  phone,
  payment_terms,
  bank_account,
  reminder_message
)
select
  id,
  '민준 스튜디오',
  '김민준',
  email,
  '010-2841-5532',
  '선금 50%, 납품 전 잔금 50%',
  '국민은행 123456-78-901234 김민준',
  '안녕하세요. 이전에 전달드린 청구 건의 입금 일정을 확인 부탁드립니다.'
from target_user
on conflict (user_id) do update
set
  business_name = excluded.business_name,
  owner_name = excluded.owner_name,
  email = excluded.email,
  phone = excluded.phone,
  payment_terms = excluded.payment_terms,
  bank_account = excluded.bank_account,
  reminder_message = excluded.reminder_message;

with target_user as (
  select id
  from auth.users
  order by created_at asc
  limit 1
)
insert into public.customers (user_id, name, company_name, phone, email, notes, tags)
select
  target_user.id,
  seed.name,
  seed.company_name,
  seed.phone,
  seed.email,
  seed.notes,
  seed.tags
from target_user
cross join (
  values
    ('박서연', '서연뷰티', '010-1111-2222', 'owner@seoyeonbeauty.kr', '인스타그램 릴스 위주 영상 제작 의뢰', array['뷰티', '단골']::text[]),
    ('이정훈', '클린픽 홈서비스', '010-2222-3333', 'contact@cleanpick.kr', '월 2회 에어컨 청소 패키지 검토 중', array['청소', '기업']::text[]),
    ('최도윤', '도윤디자인', '010-3333-4444', 'hello@doyoon.design', '브랜드 패키지 견적 문의', array['디자인', '신규']::text[])
) as seed(name, company_name, phone, email, notes, tags)
where not exists (
  select 1
  from public.customers customers
  where customers.user_id = target_user.id
    and customers.email = seed.email
);

with target_user as (
  select id
  from auth.users
  order by created_at asc
  limit 1
),
customer_map as (
  select id, email
  from public.customers
  where user_id = (select id from target_user)
),
inserted_quotes as (
  insert into public.quotes (
    user_id,
    customer_id,
    quote_number,
    title,
    summary,
    status,
    subtotal,
    tax,
    total,
    sent_at,
    valid_until
  )
  select
    target_user.id,
    customer_map.id,
    seed.quote_number,
    seed.title,
    seed.summary,
    seed.status::quote_status,
    seed.subtotal,
    seed.tax,
    seed.total,
    seed.sent_at::timestamptz,
    seed.valid_until::date
  from target_user
  join customer_map on customer_map.email = seed.customer_email
  join (
    values
      ('owner@seoyeonbeauty.kr', 'Q-2026-041', '서연뷰티 릴스 제작 패키지', '릴스 4편, 촬영 1회, 자막/썸네일 포함', 'sent', 800000, 80000, 880000, '2026-04-01T12:00:00+09:00', '2026-04-08'),
      ('contact@cleanpick.kr', 'Q-2026-042', '클린픽 사무실 에어컨 청소', '시스템 에어컨 5대 분해 청소', 'draft', 500000, 50000, 550000, null, '2026-04-10')
  ) as seed(customer_email, quote_number, title, summary, status, subtotal, tax, total, sent_at, valid_until)
    on true
  where not exists (
    select 1
    from public.quotes quotes
    where quotes.user_id = target_user.id
      and quotes.quote_number = seed.quote_number
  )
  returning id, quote_number
)
select 1;

with target_user as (
  select id
  from auth.users
  order by created_at asc
  limit 1
),
quote_map as (
  select id, quote_number
  from public.quotes
  where user_id = (select id from target_user)
)
insert into public.quote_items (quote_id, sort_order, name, description, quantity, unit_price, line_total)
select
  quote_map.id,
  seed.sort_order,
  seed.name,
  seed.description,
  seed.quantity,
  seed.unit_price,
  seed.line_total
from quote_map
join (
  values
    ('Q-2026-041', 1, '매장 촬영 1회', '반나절 현장 촬영', 1, 300000, 300000),
    ('Q-2026-041', 2, '릴스 편집 4편', '자막, 음악, 썸네일 포함', 4, 125000, 500000),
    ('Q-2026-042', 1, '시스템 에어컨 청소', '5대 분해 세척', 5, 100000, 500000)
) as seed(quote_number, sort_order, name, description, quantity, unit_price, line_total)
  on seed.quote_number = quote_map.quote_number
where not exists (
  select 1
  from public.quote_items items
  where items.quote_id = quote_map.id
    and items.sort_order = seed.sort_order
);

with target_user as (
  select id
  from auth.users
  order by created_at asc
  limit 1
),
customer_map as (
  select id, email
  from public.customers
  where user_id = (select id from target_user)
)
insert into public.inquiries (
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
select
  target_user.id,
  customer_map.id,
  seed.title,
  seed.channel,
  seed.service_category,
  seed.details,
  seed.requested_date::date,
  seed.budget_min,
  seed.budget_max,
  seed.stage::inquiry_stage,
  seed.follow_up_at::timestamptz
from target_user
join customer_map on customer_map.email = seed.customer_email
join (
  values
    ('owner@seoyeonbeauty.kr', '봄 시즌 매장 홍보 릴스 4편', '카카오톡', '영상 제작', '촬영 1회와 편집 4편 포함. 4월 첫째 주 납기 희망', '2026-04-01', 600000, 900000, 'quoted', '2026-04-02T16:00:00+09:00'),
    ('contact@cleanpick.kr', '시스템 에어컨 5대 청소', '전화', '에어컨 청소', '사무실 이전 전 청소. 세금계산서 필요', '2026-04-05', 450000, 550000, 'qualified', '2026-04-03T10:00:00+09:00'),
    ('hello@doyoon.design', '로고 및 명함 패키지', '이메일', '브랜드 디자인', '로고 3안과 명함 시안 포함', '2026-04-07', 800000, 1200000, 'new', '2026-04-02T19:00:00+09:00')
) as seed(customer_email, title, channel, service_category, details, requested_date, budget_min, budget_max, stage, follow_up_at)
  on true
where not exists (
  select 1
  from public.inquiries inquiries
  where inquiries.user_id = target_user.id
    and inquiries.title = seed.title
);

with target_user as (
  select id
  from auth.users
  order by created_at asc
  limit 1
),
customer_map as (
  select id, email
  from public.customers
  where user_id = (select id from target_user)
),
quote_map as (
  select id, quote_number
  from public.quotes
  where user_id = (select id from target_user)
)
insert into public.invoices (
  user_id,
  customer_id,
  quote_id,
  invoice_number,
  invoice_type,
  amount,
  payment_status,
  due_date,
  paid_at,
  requested_at,
  notes
)
select
  target_user.id,
  customer_map.id,
  quote_map.id,
  seed.invoice_number,
  seed.invoice_type::invoice_type,
  seed.amount,
  seed.payment_status::payment_status,
  seed.due_date::date,
  seed.paid_at::timestamptz,
  seed.requested_at::timestamptz,
  seed.notes
from target_user
join customer_map on customer_map.email = seed.customer_email
left join quote_map on quote_map.quote_number = seed.quote_number
join (
  values
    ('owner@seoyeonbeauty.kr', 'Q-2026-041', 'I-2026-021', 'deposit', 440000, 'deposit_paid', '2026-04-03', '2026-04-02T09:20:00+09:00', '2026-04-01T12:10:00+09:00', '계약 확정 후 바로 입금 완료'),
    ('owner@seoyeonbeauty.kr', 'Q-2026-041', 'I-2026-022', 'balance', 440000, 'pending', '2026-04-10', null, '2026-04-01T12:15:00+09:00', '납품 전 잔금 예정'),
    ('contact@cleanpick.kr', 'Q-2026-042', 'I-2026-023', 'deposit', 275000, 'overdue', '2026-04-01', null, '2026-03-30T10:00:00+09:00', '리마인드 2회 발송')
) as seed(customer_email, quote_number, invoice_number, invoice_type, amount, payment_status, due_date, paid_at, requested_at, notes)
  on true
where not exists (
  select 1
  from public.invoices invoices
  where invoices.user_id = target_user.id
    and invoices.invoice_number = seed.invoice_number
);

with target_user as (
  select id
  from auth.users
  order by created_at asc
  limit 1
),
invoice_map as (
  select id, invoice_number
  from public.invoices
  where user_id = (select id from target_user)
)
insert into public.reminders (user_id, invoice_id, channel, message, sent_at)
select
  target_user.id,
  invoice_map.id,
  seed.channel::reminder_channel,
  seed.message,
  seed.sent_at::timestamptz
from target_user
join invoice_map on invoice_map.invoice_number = seed.invoice_number
join (
  values
    ('I-2026-023', 'kakao', '안녕하세요. 선금 입금 일정 확인 부탁드립니다.', '2026-04-01T11:30:00+09:00'),
    ('I-2026-023', 'manual', '전화로 일정 재확인, 내일 오전 입금 예정 답변', '2026-04-02T09:10:00+09:00')
) as seed(invoice_number, channel, message, sent_at)
  on true
where not exists (
  select 1
  from public.reminders reminders
  where reminders.invoice_id = invoice_map.id
    and reminders.message = seed.message
);

with target_user as (
  select id
  from auth.users
  order by created_at asc
  limit 1
),
customer_map as (
  select id, email
  from public.customers
  where user_id = (select id from target_user)
)
insert into public.activity_logs (user_id, customer_id, action, description, created_at)
select
  target_user.id,
  customer_map.id,
  seed.action,
  seed.description,
  seed.created_at::timestamptz
from target_user
join customer_map on customer_map.email = seed.customer_email
join (
  values
    ('contact@cleanpick.kr', 'invoice.reminder_sent', '클린픽 홈서비스에 미수 리마인드를 발송했습니다.', '2026-04-02T09:10:00+09:00'),
    ('owner@seoyeonbeauty.kr', 'invoice.deposit_paid', '서연뷰티 선금 입금이 확인되었습니다.', '2026-04-02T09:20:00+09:00'),
    ('owner@seoyeonbeauty.kr', 'quote.sent', '서연뷰티 릴스 제작 견적서를 발송했습니다.', '2026-04-01T12:00:00+09:00')
) as seed(customer_email, action, description, created_at)
  on true
where not exists (
  select 1
  from public.activity_logs logs
  where logs.user_id = target_user.id
    and logs.action = seed.action
    and logs.description = seed.description
);

with target_user as (
  select id
  from auth.users
  order by created_at asc
  limit 1
)
insert into public.templates (user_id, type, name, content, is_default)
select
  target_user.id,
  seed.type,
  seed.name,
  seed.content,
  seed.is_default
from target_user
cross join (
  values
    ('quote', '영상 제작 기본 견적', '프로젝트 범위, 촬영 횟수, 편집 편수, 수정 횟수, 납기, 결제 조건을 포함한 견적 문구', true),
    ('reminder', '미수 1차 리마인드', '안녕하세요. 이전에 전달드린 청구 건의 입금 기한이 도래하여 일정 확인 부탁드립니다.', true)
) as seed(type, name, content, is_default)
where not exists (
  select 1
  from public.templates templates
  where templates.user_id = target_user.id
    and templates.name = seed.name
);
