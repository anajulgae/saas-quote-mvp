create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists set_business_settings_updated_at on public.business_settings;
create trigger set_business_settings_updated_at
before update on public.business_settings
for each row
execute function public.set_updated_at();

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at
before update on public.customers
for each row
execute function public.set_updated_at();

drop trigger if exists set_inquiries_updated_at on public.inquiries;
create trigger set_inquiries_updated_at
before update on public.inquiries
for each row
execute function public.set_updated_at();

drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at
before update on public.quotes
for each row
execute function public.set_updated_at();

drop trigger if exists set_invoices_updated_at on public.invoices;
create trigger set_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

drop trigger if exists set_templates_updated_at on public.templates;
create trigger set_templates_updated_at
before update on public.templates
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_name text;
begin
  resolved_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(new.email, '@', 1),
    '사용자'
  );

  insert into public.users (id, full_name, business_name, phone)
  values (
    new.id,
    resolved_name,
    coalesce(new.raw_user_meta_data ->> 'business_name', resolved_name),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;

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
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'business_name', resolved_name),
    resolved_name,
    new.email,
    new.raw_user_meta_data ->> 'phone',
    '선금 50%, 납품 전 잔금 50%',
    '',
    '안녕하세요. 이전에 전달드린 청구 건의 입금 일정을 확인 부탁드립니다.'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create index if not exists idx_inquiries_customer_id on public.inquiries (customer_id);
create index if not exists idx_quotes_customer_id on public.quotes (customer_id);
create index if not exists idx_quotes_inquiry_id on public.quotes (inquiry_id);
create index if not exists idx_quote_items_quote_id on public.quote_items (quote_id);
create index if not exists idx_invoices_customer_id on public.invoices (customer_id);
create index if not exists idx_invoices_quote_id on public.invoices (quote_id);
create index if not exists idx_activity_logs_customer_id on public.activity_logs (customer_id);
create index if not exists idx_activity_logs_inquiry_id on public.activity_logs (inquiry_id);
create index if not exists idx_activity_logs_created_at on public.activity_logs (created_at desc);
