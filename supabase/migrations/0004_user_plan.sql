-- Billing plan per user (free / pro). Default free; upgrade path reserved for payment integration.
alter table public.users
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'pro'));

comment on column public.users.plan is 'Subscription tier: free | pro (payment integration TBD)';
