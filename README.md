# FlowBill AI (SaaS Quote MVP)

국내 1인 사업자용 **문의 · 견적 · 청구 · 수금** 관리 MVP입니다. Next.js App Router, TypeScript, Tailwind, Supabase를 사용합니다.

**실전 배포 실행 순서**: **[docs/deploy-runbook.md](./docs/deploy-runbook.md)**  
**배포 상세**(환경변수·Auth URL·마이그레이션·Resend·OpenAI·**알림**): **[docs/deployment.md](./docs/deployment.md)** (§4.1 알림)  
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

**선택**: 서버 환경에만 `SUPABASE_SERVICE_ROLE_KEY` 를 두면, 공개 문의 폼 제출 후 **운영자 이메일 알림**(Resend)에서 알림 설정·수신 주소를 조회할 수 있습니다. 없으면 이메일 단계만 건너뜁니다.

---

## 환경 변수 (`.env.example` 참고)

| 변수 | 프로덕션 | 설명 |
|------|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 필수 권장 | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 필수 권장 | anon public 키 |
| `NEXT_PUBLIC_SITE_URL` | 강력 권장 | 고정 도메인(슬래시 없음). 인증·재설정·공유 링크 기준 |
| `RESEND_API_KEY` | 견적 메일 시 사실상 필수 | Resend에서 발급 |
| `RESEND_FROM` | 권장 | 인증된 발신 주소 |
| `RESEND_FROM_EMAIL` | 선택 | 새 문의 운영자 메일 전용(없으면 `RESEND_FROM` 사용) |
| `SUPABASE_SERVICE_ROLE_KEY` | 선택 | 서버 전용. 운영자 이메일 알림 시 설정 조회(없으면 이메일만 생략) |
| `OPENAI_API_KEY` | AI 사용 시 필수 | `/api/ai/*` |
| `OPENAI_MODEL_INQUIRY_STRUCTURE` | AI 사용 시 필수 | 문의 구조화 → 기본 `gpt-5.4-nano` (`.env.example` 참고) |
| `OPENAI_MODEL_INQUIRY_ANALYZE` | 선택 | 문의 트리아지·다음 액션(미설정 시 공용 `OPENAI_MODEL`) |
| `OPENAI_MODEL_COLLECTION_ADVICE` | 선택 | 청구 추심·리마인드 추천(미설정 시 공용 `OPENAI_MODEL`) |
| `OPENAI_MODEL_COMPOSE_MESSAGE` | AI 사용 시 필수 | 발송·리마인드 문구 → 기본 `gpt-5.4-nano` |
| `OPENAI_MODEL_QUOTE_DRAFT` | AI 사용 시 필수 | 견적 초안 → 기본 `gpt-5.4-mini` |
| `OPENAI_MODEL_FALLBACK` | 선택 | 견적 초안 실패 시 재시도 모델 (`OPENAI_QUOTE_DRAFT_FALLBACK=true`일 때) |
| `OPENAI_MAX_OUTPUT_TOKENS_*` | 선택 | 기능별 출력 토큰 상한 |
| `OPENAI_QUOTE_DRAFT_FALLBACK` | 선택 | `true`면 초안 API가 실패 시 fallback 모델 1회 재시도 |
| `ENABLE_DEMO_LOGIN` | 선택 | 데모 로그인 허용 (아래 표 참고) |
| `DEMO_LOGIN_EMAIL` / `DEMO_LOGIN_PASSWORD` | 선택 | 데모 전용 |
| `NEXT_PUBLIC_APP_NAME` | 선택 | 표시용 이름 |
| `NEXT_PUBLIC_CONTACT_EMAIL` | 선택 | `/billing` Business 맞춤 견적 문의 |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | 권장 | 고객센터 헤더·도움말에 노출할 지원 메일 (`src/lib/billing/catalog.ts`의 `SUPPORT_EMAIL_ENV`) |

전체 예시와 주석: **`.env.example`**

### OpenAI: 기능별 모델 (비용·품질 분리)

