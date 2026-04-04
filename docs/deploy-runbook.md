# FlowBill MVP — 실전 배포 실행 순서 (Runbook)

이 문서는 **지금 바로 따라만 하면 되는** 순서입니다. 세부 설명은 [deployment.md](./deployment.md) · [README.md](../README.md)와 맞춰 두었습니다.

---

## 1. 배포 전 준비물

- [ ] 이 프로젝트가 올라간 **GitHub(또는 Vercel이 지원하는 Git) 저장소** URL
- [ ] **Supabase** 계정 (새 프로젝트를 만들지·기존 것을 쓸지 결정)
- [ ] **Vercel** 계정
- [ ] 베타에서 쓸 **테스트용 이메일 주소**(로그인용; 앱에 회원가입 화면 없음)
- [ ] 로컬에 클론된 저장소에서 `supabase/migrations/` 아래 **3개 SQL 파일** 접근 가능
  - `0001_mvp_schema.sql`
  - `0002_phase2_foundation.sql`
  - `0003_rls_tenant_fk_enforcement.sql`

---

## 2. Supabase 세팅 순서

### 2-1. 프로젝트

- [ ] [Supabase](https://supabase.com) 대시보드에서 **새 프로젝트 생성**(또는 기존 프로젝트 선택)
- [ ] 프로젝트가 **Active** 될 때까지 대기

### 2-2. SQL 마이그레이션 (순서 고정)

Supabase **SQL Editor** → New query → 파일 내용을 **붙여넣기 → Run** 을 **아래 순서만** 수행합니다.

- [ ] **1번째**: `supabase/migrations/0001_mvp_schema.sql` 전체 실행 → 성공 확인
- [ ] **2번째**: `supabase/migrations/0002_phase2_foundation.sql` 전체 실행 → 성공 확인
- [ ] **3번째**: `supabase/migrations/0003_rls_tenant_fk_enforcement.sql` 전체 실행 → 성공 확인

### 2-3. 적용 후 확인

- [ ] **Table Editor**에 `users`, `customers`, `inquiries`, `quotes`, `invoices` 등 테이블이 보이는지 확인
- [ ] (선택) SQL Editor에서 오류 없이 끝났는지 다시 한 번 확인 — **0003을 빼먹지 않았는지** 특히 확인

### 2-4. Auth 설정 위치

- [ ] 왼쪽 메뉴 **Authentication** → **Providers** (또는 Sign In / Providers)
- [ ] **Email** 로그인이 사용 가능한지 확인(기본 켜져 있는 경우 많음)

### 2-5. Site URL / Redirect URL

**위치**: **Authentication** → **URL Configuration** (이름은 대시보드 버전에 따라 *URL Configuration* 또는 *Settings* 근처)

- [ ] **Site URL**: 나중에 쓸 **Vercel Production URL**을 넣습니다.  
  - 예: `https://여기에-프로젝트명.vercel.app`  
  - 아직 Vercel URL을 모르면 **첫 배포 후** 다시 와서 수정해도 됩니다(반드시 맞춰야 로그인이 안정적).
- [ ] **Redirect URLs**에 아래를 **추가**(한 줄씩 또는 Supabase가 허용하는 형식으로):
  - Production: `https://여기에-실제-vercel-도메인.vercel.app` (및 필요 시 `/**` 패턴이 지원되면 동일 도메인 와일드카드)
  - 로컬 테스트용: `http://localhost:3000` (선택)

### 2-6. 테스트 계정 준비

이 앱에는 **회원가입 페이지가 없습니다.**

- [ ] **Authentication** → **Users** → **Add user** / **Invite** 등으로 베타용 사용자 생성  
  - 이메일·비밀번호를 정해 두고 **메모**해 둡니다.
- [ ] 이메일 확인이 켜져 있으면, Supabase 설정에 맞게 **인증 메일 처리** 또는 대시보드에서 확인 완료 처리

### 2-7. API 키 복사 (Vercel에 넣을 값)

- [ ] **Project Settings** → **API**
- [ ] **Project URL** 복사 → Vercel의 `NEXT_PUBLIC_SUPABASE_URL`에 넣을 값
- [ ] **anon** / **public** 키 복사 → Vercel의 `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 넣을 값  
  - **service_role 키는 복사하지 마세요.** (이 프로젝트는 anon + RLS만 사용)

---

## 3. Vercel 세팅 순서

### 3-1. 저장소 연결

- [ ] [Vercel](https://vercel.com) 로그인 → **Add New… → Project**
- [ ] **Import**에서 위에서 쓰는 **GitHub 저장소** 선택

### 3-2. 프로젝트 설정 확인

- [ ] **Framework Preset**: `Next.js`
- [ ] **Root Directory**: 비어 있음(저장소 루트가 앱 루트)
- [ ] **Build Command**: `npm run build` (기본값 유지)
- [ ] **Install Command**: 기본(`npm install` 등) 유지

### 3-3. 환경 변수 입력

**Settings → Environment Variables** (또는 Import 마법사의 Environment Variables 단계)

필수(비공개 베타 Production 기준):

- [ ] `NEXT_PUBLIC_SUPABASE_URL` = Supabase Project URL  
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase **anon public** 키  

환경 범위 선택 시:

- [ ] **Production**에 위 두 개 **반드시** 입력
- [ ] Preview 배포도 쓸 계획이면 **Preview**에도 **동일하게** 입력 (Preview만 넣고 Production 비우지 않기)

선택·주의:

- [ ] 비공개 베타 Production에서 **데모 로그인을 쓰지 않을** 경우: `ENABLE_DEMO_LOGIN`은 **아예 안 넣거나** `false`
- [ ] Preview에서만 데모를 켤 경우: `ENABLE_DEMO_LOGIN=true` 는 **Preview에만** 넣기
- [ ] `DEMO_LOGIN_*` 는 데모를 켤 때만 의미 있음

### 3-4. Production / Preview 주의

- [ ] **NODE_ENV**는 Vercel이 빌드 시 `production`으로 둡니다. `ENABLE_DEMO_LOGIN`을 안 넣으면 **프로덕션에서 데모는 기본 꺼짐** (`src/lib/demo-flags.ts`).
- [ ] **Production과 Preview 둘 다** 실제로 쓸 거면 **둘 다** `NEXT_PUBLIC_SUPABASE_*` 가 있는지 확인

### 3-5. 첫 배포 실행

- [ ] **Deploy** 클릭
- [ ] 빌드 로그에서 **Build Successful** 확인
- [ ] **Deployments**에서 **Production URL** 복사 (예: `https://xxx.vercel.app`)

### 3-6. 배포 후 Supabase URL 다시 맞추기

- [ ] **Supabase → Authentication → URL Configuration**으로 돌아가기
- [ ] **Site URL**을 위 Production URL로 수정(처음에 placeholder였다면)
- [ ] **Redirect URLs**에 Production URL 추가·저장

---

## 4. 배포 후 스모크 테스트 순서

**Production URL**을 브라우저에서 열고, 아래를 **위에서부터** 진행합니다.

- [ ] **로그인** — 2-6에서 만든 계정으로 `/login`에서 로그인 → 대시보드 진입
- [ ] **문의 생성** — `/inquiries`에서 문의 등록 → 목록에 보임
- [ ] **견적 생성** — `/quotes`에서 견적 생성 → 목록에 보임
- [ ] **청구 생성** — `/invoices`에서 청구 생성 → 목록에 보임
- [ ] **결제 상태 변경** — 청구 카드에서 결제 상태 드롭다운 변경 → 반영 확인
- [ ] **리마인드 기록** — 같은 청구 카드에서 리마인드 저장 → 이력 표시 확인
- [ ] **설정 저장** — `/settings`에서 저장 → 새로고침 후 유지 확인
- [ ] **검색/필터** — 문의 검색창, 고객 검색, 견적 상태 필터, 청구 필터 중 1개 이상 동작 확인
- [ ] **고객 타임라인** — `/customers` → 고객 상세 → 타임라인에 활동이 쌓이는지 확인

더 촘촘한 체크는 [beta-qa-checklist.md](./beta-qa-checklist.md)를 이어서 사용합니다.

---

## 5. 실패 시 가장 먼저 볼 체크포인트

아래를 **위에서부터** 다시 확인합니다.

1. [ ] Supabase SQL **`0001` → `0002` → `0003`** 세 개 **모두** 성공했는가 (0003 누락이 흔함)
2. [ ] Vercel **Production**에 `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` 가 **들어가 있는가** (Preview만 넣고 Production 비운 실수)
3. [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`가 **anon public** 이지 **service_role** 이 아닌가
4. [ ] Supabase **Site URL**·**Redirect URLs**에 **실제 Vercel Production URL**이 들어가 있는가 (localhost만 있으면 실패)
5. [ ] Production에 **`ENABLE_DEMO_LOGIN=true`를 실수로 넣지 않았는가** (데모를 원하지 않을 때)
6. [ ] 테스트 사용자가 Supabase **Authentication → Users**에 있고 비밀번호가 맞는가 (앱에 가입 UI 없음)

그 다음: [deployment.md](./deployment.md) §7 **자주 발생할 수 있는 실수** 참고.

---

## 부록 — 실수하기 쉬운 부분 (요약)

| 실수 | 결과 |
|------|------|
| migration **0003** 누락 | RLS가 약해질 수 있음 → 반드시 3개 순서 적용 |
| **service_role**를 `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 넣음 | RLS 우회·유출 시 치명적 → **anon public**만 |
| **Site URL / Redirect URL**이 Vercel URL과 불일치 | 로그인 후 리다이렉트·세션 이상 |
| Production에 **`ENABLE_DEMO_LOGIN=true`** | 데모 계정·데모 데이터 노출 가능 |
| env를 **Preview에만** 넣음 | Production 접속 시 로그인/데이터 불가 |

---

## 문서 맵

| 문서 | 용도 |
|------|------|
| [deploy-runbook.md](./deploy-runbook.md) (이 파일) | **실행 순서** 한 번에 따라가기 |
| [deployment.md](./deployment.md) | 상세·배경·RC 체크·코드 기준 참조 |
| [beta-qa-checklist.md](./beta-qa-checklist.md) | 배포 직후 운영 스모크 체크박스 |
| [README.md](../README.md) | 로컬 실행·환경변수 표·MVP 범위 |
