-- Auto-remind scheduler rules
create table if not exists auto_remind_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null default '',
  enabled boolean not null default true,
  trigger_type text not null default 'overdue_days',
  trigger_days int not null default 3,
  channel text not null default 'email',
  message_template text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_auto_remind_rules_user_id on auto_remind_rules (user_id);

alter table auto_remind_rules enable row level security;

create policy "auto_remind_rules by owner" on auto_remind_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Track which invoices have been auto-reminded and when
alter table reminders add column if not exists auto_rule_id uuid references auto_remind_rules (id) on delete set null;
