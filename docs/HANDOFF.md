# Bill-IO 개발 핸드오프 (작업 이어하기)

이 문서는 **프로그램을 종료한 뒤**에도 동일 저장소에서 작업을 재개할 때 참고용으로 작성되었습니다.  
저장소: `saas-quote-mvp` (원격: `origin/main`).

---

## 1. 최근에 구현·변경된 큰 덩어리

### 1.1 운영자 백오피스 (`/admin`)

- **경로**: `/admin` — 일반 앱 `AppShell`과 **완전 분리** (별도 레이아웃·zinc 다크 톤).
- **권한**: `public.users.is_admin === true` 인 Supabase 사용자만 `(ops)` 영역 접근. 데모 세션은 거부 → `/admin/forbidden`.
- **마이그레이션**: `supabase/migrations/0016_admin_ops_console.sql`
  - `users`: `is_admin`, `admin_role`, `account_disabled`, `email`
  - `support_tickets`: `operator_note`, `assignee_admin_id`, `replied_at`, 상태 `open` → `new` 마이그레이션
  - `admin_user_notes`, `ops_error_events`
  - `public.is_billio_admin()` + RLS 정책(운영자 교차 테이블 조회/일부 insert)
- **주요 코드**
  - `src/lib/server/admin-auth.ts` — `requireAdminAccess()`
  - `src/lib/server/admin-data.ts` — KPI, 사용자 목록/상세, 빌링·지원·시스템·사용량
  - `src/app/admin/actions.ts` — 티켓·사용자·플랜·체험·비활성 등 서버 액션
  - `src/app/admin/layout.tsx`, `forbidden/page.tsx`, `src/app/admin/(ops)//**`
  - `src/components/admin/admin-shell.tsx`, `admin-user-actions.tsx`, `admin-ticket-form.tsx`
- **첫 운영자 지정** (DB에 마이그레이션 적용 후):

```sql
update public.users
set is_admin = true, admin_role = 'owner'
where lower(trim(email)) = lower(trim('운영자@도메인.com'));
```

### 1.2 인증·로그인

- **`users.email`**: `ensureUserProfile` upsert 시 auth 이메일 미러 (운영자 목록 검색용).
- **`account_disabled`**: `getAppSession()`에서 조회 후 `true`면 `signOut` → 세션 없음 (앱 전체 차단).
- **로그인 후 리다이렉트 `next`**: `/login?next=%2Fadmin` 등 안전한 **동일 출처 상대 경로만** 허용.
  - `src/lib/safe-login-redirect.ts`
  - `src/app/login/page.tsx`, `src/components/app/login-form.tsx`, `src/app/actions.ts` (`loginAction`)

### 1.3 고객센터 티켓 기본 상태

- 신규 접수: `status: "new"` — `src/app/(app)/help/actions.ts`

### 1.4 앱 셸과 요금·고객센터

- `/billing`, `/help` 는 `(app)` 그룹 아래로 이동해 **사이드바·동일 세션**에서 동작.
- `middleware.ts`: 해당 경로는 공개가 아님 (로그인 필요).
- 랜딩 Pricing 한글화: `src/components/landing/landing-sections.tsx`, `landing-pricing-saas.tsx`, `landing-json-ld.tsx`

### 1.5 기타 복구

- `recordDocumentPdfDownloadAction`: 견적/청구 인쇄 툴바에서 `document_send` 집계 — `src/app/actions.ts`

---

## 2. 배포·DB 전제

1. **Supabase에 마이그레이션 적용** (`0014`~`0016` 등 프로젝트에 포함된 순서). 특히 **`0016` 없으면 `/admin`·`is_admin`·RLS가 동작하지 않음**.
2. **첫 운영자**는 위 SQL로 수동 지정.
3. **`SUPABASE_SERVICE_ROLE_KEY`**: 기존 청구 웹훅·운영자 메일 등에 사용. `/admin` 자체는 주로 **로그인 사용자 JWT + RLS**로 조회.

---

## 3. 알려진 제한·후속 아이디어

| 항목 | 설명 |
|------|------|
| `ops_error_events` | 테이블만 있음. API/워커에서 실패 시 `insert` 붙이면 시스템 탭이 살아남. |
| AI/발송 과거 월 추이 | 현재는 `users` 월별 카운터만 있음. 시계열이 필요하면 집계 테이블·배치 추가. |
| 관리자 링크 | 일반 내비에 없음. URL `…/admin` 직접 접근 또는 `is_admin`일 때만 링크 노출 등 선택. |

---

## 4. 빌드·검증

```bash
cd saas-quote-mvp
npm install   # 필요 시
npm run build
```

---

## 5. 관련 파일 빠른 목록

```
supabase/migrations/0016_admin_ops_console.sql
src/lib/server/admin-auth.ts
src/lib/server/admin-data.ts
src/lib/safe-login-redirect.ts
src/lib/auth.ts
src/app/admin/**
src/app/actions.ts          # loginAction, recordDocumentPdfDownloadAction, …
src/app/login/page.tsx
src/components/admin/**
src/components/app/login-form.tsx
src/components/landing/landing-sections.tsx
src/types/supabase.ts       # 스키마 타입(수동 동기화됨)
.env.example
```

---

## 6. 이어서 할 일 예시 (선택)

- [ ] 프로덕션 Supabase에 `0016` 적용 여부 확인
- [ ] `ops_error_events`에 AI/메일/웹훅 실패 적재
- [ ] 운영자만 보이는 사이드바 링크 (선택)
- [ ] `auth/callback`에도 `next` 전달 일원화 (현재는 비밀번호 로그인 중심)

---

*문서 갱신일: 저장소 최신 커밋 기준으로 `git log -1` 확인 후 이어서 수정할 것.*
