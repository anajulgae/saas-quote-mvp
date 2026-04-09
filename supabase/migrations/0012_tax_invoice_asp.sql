-- 전자세금계산서 발행 관리 + 사용자 ASP(발급대행) 연동 — Bill-IO는 발행 주관이 아님

-- 청구: 세금계산서 대상·발행 필요·일정(발행 관리와 실제 발행 분리)
alter table public.invoices
  add column if not exists e_tax_invoice_target boolean not null default false,
  add column if not exists e_tax_invoice_need_issue boolean not null default false,
  add column if not exists e_tax_invoice_supply_date date,
  add column if not exists e_tax_invoice_issue_due_date date;

comment on column public.invoices.e_tax_invoice_target is '과세 B2B 등 세금계산서 발행 대상 청구 여부';
comment on column public.invoices.e_tax_invoice_need_issue is '사용자가 발행 필요로 표시(자동 발행 아님)';
comment on column public.invoices.e_tax_invoice_supply_date is '세금계산서 공급일(안내·기본값)';
comment on column public.invoices.e_tax_invoice_issue_due_date is '발행 마감·주의용 예정일';

-- 고객: 세금계산서(공급받는자) 정보 — B2C는 비워둘 수 있음
alter table public.customers
  add column if not exists tax_business_name text,
  add column if not exists tax_business_registration_number text,
  add column if not exists tax_ceo_name text,
  add column if not exists tax_invoice_email text,
  add column if not exists tax_contact_name text,
  add column if not exists tax_address text;

comment on column public.customers.tax_business_name is '세금계산서 공급받는자 상호';
comment on column public.customers.tax_business_registration_number is '공급받는자 사업자등록번호';
comment on column public.customers.tax_invoice_email is '세금계산서 수신 이메일';

-- 사업자 설정: ASP 연동 + 공급자 주소(세금계산서용)
alter table public.business_settings
  add column if not exists tax_invoice_provider text,
  add column if not exists tax_invoice_provider_config jsonb not null default '{}'::jsonb,
  add column if not exists tax_invoice_supplier_address text;

comment on column public.business_settings.tax_invoice_provider is 'ASP 식별자(mock, barobill 등)';
comment on column public.business_settings.tax_invoice_provider_config is '사용자 ASP 자격증명·테스트 결과(JSON) — 운영 시 암호화·Vault 권장';
comment on column public.business_settings.tax_invoice_supplier_address is '공급자 주소(세금계산서 발행 확인용)';

create table if not exists public.tax_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  quote_id uuid references public.quotes (id) on delete set null,
  issue_type text not null default 'normal',
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'issuing', 'issued', 'failed', 'canceled')),
  tax_type text not null default 'taxable'
    check (tax_type in ('taxable', 'exempt', 'zero_rated')),
  supply_date date,
  issue_due_date date,
  issue_date timestamptz,
  approval_number text,
  total_supply_amount integer not null default 0,
  vat_amount integer not null default 0,
  total_amount integer not null default 0,
  recipient_business_name text,
  recipient_business_number text,
  recipient_email text,
  recipient_ceo_name text,
  sender_business_name text,
  sender_business_number text,
  sender_email text,
  sender_ceo_name text,
  sender_address text,
  asp_provider text,
  asp_document_id text,
  asp_response_log jsonb not null default '{}'::jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invoice_id)
);

create index if not exists idx_tax_invoices_user_id on public.tax_invoices (user_id);
create index if not exists idx_tax_invoices_user_status on public.tax_invoices (user_id, status);
create index if not exists idx_tax_invoices_customer_id on public.tax_invoices (customer_id);

comment on table public.tax_invoices is '청구 연동 전자세금계산서 발행 관리 — 실제 발행은 ASP';

drop trigger if exists set_tax_invoices_updated_at on public.tax_invoices;
create trigger set_tax_invoices_updated_at
  before update on public.tax_invoices
  for each row
  execute function public.set_updated_at();

alter table public.tax_invoices enable row level security;

create policy "tax_invoices_select_own"
  on public.tax_invoices for select
  using (auth.uid() = user_id);

create policy "tax_invoices_insert_own"
  on public.tax_invoices for insert
  with check (auth.uid() = user_id);

create policy "tax_invoices_update_own"
  on public.tax_invoices for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tax_invoices_delete_own"
  on public.tax_invoices for delete
  using (auth.uid() = user_id);
