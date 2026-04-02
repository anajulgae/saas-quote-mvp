create extension if not exists "pgcrypto";

create type inquiry_stage as enum ('new', 'qualified', 'quoted', 'won', 'lost');
create type quote_status as enum ('draft', 'sent', 'approved', 'rejected', 'expired');
create type invoice_type as enum ('deposit', 'balance', 'final');
create type payment_status as enum ('pending', 'deposit_paid', 'partially_paid', 'paid', 'overdue');
create type reminder_channel as enum ('sms', 'kakao', 'email', 'manual');

create table if not exists users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  business_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  business_name text not null,
  owner_name text not null,
  email text,
  phone text,
  default_currency text not null default 'KRW',
  payment_terms text,
  bank_account text,
  reminder_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  company_name text,
  phone text,
  email text,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  title text not null,
  channel text not null default 'manual',
  service_category text not null,
  details text,
  requested_date date,
  budget_min integer,
  budget_max integer,
  stage inquiry_stage not null default 'new',
  follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  inquiry_id uuid references inquiries (id) on delete set null,
  quote_number text not null,
  title text not null,
  summary text,
  status quote_status not null default 'draft',
  subtotal integer not null default 0,
  tax integer not null default 0,
  total integer not null default 0,
  sent_at timestamptz,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, quote_number)
);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes (id) on delete cascade,
  sort_order integer not null default 0,
  name text not null,
  description text,
  quantity numeric(10, 2) not null default 1,
  unit_price integer not null default 0,
  line_total integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  customer_id uuid not null references customers (id) on delete cascade,
  quote_id uuid references quotes (id) on delete set null,
  invoice_number text not null,
  invoice_type invoice_type not null default 'deposit',
  amount integer not null default 0,
  payment_status payment_status not null default 'pending',
  due_date date,
  paid_at timestamptz,
  requested_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, invoice_number)
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  invoice_id uuid not null references invoices (id) on delete cascade,
  channel reminder_channel not null default 'manual',
  message text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  type text not null,
  name text not null,
  content text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  customer_id uuid references customers (id) on delete set null,
  inquiry_id uuid references inquiries (id) on delete set null,
  quote_id uuid references quotes (id) on delete set null,
  invoice_id uuid references invoices (id) on delete set null,
  action text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_customers_user_id on customers (user_id);
create index if not exists idx_inquiries_user_id on inquiries (user_id);
create index if not exists idx_inquiries_stage on inquiries (stage);
create index if not exists idx_quotes_user_id on quotes (user_id);
create index if not exists idx_quotes_status on quotes (status);
create index if not exists idx_invoices_user_id on invoices (user_id);
create index if not exists idx_invoices_payment_status on invoices (payment_status);
create index if not exists idx_reminders_invoice_id on reminders (invoice_id);
create index if not exists idx_activity_logs_user_id on activity_logs (user_id);

alter table users enable row level security;
alter table business_settings enable row level security;
alter table customers enable row level security;
alter table inquiries enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table invoices enable row level security;
alter table reminders enable row level security;
alter table templates enable row level security;
alter table activity_logs enable row level security;

create policy "users own row" on users
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "business settings by owner" on business_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "customers by owner" on customers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "inquiries by owner" on inquiries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "quotes by owner" on quotes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "quote items by quote owner" on quote_items
  for all using (
    exists (
      select 1
      from quotes
      where quotes.id = quote_items.quote_id
        and quotes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from quotes
      where quotes.id = quote_items.quote_id
        and quotes.user_id = auth.uid()
    )
  );

create policy "invoices by owner" on invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "reminders by invoice owner" on reminders
  for all using (
    exists (
      select 1
      from invoices
      where invoices.id = reminders.invoice_id
        and invoices.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from invoices
      where invoices.id = reminders.invoice_id
        and invoices.user_id = auth.uid()
    )
  );

create policy "templates by owner" on templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "activity logs by owner" on activity_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
