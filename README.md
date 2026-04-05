# FlowBill AI (SaaS Quote MVP)

국내 1인 사업자용 **문의 · 견적 · 청구 · 수금** 관리 MVP입니다. Next.js App Router, TypeScript, Tailwind, Supabase를 사용합니다.

**실전 배포 실행 순서**: **[docs/deploy-runbook.md](./docs/deploy-runbook.md)**  
**배포 상세**(환경변수·Auth URL·마이그레이션·Resend·OpenAI): **[docs/deployment.md](./docs/deployment.md)**  
**출시 E2E 체크리스트**: **[docs/production-e2e-checklist.md](./docs/production-e2e-checklist.md)**  
**운영 오류 대응 표**: **[docs/operations-errors.md](./docs/operations-errors.md)**  
**배포 직후 스모크**: **[docs/beta-qa-checklist.md](./docs/beta-qa-checklist.md)**  
**비공개 베타 운영**: **[docs/beta-operations.md](./docs/beta-operations.md)**  
**공개 데모**(선택): **[docs/public-demo.md](./docs/public-demo.md)**

---

## 로컬 실행

```bash
npm install
cp .env.example .env.local
# .env.local 에 Supabase URL/anon 키를 넣으면 실데이터 모드 (선택)
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

```bash
npm run lint
npm run build
```

---

## 보안: API 키 (필독)

| 사용 | 설명 |
|------|------|
| **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** | 브라우저에 노출됩니다. **anon(public) 키만** 사용하세요. 데이터 보호는 **RLS**에 의존합니다. |
| **`service_role` / Service Role secret** | **절대** `NEXT_PUBLIC_*` 환경변수에 넣지 마세요. 클라이언트 번들에 실릴 수 있습니다. service_role 은 RLS를 우회합니다. |

이 프로젝트는 현재 **서버에서 service_role 을 사용하지 않습니다.**

---

## 환경 변수 (`.env.example` 참고)

| 변수 | 프로덕션 | 설명 |
|------|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 필수 권장 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 필수 권장 | anon public 키 |
| `NEXT_PUBLIC_SITE_URL` | 강력 권장 | 고정 도메인(슬래시 없음). 인증·재설정·공유 링크 기준 |
| `RESEND_API_KEY` | 견적 메일 시 사실상 필수 | Resend에서 발급 |
| `RESEND_FROM` | 권장 | 인증된 발신 주소 |
| `OPENAI_API_KEY` | AI 사용 시 필수 | `/api/ai/*` |
| `OPENAI_MODEL_INQUIRY_STRUCTURE` | AI 사용 시 필수 | 문의 구조화 → 기본 `gpt-5.4-nano` (`.env.example` 참고) |
| `OPENAI_MODEL_COMPOSE_MESSAGE` | AI 사용 시 필수 | 발송·리마인드 문구 → 기본 `gpt-5.4-nano` |
| `OPENAI_MODEL_QUOTE_DRAFT` | AI 사용 시 필수 | 견적 초안 → 기본 `gpt-5.4-mini` |
| `OPENAI_MODEL_FALLBACK` | 선택 | 견적 초안 실패 시 재시도 모델 (`OPENAI_QUOTE_DRAFT_FALLBACK=true`일 때) |
| `OPENAI_MAX_OUTPUT_TOKENS_*` | 선택 | 기능별 출력 토큰 상한 |
| `OPENAI_QUOTE_DRAFT_FALLBACK` | 선택 | `true`면 초안 API가 실패 시 fallback 모델 1회 재시도 |
| `ENABLE_DEMO_LOGIN` | 선택 | 데모 로그인 허용 (아래 표 참고) |
| `DEMO_LOGIN_EMAIL` / `DEMO_LOGIN_PASSWORD` | 선택 | 데모 전용 |
| `NEXT_PUBLIC_APP_NAME` | 선택 | 표시용 이름 |
| `NEXT_PUBLIC_CONTACT_EMAIL` | 선택 | `/billing` Business 문의 |

전체 예시와 주석: **`.env.example`**

### OpenAI: 기능별 모델 (비용·품질 분리)

| API | 환경 변수 | 권장 기본값(예시) | 역할 |
|-----|-----------|-------------------|------|
| `/api/ai/inquiry-structure` | `OPENAI_MODEL_INQUIRY_STRUCTURE` | `gpt-5.4-nano` | 짧은 구조화·채널·요약 |
| `/api/ai/compose-message` | `OPENAI_MODEL_COMPOSE_MESSAGE` | `gpt-5.4-nano` | 발송·청구·리마인드 문구 |
| `/api/ai/quote-draft` | `OPENAI_MODEL_QUOTE_DRAFT` | `gpt-5.4-mini` | 견적 초안(항목·결제·안내) |

- **모델명은 코드에 없음.** 바꿀 때는 배포 환경 변수만 수정 후 재배포. 설정 집약지: `src/lib/server/openai-config.ts`, 호출: `src/lib/server/openai-chat.ts`.
- **비용**: 짧은 작업은 nano, 초안만 mini. `OPENAI_MAX_OUTPUT_TOKENS_INQUIRY` / `_MESSAGE` / `_QUOTE` 로 출력 상한 조절.
- **운영 로그**: `[bill-io-ai]` + JSON (`feature`, `model`, `maxOutputTokens`, `phase`) — 이후 사용량·비용 분석에 활용.
- **초안 fallback(선택)**: `OPENAI_QUOTE_DRAFT_FALLBACK=true` 이고 `OPENAI_MODEL_FALLBACK` 이 있으면, 주 모델이 실패할 때만 nano로 1회 재시도.

상세 표·체크리스트: **`docs/deployment.md`**.

### `ENABLE_DEMO_LOGIN` 동작 (코드: `src/lib/demo-flags.ts`)

| 설정값 | 동작 |
|--------|------|
| `true` 또는 `1` | 모든 환경에서 데모 로그인·`flowbill-demo-session` 쿠키 **허용** |
| `false` 또는 `0` | 모든 환경에서 데모 **비활성** |
| **미설정** | **`NODE_ENV === "production"` 이면 데모 끔** / 그 외(로컬 `dev` 등)에서는 데모 **허용** |

**프로덕션 기본**: 데모는 꺼져 있습니다. 미들웨어(`middleware.ts`)와 `getAppSession()`(`src/lib/auth.ts`)이 동일하게 `isDemoLoginEnabled()`를 사용하므로, **프로덕션에서 데모 쿠키만으로는 인증되지 않습니다.**

**스테이징만 데모**: 보통은 Vercel **Preview**에만 `ENABLE_DEMO_LOGIN=true` 를 둡니다.  
**제3자 점검**: Production에서 짧게 열어야 하면 `ENABLE_DEMO_LOGIN=true` + 강한 `DEMO_LOGIN_PASSWORD` + 전용 `DEMO_LOGIN_EMAIL` 만 사용하고, 끝나면 끄세요. 상세는 **[docs/public-demo.md](./docs/public-demo.md)**.

---

## Supabase 프로젝트 생성 및 연결

1. [Supabase](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. **Project Settings → API**에서 **Project URL**과 **anon public** 키를 복사합니다.
3. 로컬이면 `.env.local`, Vercel이면 프로젝트 **Settings → Environment Variables**에 다음을 넣습니다.  
   - `NEXT_PUBLIC_SUPABASE_URL`  
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Authentication → Providers**에서 Email 로그인을 켭니다.  
5. 사용자는 **`/signup`** 에서 가입하거나, Supabase 대시보드에서 사용자를 추가할 수 있습니다.

---

## 데이터베이스 마이그레이션 (순서 고정)

**반드시 아래 순서대로** SQL Editor에서 실행하세요.

1. `0001_mvp_schema.sql`  
2. `0002_phase2_foundation.sql`  
3. `0003_rls_tenant_fk_enforcement.sql` — 테넌트 FK RLS 보강  
4. `0003_quote_seal_share_document.sql` — 견적 공유·직인·RPC  
5. `0004_user_plan.sql` — `users.plan` (`free` / `pro`)

`0003_rls` 미적용 시 보안 공격면이 남습니다. `0004` 미적용 시 앱은 동작하지만 설정에 **플랜 마이그레이션 안내**가 표시됩니다.

---

## Vercel 배포 및 환경 변수

1. Git 저장소를 Vercel에 연결해 프로젝트를 Import 합니다.
2. **Settings → Environment Variables**에서 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 추가합니다.  
   - **Production** / **Preview** / **Development** 탭별로 같은 키를 넣을지, Preview만 데모용 변수를 넣을지 구분할 수 있습니다.
3. 배포 후 Production URL로 접속해 로그인·저장 동작을 확인합니다.
4. 프로덕션에서 데모를 쓰지 않을 경우 **`ENABLE_DEMO_LOGIN`을 비우거나 `false`** 로 둡니다.

---

## Supabase Auth — Site URL / Redirect URL

배포 도메인에서 로그인·이메일 인증·비밀번호 재설정 링크가 깨지지 않도록 설정합니다.

1. Supabase **Authentication → URL Configuration**
2. **Site URL**: 프로덕션 기본 URL (예: `https://your-app.vercel.app`)
3. **Redirect URLs** (예시 — 실제 도메인으로 바꿔 등록):
   - `{SITE_URL}/auth/callback` — 가입·이메일 확인 등 PKCE 콜백
   - `{SITE_URL}/reset-password` — 비밀번호 재설정 메일의 `redirectTo`
   - 로컬: `http://localhost:3000/auth/callback`, `http://localhost:3000/reset-password`

**비밀번호 재설정 흐름**: `/forgot-password` → 메일의 링크 → `/reset-password` → 저장 → 로그인 (`/login?reset=success` 안내 가능).

자세한 형식은 Supabase 문서를 따릅니다.

---

## 데모 모드 vs 프로덕션(실데이터) 모드

| 구분 | 조건 |
|------|------|
| **실데이터** | Supabase URL/키가 설정되어 있고, 사용자가 **Supabase Auth**로 로그인한 경우 (`sb-…-auth-token` 계열 쿠키). 서버는 `getDataContext()`에서 Supabase로 조회합니다. |
| **데모** | `isDemoLoginEnabled()`가 true이고, 데모 로그인으로 **`flowbill-demo-session=1`** 쿠키가 설정된 경우. 서버는 `src/lib/data.ts`가 **메모리 데모 데이터**를 사용합니다. |

### 개발용 `demo-data` 의존성

- **`src/lib/demo-data.ts`**: 데모 모드 전용 **인메모리 시드 데이터**입니다. 프로덕션에서 Supabase를 쓰는 일반 사용자 경로에서는 사용되지 않습니다.
- **`src/lib/data.ts`**: `mode === "demo"` 일 때만 위 모듈을 사용합니다.
- **`src/app/(app)/layout.tsx`**: 세션에 사업장명이 없을 때 UI 폴백으로 `demoBusinessSettings` 를 참조할 수 있습니다(표시용).

---

## 비공개 베타 운영 시 주의사항

- 베타 테스터 계정은 **Supabase Auth**에서 발급·비밀번호 정책을 관리하세요.
- **RLS**가 켜져 있는지·`0003`까지 적용됐는지 재확인하세요.
- 데모를 켠 환경에서는 **`DEMO_LOGIN_PASSWORD`를 추측하기 어렵게** 바꾸세요.
- 로그인·저장 실패 시 사용자에게는 `src/lib/action-errors.ts` 기준으로 일관된 메시지가 나가도록 되어 있습니다(세션 만료·권한·FK 등).

---

## 배포 후 QA 체크리스트 (운영자용)

- **10분 스모크**: [docs/beta-qa-checklist.md](./docs/beta-qa-checklist.md)  
- **출시 E2E(가입·AI·메일·재설정 등)**: [docs/production-e2e-checklist.md](./docs/production-e2e-checklist.md)  
- **오류 대응**: [docs/operations-errors.md](./docs/operations-errors.md)

---

## 배포 전 최종 체크포인트 (RC — 사람이 꼭 확인)

- [ ] Supabase 마이그레이션 **전 순서** 적용 (`0004_user_plan` 포함)  
- [ ] Vercel: **`NEXT_PUBLIC_SUPABASE_*`** · (권장) **`NEXT_PUBLIC_SITE_URL`** · (메일) **`RESEND_API_KEY`** · (AI) **`OPENAI_API_KEY`** + 기능별 **`OPENAI_MODEL_INQUIRY_STRUCTURE`**, **`OPENAI_MODEL_COMPOSE_MESSAGE`**, **`OPENAI_MODEL_QUOTE_DRAFT`**  
- [ ] Supabase Auth: **Site URL**·**Redirect URLs** (`/auth/callback`, `/reset-password`)  
- [ ] Production: **`ENABLE_DEMO_LOGIN` 미설정 또는 `false`** (데모 불필요 시)  
- [ ] 로그인·**견적 메일**(가능 시)·핵심 CRUD 수동 확인  
- [ ] `npm run build` 통과  
- [ ] [production-e2e-checklist.md](./docs/production-e2e-checklist.md) 또는 [beta-qa-checklist.md](./docs/beta-qa-checklist.md) 수행  

상세: [docs/deployment.md](./docs/deployment.md)

---

## 현재 제품 범위 요약

**포함**: 회원가입·이메일 인증, 고객·문의·견적·청구, 견적 공유 링크·인쇄/PDF, **Resend 견적 메일**, **OpenAI 보조**(초안·문의 구조화·문구), 리마인드, 설정·직인, 플랜 컬럼(`free`/`pro`), **`/billing` 결제 진입점(문서·UI)**.

**미포함**: 실제 PG(카드) 결제, 자동 청구서 발행, 회계·팀 좌석 본격 지원 등 — 플랜 게이트는 `src/lib/plan-features.ts` / `src/lib/billing/catalog.ts` 에서 확장합니다.

---

## 라이선스

비공개 프로젝트로 가정합니다. 필요 시 별도 명시하세요.
