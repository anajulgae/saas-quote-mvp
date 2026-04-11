-- =============================================================================
-- 수동 실행: 특정 로그인 이메일을 Bill-IO 운영자(/admin)로 지정합니다.
-- Supabase Dashboard → SQL Editor → Postgres 로 실행하세요. (마이그레이션에 넣지 마세요.)
-- 전제: 해당 이메일로 auth 에 가입·로그인한 적이 있어 public.users 행이 존재해야 합니다.
-- 전제: 마이그레이션 0016_admin_ops_console.sql 적용 후 실행.
-- =============================================================================

update public.users u
set
  is_admin = true,
  admin_role = 'owner',
  email = lower(trim(a.email)),
  updated_at = now()
from auth.users a
where u.id = a.id
  and lower(trim(a.email)) = lower(trim('anajulgae@gmail.com'));

-- 확인 (선택): 영향 받은 행이 1이어야 합니다.
-- select u.id, u.is_admin, u.admin_role, u.email
-- from public.users u
-- join auth.users a on a.id = u.id
-- where lower(trim(a.email)) = lower(trim('anajulgae@gmail.com'));
