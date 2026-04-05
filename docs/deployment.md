# FlowBill MVP — Vercel + Supabase 비공개 베타 배포 가이드

이 문서는 **현재 저장소 기준**(Next.js App Router, `middleware.ts` + `@supabase/ssr`, `src/lib/data.ts` + RLS)으로 작성했습니다.

**한 번에 따라 할 실행 순서**는 **[deploy-runbook.md](./deploy-runbook.md)** 를 먼저 보세요. 이 파일은 세부·참고용입니다.

---

## 1. Vercel에 프로젝트 연결하는 순서

1. **Git 원격 저장소**에 이 프로젝트를 푸시합니다. (GitHub/GitLab/Bitbucket 등 Vercel이 지원하는 호스트)
2. [Vercel](https://vercel.com)에 로그인 → **Add New… → Project**.
3. 해당 저장소를 **Import**합니다.
4. **Framework Preset**: `Next.js`로 인식되는지 확인합니다. (루트에 `package.json` / `next.config.ts` 가 있으면 자동)
5. **Root Directory**: 모노레포가 아니면 비워 둡니다. (이 프로젝트는 저장소 루트가 앱 루트)
6. **Build Command**: 기본 `npm run build` (변경 불필요)
7. **Output**: Next.js 기본(설정 변경 불필요)
8. 아래 **환경 변수**를 먼저 넣은 뒤 **Deploy** 하거나, 첫 배포 후 Settings에서 변수를 추가하고 **Redeploy** 합니다.  
   - Supabase 마이그레이션·Auth URL을 **배포 전**에 맞춰 두는 것을 권장합니다.

---

## 2. 필요한 환경 변수 목록 (Vercel)

Vercel 프로젝트 **Settings → Environment Variables**에서 설정합니다.

### 비공개 베타·프로덕션에 필수에 가깝게 필요한 항목

| 이름 | Production | 설명 |
|------|------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase **Project URL** (`https://xxxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase **anon public** API 키 (Settings → API) |

### 운영 기능에 가깝게 필요

| 이름 | Production | 설명 |
|------|------------|------|
| `NEXT_PUBLIC_SITE_URL` | 강력 권장 | 고정 도메인(슬래시 없음). 인증·재설정·공유 링크 기준. 미설정 시 `VERCEL_URL`에 의존해 Supabase Redirect와 어긋나기 쉬움 (`src/lib/site-url.ts`) |
| `RESEND_API_KEY` | 견적 메일 발송 시 사실상 필수 | Resend API 키. 없으면 `sendQuoteEmailAction`이 사용자에게 명시적 오류를 반환 (`src/lib/send-resend.ts`) |
| `RESEND_FROM` | 권장 | 인증된 발신 주소. 미설정 시 설정 화면 이메일 또는 테스트 주소 시도(403/422 가능) |
| `OPENAI_API_KEY` | AI 기능 사용 시 필수 | 견적 초안·문의 구조화·발송 문구 API (`/api/ai/*`) |
| `OPENAI_MODEL` | 선택 | 기본 `gpt-4o-mini` |
| `OPENAI_TIMEOUT_MS` | 선택 | 기본 `55000` (ms) |

### 선택

| 이름 | 설명 |
|------|------|
| `NEXT_PUBLIC_APP_NAME` | UI 표시용 앱 이름 (기본 없어도 동작) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | 랜딩 `/billing#business` 문의 링크 |
| `ENABLE_DEMO_LOGIN` | `true`/`1` 이면 **모든** 배포 환경에서 데모 로그인 허용. 비공개 베타 **Production**에서는 보통 **비움** 또는 `false` |
| `DEMO_LOGIN_EMAIL` | 데모용 이메일 (`src/app/actions.ts`의 데모 분기에서만 사용) |
| `DEMO_LOGIN_PASSWORD` | 데모용 비밀번호 |

**이 프로젝트에 넣지 말 것**

- **`service_role`** 키를 `NEXT_PUBLIC_*` 로 넣지 마세요. 이 앱은 **anon + RLS**만 사용합니다. (`.env.example` 주석 참고)

**환경별 분리**

- **Production**: 베타 사용자용 URL. `NEXT_PUBLIC_SUPABASE_*` 필수.
- **Preview**: 동일 Supabase를 쓰거나 별도 프로젝트를 쓸 수 있습니다. Preview만 데모를 켤 경우 `ENABLE_DEMO_LOGIN=true` 를 **Preview에만** 넣고 Production에는 넣지 않습니다.

---

## 3. Supabase Auth — Site URL / Redirect URL

**인증 메일 한글·발신 주소(`admin@bill-io.com` 등)** 는 대시보드 **Email Templates** + **Custom SMTP** 로 설정합니다.  
→ 상세: **[supabase-auth-email-ko-smtp.md](./supabase-auth-email-ko-smtp.md)**

**설정 위치 (Supabase 대시보드)**  
**Authentication** → **URL Configuration** (구 UI에서는 *Authentication → Settings* 일 수 있음)

### Site URL (예시)

- 프로덕션 베타 도메인 하나를 기본으로 둡니다.  
  - 예: `https://flowbill-mvp.vercel.app`  
  - 커스텀 도메인을 쓰면: `https://beta.yourdomain.com`

### Redirect URLs (예시)

허용 목록에 **실제로 브라우저에서 열 주소**를 넣습니다.

```
https://flowbill-mvp.vercel.app/**
https://flowbill-mvp.vercel.app
http://localhost:3000/**
http://localhost:3000
```

- `**` 와일드카드는 Supabase 버전에 따라 지원 형식이 다를 수 있으므로, 문제가 있으면 **정확한 URL**만 한 줄씩 추가합니다.
- 이 앱은 **표준 Supabase Auth 쿠키**(`sb-…-auth-token`)와 `middleware.ts`로 보호 라우트를 판별합니다. Site URL·Redirect가 어긋나면 로그인 후 **리다이렉트 루프** 또는 **세션 없음**이 납니다.
- 비밀번호 재설정 메일의 `redirectTo` 는 **`…/reset-password`** 입니다. Redirect URLs 에 해당 절대 URL(또는 와일드카드 패턴)을 반드시 넣어야 합니다. 메일 링크는 보통 `…/reset-password?code=…` 형태로 열리며, 브라우저에서 PKCE·hash·`token_hash` 등을 처리한 뒤 새 비밀번호 폼이 표시됩니다. (구 경로 `/auth/update-password` 는 `/reset-password` 로 리다이렉트됩니다.)

---

## 4. Migration 적용 순서 (고정)

Supabase **SQL Editor**에서 저장소의 파일을 **아래 순서 그대로** 실행합니다. (건너뛰기·순서 바꿈 금지)

1. `supabase/migrations/0001_mvp_schema.sql` — 테이블·ENUM·초기 RLS  
2. `supabase/migrations/0002_phase2_foundation.sql` — `updated_at` 트리거, `auth.users` 가입 시 `public.users` / `business_settings` 시드 트리거 등  
3. `supabase/migrations/0003_rls_tenant_fk_enforcement.sql` — 문의/견적/청구 등 **FK 테넌트 정합** RLS 보강  
4. `supabase/migrations/0003_quote_seal_share_document.sql` — 견적 공유·직인·문서 RPC 등  
5. `supabase/migrations/0004_user_plan.sql` — `public.users.plan` (`free` / `pro`). **미적용 시** 앱은 `free`로 완화 동작하지만 설정 화면에 **플랜 컬럼 미적용** 안내가 뜹니다.

`0003_rls` 미적용 시 RLS가 `user_id`만 검사해 **타인의 `customer_id` 등을 조합하는** 위험이 남습니다. 오픈 전 **위 순서 전부** 적용했는지 확인하세요.

---

## 5. Production에서 demo login 비활성화하는 방법

이 저장소의 로직은 `src/lib/demo-flags.ts`의 `isDemoLoginEnabled()`입니다.

- **Vercel Production**에서 `NODE_ENV`는 `production` 입니다.
- **`ENABLE_DEMO_LOGIN`을 아예 넣지 않거나**, 값을 **`false`** / **`0`** 으로 두면 **프로덕션에서는 데모가 꺼집니다.** (미설정이 곧 “프로덕션에서 데모 끔”)
- 데모가 꺼진 상태에서는 `middleware.ts`가 `flowbill-demo-session` 쿠키를 **인증으로 인정하지 않고**, `getAppSession()`(`src/lib/auth.ts`)도 데모 쿠키를 무시·삭제 후 Supabase 세션만 봅니다.

**명시적으로 막고 싶을 때**  
Production 환경에 `ENABLE_DEMO_LOGIN=false` 를 등록합니다.

**스테이징만 데모 허용**  
Preview 환경에만 `ENABLE_DEMO_LOGIN=true` 를 추가하고, Production에는 두지 않습니다.

---

## 6. 배포 후 스모크 테스트 순서

운영자용 **10분 체크리스트**를 따릅니다.

1. 문서 열기: **[beta-qa-checklist.md](./beta-qa-checklist.md)**  
2. **「Vercel 배포 직후 — 최우선 5개」** 체크박스부터 순서대로 진행합니다.  
3. 이어서 **「전체 체크리스트」**로 로그인·데모 차단·CRUD·타임라인·설정·검색/필터·권한·오류 메시지를 확인합니다.

배포 URL은 Vercel 프로젝트 **Deployments**에서 확인합니다.

---

## 7. 자주 발생할 수 있는 실수 5가지 (이 프로젝트 기준)

1. **마이그레이션 누락** — 특히 `0003_rls`·`0003_quote_seal`·`0004_user_plan` 중 일부만 적용된 경우. [§4](#4-migration-적용-순서-고정) 순서대로 재확인하세요.  
2. **anon 키와 service_role 혼동** — `NEXT_PUBLIC_SUPABASE_ANON_KEY` 에 **anon public** 만 넣어야 합니다. service_role 을 넣으면 RLS 우회·유출 시 치명적입니다.  
3. **Auth Site URL이 localhost로 남음** — 프로덕션 배포 후에도 Supabase Site URL이 `http://localhost:3000` 이면 리다이렉트·세션이 깨질 수 있습니다. **실제 Vercel URL**로 바꾸고 Redirect 목록에도 추가하세요.  
4. **Production에 `ENABLE_DEMO_LOGIN=true` 남김** — 의도치 않게 데모 계정이 열립니다. Production 변수 목록에서 제거하거나 `false` 로 고정하세요.  
5. **Vercel 환경 변수를 Preview에만 넣음** — Production 배포에는 `NEXT_PUBLIC_SUPABASE_*` 가 없어서 앱이 Supabase 없이 동작하거나(또는 로그인 불가) 합니다. **Production** 탭에도 동일 키를 넣었는지 확인하세요.

---

## 8. 배포 직전 최종 체크포인트 (RC)

사람이 **배포 버튼 누르기 전**에 아래를 순서대로 확인합니다.

- [ ] Supabase에 **§4 순서대로** 마이그레이션 **전부** 적용 (`0004_user_plan` 포함)  
- [ ] Vercel에 **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** 입력 (사용하는 **Production·Preview** 모두)  
- [ ] (권장) **`NEXT_PUBLIC_SITE_URL`** — 프로덕션 고정 도메인  
- [ ] (견적 메일) **`RESEND_API_KEY`** 및 권장 **`RESEND_FROM`**  
- [ ] (AI) **`OPENAI_API_KEY`** — AI 버튼 사용 시  
- [ ] Supabase **Authentication → URL Configuration**: **Site URL**·**Redirect URLs**에 Vercel URL 반영 (`/auth/callback`, `/reset-password`)  
- [ ] **Production**에서 데모 불필요 시 **`ENABLE_DEMO_LOGIN` 미설정 또는 `false`**  
- [ ] **회원가입 또는 테스트 계정**으로 프로덕션 URL **로그인** 성공  
- [ ] **[production-e2e-checklist.md](./production-e2e-checklist.md)** 또는 **문의 → 견적 → 메일 → 청구 → 리마인드 → 재설정** 흐름 수동 검증  

이후 [beta-qa-checklist.md](./beta-qa-checklist.md)로 스모크를 이어가면 됩니다.

### 세션·`/login` 동작 (현재 코드)

- `middleware.ts`는 **쿠키 존재만으로 `/login`에서 `/dashboard`로 자동 이동하지 않습니다.** (만료된 `sb-*` 쿠키가 남았을 때 로그인 ↔ 대시보드 **리다이렉트 루프**를 막기 위함입니다.)  
- 로그인 성공 후 이동은 `loginAction`의 `redirect("/dashboard")`가 담당합니다.  
- `getAppSession()`에서 `getUser()` 결과가 없으면 `signOut()`으로 쿠키 정리를 시도합니다 (`src/lib/auth.ts`).

---

## 관련 파일 (코드 기준)

| 역할 | 경로 |
|------|------|
| 데모 플래그 | `src/lib/demo-flags.ts` |
| 세션·데모 쿠키 | `src/lib/auth.ts`, `src/lib/demo-session.ts` |
| 라우트 보호 | `middleware.ts` |
| 로그인 액션 | `src/app/actions.ts` (`loginAction`) |
| 데이터·RLS 클라이언트 | `src/lib/supabase/server.ts`, `src/lib/data.ts` |
| 환경 변수 예시 | `.env.example` |
| 플랜·결제 진입점 | `/billing`, `src/lib/billing/catalog.ts` |
| 운영 오류 대응 표 | [operations-errors.md](./operations-errors.md) |
| E2E 출시 체크 | [production-e2e-checklist.md](./production-e2e-checklist.md) |

---

## 더 보기

- **실전 실행 순서(Runbook)**: [deploy-runbook.md](./deploy-runbook.md)  
- 로컬 실행·보안 요약: 루트 [README.md](../README.md)  
- 운영 스모크 체크리스트: [beta-qa-checklist.md](./beta-qa-checklist.md)
