-- Bill-IO 운영자(백오피스) 콘솔: 관리자 플래그, 계정 잠금, 티켓 확장, 운영 메모, 오류 스텁

-- 1) 사용자: 운영자·계정 비활성화·이메일(관리 목록용, 로그인 시 동기화)
alter table public.users
  add column if not exists is_admin boolean not null default false,
  add column if not exists admin_role text,
  add column if not exists account_disabled boolean not null default false,
  add column if not exists email text;

comment on column public.users.is_admin is 'Bill-IO 내부 운영자. /admin 접근 허용(별도 앱 검증 + service role 조회)';
comment on column public.users.admin_role is 'owner | support 등 확장용; is_admin true 일 때 의미 있음';
comment on column public.users.account_disabled is 'true 이면 앱 세션 거부(운영자 정지)';
comment on column public.users.email is 'auth.users.email 미러(운영자 목록·검색용, ensureUserProfile에서 갱신)';

-- 2) 고객센터 티켓 확장
alter table public.support_tickets
  add column if not exists operator_note text,
  add column if not exists assignee_admin_id uuid references public.users (id) on delete set null,
  add column if not exists replied_at timestamptz;

comment on column public.support_tickets.operator_note is '운영자 내부 메모(고객 비공개)';
comment on column public.support_tickets.assignee_admin_id is '담당 운영자 users.id';

-- 상태: new | in_progress | resolved | on_hold (기존 open → new)
update public.support_tickets set status = 'new' where status = 'open';
alter table public.support_tickets
  alter column status set default 'new';

-- 3) 운영자 메모(사용자별)
create table if not exists public.admin_user_notes (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.users (id) on delete cascade,
  author_admin_id uuid not null references public.users (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists admin_user_notes_target_idx
  on public.admin_user_notes (target_user_id, created_at desc);

comment on table public.admin_user_notes is '운영자 전용 사용자 메모';

alter table public.admin_user_notes enable row level security;

-- 4) 운영 오류·이벤트 스텁 (향후 API/워커에서 적재)
create table if not exists public.ops_error_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  kind text not null,
  message text not null,
  user_id uuid references public.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ops_error_events_created_idx on public.ops_error_events (created_at desc);
create index if not exists ops_error_events_kind_idx on public.ops_error_events (kind, created_at desc);

comment on table public.ops_error_events is '백오피스용 오류·경고 이벤트(APM 대체 최소 집계)';

alter table public.ops_error_events enable row level security;

-- 5) RLS: service role 은 RLS 우회 — authenticated 운영자가 직접 붙는 경우를 위해 최소 정책
create or replace function public.is_billio_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select u.is_admin from public.users u where u.id = auth.uid() limit 1),
    false
  );
$$;

grant execute on function public.is_billio_admin() to authenticated;

-- users: 운영자는 전체 조회·수정 (기존 본인 정책과 OR)
drop policy if exists "users admin read" on public.users;
create policy "users admin read"
  on public.users for select to authenticated
  using (public.is_billio_admin());

drop policy if exists "users admin write" on public.users;
create policy "users admin write"
  on public.users for update to authenticated
  using (public.is_billio_admin())
  with check (public.is_billio_admin());

-- support_tickets
drop policy if exists "support_tickets admin select" on public.support_tickets;
create policy "support_tickets admin select"
  on public.support_tickets for select to authenticated
  using (public.is_billio_admin());

drop policy if exists "support_tickets admin update" on public.support_tickets;
create policy "support_tickets admin update"
  on public.support_tickets for update to authenticated
  using (public.is_billio_admin())
  with check (public.is_billio_admin());

-- billing_events
drop policy if exists "billing_events admin select" on public.billing_events;
create policy "billing_events admin select"
  on public.billing_events for select to authenticated
  using (public.is_billio_admin());

drop policy if exists "billing_events admin insert" on public.billing_events;
create policy "billing_events admin insert"
  on public.billing_events for insert to authenticated
  with check (public.is_billio_admin());

-- document_send_events
drop policy if exists "document_send_events admin select" on public.document_send_events;
create policy "document_send_events admin select"
  on public.document_send_events for select to authenticated
  using (public.is_billio_admin());

-- messaging_send_logs
drop policy if exists "messaging_send_logs admin select" on public.messaging_send_logs;
create policy "messaging_send_logs admin select"
  on public.messaging_send_logs for select to authenticated
  using (public.is_billio_admin());

-- admin_user_notes
drop policy if exists "admin_user_notes admin all" on public.admin_user_notes;
create policy "admin_user_notes admin all"
  on public.admin_user_notes for all to authenticated
  using (public.is_billio_admin())
  with check (public.is_billio_admin());

-- ops_error_events: 운영자만 읽기; 삽입은 service role 또는 향후 RPC
drop policy if exists "ops_error_events admin select" on public.ops_error_events;
create policy "ops_error_events admin select"
  on public.ops_error_events for select to authenticated
  using (public.is_billio_admin());

-- billing_webhook_events (테이블은 0015 에 생성, RLS 없을 수 있음)
alter table public.billing_webhook_events enable row level security;

drop policy if exists "billing_webhook_events admin select" on public.billing_webhook_events;
create policy "billing_webhook_events admin select"
  on public.billing_webhook_events for select to authenticated
  using (public.is_billio_admin());

-- service role 이 웹훅에서 insert 하므로 정책 없으면 거부될 수 있음 → service role 우회 유지

-- public_inquiry_submissions: 운영 집계용 읽기
drop policy if exists "public_inquiry_submissions admin select" on public.public_inquiry_submissions;
create policy "public_inquiry_submissions admin select"
  on public.public_inquiry_submissions for select to authenticated
  using (public.is_billio_admin());

-- inquiries / quotes / invoices 빠른 요약용 (사용자 상세)
drop policy if exists "inquiries admin select" on public.inquiries;
create policy "inquiries admin select"
  on public.inquiries for select to authenticated
  using (public.is_billio_admin());

drop policy if exists "quotes admin select" on public.quotes;
create policy "quotes admin select"
  on public.quotes for select to authenticated
  using (public.is_billio_admin());

drop policy if exists "invoices admin select" on public.invoices;
create policy "invoices admin select"
  on public.invoices for select to authenticated
  using (public.is_billio_admin());

-- business_settings: 공개 폼·포털 활성 여부
drop policy if exists "business_settings admin select" on public.business_settings;
create policy "business_settings admin select"
  on public.business_settings for select to authenticated
  using (public.is_billio_admin());

-- customers: 포털 토큰 유무 등
drop policy if exists "customers admin select" on public.customers;
create policy "customers admin select"
  on public.customers for select to authenticated
  using (public.is_billio_admin());

-- activity_logs: 사용자 상세 활동
drop policy if exists "activity_logs admin select" on public.activity_logs;
create policy "activity_logs admin select"
  on public.activity_logs for select to authenticated
  using (public.is_billio_admin());

-- tax_invoices: 전자세금계산서 연동 이슈 조사
drop policy if exists "tax_invoices admin select" on public.tax_invoices;
create policy "tax_invoices admin select"
  on public.tax_invoices for select to authenticated
  using (public.is_billio_admin());
