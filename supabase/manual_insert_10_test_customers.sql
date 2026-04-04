-- =============================================================================
-- 테스트 고객 10명 삽입 (Supabase Dashboard → SQL Editor 에서 실행)
-- =============================================================================
-- 1) 아래 target_email 을 본인 Supabase 로그인 이메일로 바꿉니다.
-- 2) public.users 에 해당 Auth 사용자 행이 있어야 합니다 (앱에 한 번 로그인).
-- 3) 동일 test.customer.*@example.com 이 이미 있으면 그 행은 건너뜁니다.
-- =============================================================================

do $seed$
declare
  target_email text := 'YOUR_LOGIN_EMAIL@example.com'; -- ← 여기만 수정
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(target_email) limit 1;
  if uid is null then
    raise exception 'auth.users 에서 이메일을 찾을 수 없습니다: %', target_email;
  end if;

  if not exists (select 1 from public.users where id = uid) then
    raise exception 'public.users 에 행이 없습니다. 앱에 로그인한 뒤 다시 실행하세요. user_id=%', uid;
  end if;

  insert into public.customers (user_id, name, company_name, phone, email, notes, tags)
  select uid, v.name, v.company_name, v.phone, v.email, v.notes, v.tags
  from (
    values
      ('김민서', '테스트원 주식회사', '010-2001-0001', 'test.customer.01@example.com', '시드 스크립트로 생성된 테스트 고객입니다.', array['테스트']::text[]),
      ('이도현', '블루핀 스튜디오', '010-2001-0002', 'test.customer.02@example.com', '견적·청구 UI 테스트용', array['테스트', '스튜디오']::text[]),
      ('박지우', null, '010-2001-0003', 'test.customer.03@example.com', null, array['테스트']::text[]),
      ('최서준', '노던랩', '010-2001-0004', 'test.customer.04@example.com', 'B2B 문의 패턴', array['테스트', 'B2B']::text[]),
      ('정하은', '하은컴퍼니', '010-2001-0005', 'test.customer.05@example.com', null, array['테스트']::text[]),
      ('강유진', null, '010-2001-0006', 'test.customer.06@example.com', '개인 프리랜서', array['테스트', '프리랜서']::text[]),
      ('조시우', '시우마케팅', '010-2001-0007', 'test.customer.07@example.com', null, array['테스트', '마케팅']::text[]),
      ('윤채원', '채원뷰티', '010-2001-0008', 'test.customer.08@example.com', '뷰티 업종 샘플', array['테스트', '뷰티']::text[]),
      ('임준혁', '테크솔루션', '010-2001-0009', 'test.customer.09@example.com', null, array['테스트', 'IT']::text[]),
      ('한소율', '소율디자인', '010-2001-0010', 'test.customer.10@example.com', '디자인 의뢰 샘플', array['테스트', '디자인']::text[])
  ) as v(name, company_name, phone, email, notes, tags)
  where not exists (
    select 1 from public.customers c
    where c.user_id = uid and c.email = v.email
  );
end
$seed$;
