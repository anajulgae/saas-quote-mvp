-- =============================================================================
-- 수동 실행: 특정 로그인 이메일의 플랜을 Pro 로 올립니다.
-- Supabase Dashboard → SQL Editor → Postgres 로 실행하세요. (마이그레이션에 넣지 마세요.)
-- =============================================================================

update public.users u
set
  plan = 'pro',
  updated_at = now()
from auth.users a
where u.id = a.id
  and lower(a.email) = lower('anajulgae@gmail.com');

-- 확인 (선택)
-- select u.id, u.plan, a.email
-- from public.users u
-- join auth.users a on a.id = u.id
-- where lower(a.email) = lower('anajulgae@gmail.com');
