# 운영 계정 기준 E2E 체크리스트 (출시 마감용)

**목적**: 실제 프로덕션 URL·Supabase·Vercel 환경에서 아래를 **순서대로** 한 번에 통과하는지 검증합니다.  
**전제**: [deployment.md](./deployment.md) 마이그레이션·환경 변수·Auth URL 적용 완료, `RESEND_API_KEY`·`OPENAI_API_KEY`·기능별 `OPENAI_MODEL_*` 설정(해당 기능 사용 시).

---

## 사전 확인 (운영자)

- [ ] Supabase 마이그레이션: `0001` → `0002` → `0003_rls_tenant_fk_enforcement.sql` → `0003_quote_seal_share_document.sql` → `0004_user_plan.sql` 적용
- [ ] Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`(권장)
- [ ] Vercel: `RESEND_API_KEY` (+ 권장 `RESEND_FROM`)
- [ ] Vercel: `OPENAI_API_KEY` + `OPENAI_MODEL_INQUIRY_STRUCTURE` + `OPENAI_MODEL_COMPOSE_MESSAGE` + `OPENAI_MODEL_QUOTE_DRAFT` (+ 선택 `OPENAI_MODEL_FALLBACK` / `OPENAI_QUOTE_DRAFT_FALLBACK`)
- [ ] Supabase Auth: Redirect URLs에 `{SITE_URL}/auth/callback`, `{SITE_URL}/reset-password`

---

## 사용자 흐름 (체크박스)

- [ ] **1. 회원가입** — `/signup`에서 신규 이메일로 가입 제출
- [ ] **2. 이메일 인증** — 수신 메일의 링크로 인증 완료 (스패함 확인)
- [ ] **3. 로그인** — `/login`에서 동일 계정으로 로그인 → 대시보드
- [ ] **4. 고객 생성** — `/customers`에서 고객 1명 저장
- [ ] **5. 문의 등록** — `/inquiries`에서 문의 저장
- [ ] **6. AI 문의 구조화** — 문의 폼에서 원문 입력 후 **AI로 필드 채우기** → 필드 반영 확인
- [ ] **7. AI 견적 초안** — `/quotes`에서 **견적 초안 도우미** → **AI로 초안 생성** → **이 초안으로 견적 작성**
- [ ] **8. 견적 생성** — 견적 저장 후 목록·상세 확인
- [ ] **9. 견적서 PDF** — 인쇄/PDF 페이지 열기(브라우저 PDF 저장)
- [ ] **10. 견적 이메일 발송** — 견적 **보내기**에서 수신 메일 입력 후 발송 → 수신함 확인(또는 Resend 로그)
- [ ] **11. 청구 생성** — `/invoices`에서 청구 저장
- [ ] **12. 청구 상태 변경** — 목록 또는 상세에서 결제 상태 변경
- [ ] **13. 리마인드** — 리마인드 모달에서 **AI로 메시지**(선택) 후 저장 → 이력 표시
- [ ] **14. 비밀번호 재설정** — 로그아웃 → `/forgot-password` → 메일 링크 → `/reset-password`에서 새 비밀번호 → `/login` 재로그인

---

## 실패 시

- [operations-errors.md](./operations-errors.md) 표를 먼저 확인합니다.
