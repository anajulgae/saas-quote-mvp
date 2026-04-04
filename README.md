# FlowBill AI (SaaS Quote MVP)

국내 1인 사업자용 **문의 · 견적 · 청구 · 수금** 관리 MVP입니다. Next.js App Router, TypeScript, Tailwind, Supabase를 사용합니다.

**실전 배포 실행 순서(체크리스트)**: **[docs/deploy-runbook.md](./docs/deploy-runbook.md)**  
**배포 상세 가이드**(환경변수·Auth URL·마이그레이션·데모·RC·흔한 실수): **[docs/deployment.md](./docs/deployment.md)**  
**비공개 베타 운영**(이벤트 로그 확인·피드백·즉시 대응 신호): **[docs/beta-operations.md](./docs/beta-operations.md)**  
**외부 점검용 공개 데모**(운영 DB와 분리·켜기/끄기): **[docs/public-demo.md](./docs/public-demo.md)**

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
| `ENABLE_DEMO_LOGIN` | 선택 | 데모 로그인·데모 쿠키 허용 여부 (아래 표 참고) |
| `DEMO_LOGIN_EMAIL` | 선택 | 데모 계정 이메일 |
| `DEMO_LOGIN_PASSWORD` | 선택 | 데모 비밀번호. **프로덕션에서 데모 허용 시 16자 이상 필수** (`docs/public-demo.md`) |
| `NEXT_PUBLIC_APP_NAME` | 선택 | 표시용 이름 |

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
4. **Authentication → Providers**에서 Email 등 필요한 로그인 방식을 켭니다.  
   - 앱 내 **회원가입 UI는 없음** → Supabase 대시보드에서 사용자 초대 또는 Auth 정책에 맞는 가입 경로를 사용합니다.

---

## 데이터베이스 마이그레이션 (순서 고정)

**반드시 아래 순서대로** SQL Editor에서 실행하거나, CLI로 동일 순서를 적용하세요.

1. `supabase/migrations/0001_mvp_schema.sql` — 스키마 + 초기 RLS  
2. `supabase/migrations/0002_phase2_foundation.sql` — 트리거·인덱스 등  
3. `supabase/migrations/0003_rls_tenant_fk_enforcement.sql` — **테넌트 간 FK 정합성 RLS 보강**

`0003`을 빼면 `user_id`만 맞추고 **타인의 `customer_id` 등을 끼워 넣는** 공격면이 남을 수 있습니다. 비공개 베타 전 **`0003`까지 적용 완료**를 확인하세요.

---

## Vercel 배포 및 환경 변수

1. Git 저장소를 Vercel에 연결해 프로젝트를 Import 합니다.
2. **Settings → Environment Variables**에서 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 추가합니다.  
   - **Production** / **Preview** / **Development** 탭별로 같은 키를 넣을지, Preview만 데모용 변수를 넣을지 구분할 수 있습니다.
3. 배포 후 Production URL로 접속해 로그인·저장 동작을 확인합니다.
4. 프로덕션에서 데모를 쓰지 않을 경우 **`ENABLE_DEMO_LOGIN`을 비우거나 `false`** 로 둡니다.

---

## Supabase Auth — Site URL / Redirect URL

배포 도메인에서 로그인 후 리다이렉트가 깨지지 않도록 설정합니다.

1. Supabase **Authentication → URL Configuration**
2. **Site URL**: 프로덕션 기본 URL (예: `https://your-app.vercel.app`)
3. **Redirect URLs**: 위 URL과 필요 시 `http://localhost:3000` (로컬 테스트용) 등 허용 목록에 추가

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

**배포 직후 약 10분 스모크**: **[docs/beta-qa-checklist.md](./docs/beta-qa-checklist.md)**  
(Vercel 배포 직후 **최우선 5개** + 전체 체크박스 목록)

요약:

- [ ] 위 문서의 **최우선 5개** 완료  
- [ ] 동일 문서 **전체 체크리스트**(로그인·데모 비활성·권한·CRUD·타임라인·설정·검색/필터·오류 메시지) 완료  

---

## 배포 전 최종 체크포인트 (RC — 사람이 꼭 확인)

- [ ] Supabase SQL **`0001_mvp_schema.sql` → `0002_phase2_foundation.sql` → `0003_rls_tenant_fk_enforcement.sql`** 순서로 **전부** 적용됨  
- [ ] Vercel **Production**(및 사용 중인 Preview)에 **`NEXT_PUBLIC_SUPABASE_URL`**, **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** 입력됨 · **service_role** 은 어디에도 `NEXT_PUBLIC_` 로 넣지 않음  
- [ ] Supabase **Authentication → URL Configuration**: **Site URL**·**Redirect URLs**에 실제 Vercel URL(및 필요 시 localhost) 반영됨  
- [ ] **Production**에서 데모 로그인 비활성: **`ENABLE_DEMO_LOGIN` 미설정 또는 `false`** (데모가 필요 없을 때)  
- [ ] **첫 베타 테스트 계정**으로 프로덕션 URL에서 **로그인** 성공  
- [ ] 핵심 흐름 **문의 → 견적 → 청구 → 결제/상태 변경 → 리마인드** 한 사이클 수동 확인  
- [ ] `npm run build` 로컬 통과  
- [ ] [docs/beta-qa-checklist.md](./docs/beta-qa-checklist.md) 운영자용 10분 스모크 수행  

상세 배포 절차: [docs/deployment.md](./docs/deployment.md)

---

## 현재 MVP 범위 및 비범위

**포함**: 고객, 문의, 견적(항목·상태), 청구(결제 상태), 리마인드 기록, 설정·템플릿, 대시보드, 활동 로그 타임라인, 검색·필터.

**미포함**: AI API, PDF, 공유 고도화, 실제 이메일/SMS 발송, 회계·캘린더·팀 기능 등.

---

## 라이선스

비공개 프로젝트로 가정합니다. 필요 시 별도 명시하세요.