| API | 환경 변수 | 권장 기본값(예시) | 역할 |
|-----|-----------|-------------------|------|
| `/api/ai/inquiry-structure` | `OPENAI_MODEL_INQUIRY_STRUCTURE` | `gpt-5.4-nano` | 짧은 구조화·채널·요약 |
| `/api/ai/inquiry-analyze` | `OPENAI_MODEL_INQUIRY_ANALYZE` | `gpt-5.4-nano` | 문의 유형·긴급도·다음 액션·추천 질문(JSON 저장) |
| `/api/ai/customer-insight` | *(동일 스택)* | 위와 동일 키 재사용 | 고객 이력 요약 인사이트 |
| `/api/ai/collection-advice` | `OPENAI_MODEL_COLLECTION_ADVICE` | `gpt-5.4-nano` | 청구 상태 기반 추천 액션·문구 초안 |
| `/api/ai/compose-message` | `OPENAI_MODEL_COMPOSE_MESSAGE` | `gpt-5.4-nano` | 발송·청구·리마인드 문구(종류 확장) |
| `/api/ai/quote-draft` | `OPENAI_MODEL_QUOTE_DRAFT` | `gpt-5.4-mini` | 견적 초안(기본·옵션 항목·납기·업종 유의) |

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
5. `0004_user_plan.sql` — `users.plan` (레거시 `free` → 마이그레이션 0014에서 `starter` 등으로 정리)  
6. `0005_business_registration_number.sql` — 사업자등록번호 컬럼·공유 견적 RPC  
7. `0006_invoice_public_share_and_link_opens.sql` — 공개 청구 토큰·열람 카운트·`get_invoice_share_payload`·열람 시 활동 로그  
8. `0007_public_inquiry_form.sql` — 공개 문의 폼·`submit_public_inquiry`  
9. `0008_notifications.sql` — `notifications` / `notification_preferences`, 문의 INSERT 시 알림, Realtime  
10. `0009_business_public_landing.sql` — Pro 전용 업체 소개 랜딩(`business_public_pages`, `get_public_business_landing`, 문의 유입 `source`/`sourceSlug`)
11. `0012_tax_invoice_asp.sql` — 청구 연동 전자세금계산서(`tax_invoices`)·ASP 설정(`business_settings`)·고객/청구 세금 필드  
12. `0013_inquiry_ai_analysis.sql` — 문의 AI 트리아지 저장(`inquiries.ai_analysis`, `ai_analysis_updated_at`)  
13. `0014_saas_plans_trial_usage_support.sql` — **Starter / Pro / Business** 플랜, **7일 체험**(`trial_ends_at`, `subscription_status`), 월별 **AI·문서 발송 사용량**, `billing_events`, **고객센터 티켓**(`support_tickets`), `bump_user_usage` RPC

`0003_rls` 미적용 시 보안 공격면이 남습니다. `0004`·`0014` 미적용 시 앱은 동작하지만 설정에 **플랜·구독 컬럼 안내**가 표시되고, 체험·사용량·빌링 이벤트·지원 티켓이 제한될 수 있습니다. **공개 청구 링크·열람 추적**은 **0006** 이 필요합니다. **앱 내·브라우저·이메일 알림**은 **0008** 과 Supabase Realtime(`notifications`) 전제를 확인하세요. 상세는 **[docs/deployment.md §4.1](./docs/deployment.md#41-알림실시간브라우저이메일)**.

---

## 전자세금계산서(ASP 연동) — 요약

- Bill-IO는 **국세청 직접 송신 제품이 아닙니다.** 사용자가 계약한 **전자세금계산서 발급대행(ASP)** 자격증명을 설정에 저장하고, **청구 상세**에서 발행 준비·실행·상태 새로고침을 합니다.
- **Business 플랜**(`e_tax_invoice_asp`)에서 사용합니다. 자격증명은 `business_settings.tax_invoice_provider_config`(JSONB)에 저장되며, 운영 시 **암호화·Vault** 적용을 권장합니다.
- **Provider 추가**: `src/lib/tax-invoice/registry.ts`에 어댑터를 등록하고, `src/lib/tax-invoice/providers/`에 `TaxInvoiceProviderAdapter` 구현체를 둡니다. Mock 구현은 `providers/mock-provider.ts`를 참고하세요.
- **상태**: `draft` → `ready`(발행 준비) → `issuing` → `issued` / `failed`. 실패 시 `failure_reason`과 활동 로그(`tax_invoice.*`)를 확인합니다.

---

## 운영자 알림 (요약)

- **앱**: 로그인 후 헤더 종 아이콘 — 미읽음 배지, 목록, 읽음/모두 읽음, **설정 → 알림 설정**에서 채널 on/off.  
- **브라우저**: Web Notification 권한은 종 메뉴에서 요청(강제하지 않음).  
- **이메일**: 공개 문의 접수 시 Resend로 운영자 메일( **`RESEND_API_KEY`**, **`RESEND_FROM`** 또는 **`RESEND_FROM_EMAIL`**, 선택 **`SUPABASE_SERVICE_ROLE_KEY`** ). 실패해도 문의 저장·앱 알림은 계속됩니다.  
- **문의로 이동**: 알림 클릭 시 `/inquiries?focus=<id>` 로 열리며 해당 문의가 강조됩니다.

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

## 요금제·7일 체험·구독·고객센터 (운영 구조)

- **플랜**: Starter / Pro / Business — 가격·카피는 `src/lib/billing/catalog.ts`, 기능 게이트는 `src/lib/plan-features.ts`, 월 한도(AI 호출 수·문서 이메일 발송·포털 인원·좌석)는 `src/lib/subscription.ts`의 `PLAN_USAGE_LIMITS`와 DB `users` 사용량 컬럼(마이그레이션 **0014**).
- **7일 체험**: 가입 시 `subscription_status=trialing`, `trial_ends_at` 기준으로 **기능·한도는 Pro 수준**(`getEffectiveBillingPlan`). 만료 시 `trial_expired`로 전환되며 Starter 기준으로 동작( `fetchUserBillingState` ).
- **구독 UI**: `/billing` — 플랜 선택·해지 예약·다운그레이드 예약·사용량·이벤트 타임라인. PG 연동 시 `users.current_period_end`, `stripe_customer_id` 등을 웹훅으로 채우는 확장점이 마련되어 있습니다(`append_billing_event` RPC).
- **문서 발송 사용량**: 견적·청구 **이메일 발송 성공** 시 서버 액션에서 `bump_user_usage('document_send')` 호출.
- **고객센터**: `/help` (FAQ, 공지, 가이드, 문의 `/help/contact`) — 문의는 `support_tickets`에 저장(RLS). 지원 메일 노출: 환경변수 **`NEXT_PUBLIC_SUPPORT_EMAIL`**.
- **콘텐츠 초안**: `src/content/help-center.ts`.

## 현재 제품 범위 요약

**포함**: 회원가입·이메일 인증, 고객·문의·견적·청구, 견적·청구 공개 링크·인쇄/PDF, **Resend 견적·청구 메일**, **OpenAI 보조**(초안·문의 구조화·문구), 리마인드, 설정·직인, 플랜(`starter`/`pro`/`business`)·**7일 체험·사용량**, **Pro·Business 업체 소개 공개 랜딩** (`/biz/[slug]`, 설정 → 업체 소개 페이지, AI 초안, 공개 문의 CTA·유입 추적), **`/billing` 구독 콘솔**, **`/help` 고객센터**, **승인 견적 → `/invoices?quote={id}&new=1` 청구 초안**(선금·잔금 자동 제안), **운영 딥링크** (`/customers?customer=…`·`?new=1`, `/invoices?customer=…` 고객 필터 등), **공개 문의 폼 자동 접수**(기존 `/request/[token]`·활동 로그), **Pro·Business BYOA 카카오 알림톡**(설정 → 메시지 채널 연결, 사용자 HTTPS 프록시로 `BillIoMessagingPayloadV1` POST, 발송 로그·견적/청구 발송 모달), **고객 미니 포털** (`/c/[token]`, 플랜별 인원 한도, RPC `get_customer_portal_payload`), **Business 전자세금계산서 ASP**, **청구 추심 보조**(입금 약속일·다음 연락일·톤, drawer·편집 폼), **문의·청구 달력형 보조 뷰**(리스트 기본 유지 + 일정/기한 중심 월간 캘린더, 대시보드 일정 요약, 견적 유효기한 보조 요약).

**미포함**: Bill-IO 자체 알림톡 과금/충전, **실제 PG(카드) 자동결제**(구조만 준비), 자동 청구서 발행, 회계·팀 좌석 본격 지원 등 — 플랜 게이트는 `src/lib/plan-features.ts` / `src/lib/billing/catalog.ts` 에서 확장합니다.

**DB**: `supabase/migrations/0010_messaging_portal_collections.sql` — 메시징 설정·발송 로그, `customers.portal_token`, 청구 추심 컬럼, 포털 RPC.

---

## 라이선스

비공개 프로젝트로 가정합니다. 필요 시 별도 명시하세요.

---

## Billing launch notes

- Plans now map to real subscription state: `starter`, `pro`, and `business` are resolved from `users.plan` plus billing status.
- Trial flow: every new account starts in `trialing`, and automatic billing continues after checkout if a payment method is saved before trial end.
- Billing status flow: `trialing`, `active`, `past_due`, `canceled`, `incomplete`, `pending`, and `trial_expired`.
- Billing provider abstraction lives under `src/lib/billing/` and currently supports `mock` and `stripe`.
- Webhook processing is handled by `/api/billing/webhook`, with duplicate protection in `billing_webhook_events`.
- Billing events are stored in `billing_events`; product activity stays in `activity_logs`.

## document_send policy

- `document_send` counts actual delivery behavior, not internal preview.
- Counted actions: email send, share link copy/share, PDF download / print-to-PDF, and BYOA message send.
- Count events are deduplicated through `document_send_events` and the `record_document_send` RPC.
- PDF download is included because export/save behavior is treated as real document delivery or retention activity.

## Billing environment

- Add the billing variables from `.env.example`.
- For Stripe mode, configure:
  - `BILLING_PROVIDER=stripe`
  - `BILLING_MODE=test` or `live`
  - `BILLING_STRIPE_SECRET_KEY`
  - `BILLING_STRIPE_WEBHOOK_SECRET`
  - `BILLING_STRIPE_PRICE_STARTER_MONTHLY`
  - `BILLING_STRIPE_PRICE_PRO_MONTHLY`
  - `BILLING_STRIPE_PRICE_BUSINESS_MONTHLY`
