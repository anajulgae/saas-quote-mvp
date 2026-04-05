# 운영 계정 기준 E2E 체크리스트 (출시 마감용)

**목적**: 실제 프로덕션 URL·Supabase·Vercel 환경에서 아래를 **순서대로** 한 번에 통과하는지 검증합니다.  
**전제**: [deployment.md](./deployment.md) 마이그레이션·환경 변수·Auth URL 적용 완료, `RESEND_API_KEY`·`OPENAI_API_KEY`·기능별 `OPENAI_MODEL_*` 설정(해당 기능 사용 시).

---

## 사전 확인 (운영자)

- [ ] Supabase 마이그레이션 **순서대로 전부**: `0001` → `0002` → `0003_rls_tenant_fk_enforcement.sql` → `0003_quote_seal_share_document.sql` → `0004_user_plan.sql` → `0005_business_registration_number.sql` → `0006_invoice_public_share_and_link_opens.sql`
- [ ] Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`(권장)
- [ ] Vercel: `RESEND_API_KEY` (+ 권장 `RESEND_FROM`) — **견적·청구** 메일
- [ ] Vercel: `OPENAI_API_KEY` + `OPENAI_MODEL_INQUIRY_STRUCTURE` + `OPENAI_MODEL_COMPOSE_MESSAGE` + `OPENAI_MODEL_QUOTE_DRAFT` (+ 선택 `OPENAI_MODEL_FALLBACK` / `OPENAI_QUOTE_DRAFT_FALLBACK`)
- [ ] Supabase Auth: Redirect URLs에 `{SITE_URL}/auth/callback`, `{SITE_URL}/reset-password`
- [ ] (선택) 설정 화면에서 **직인** 업로드·사용 여부 확인 — 공개 견적/청구·인쇄에 반영되는지

---

## 사용자 흐름 (체크박스)

- [ ] **1. 회원가입** — `/signup`에서 신규 이메일로 가입 제출
- [ ] **2. 이메일 인증** — 수신 메일의 링크로 인증 완료 (스팸함 확인)
- [ ] **3. 로그인** — `/login`에서 동일 계정으로 로그인 → 대시보드
- [ ] **4. 고객 생성** — `/customers`에서 고객 1명 저장 (또는 `/customers?new=1` 딥링크로 등록창 확인)
- [ ] **5. 고객 딥링크** — `/customers?customer={고객ID}` 로 접속 시 해당 고객 drawer가 열리는지
- [ ] **6. 문의 등록** — `/inquiries`에서 문의 저장 (`/inquiries?customer=…&new=1` 고객 고정 생성 확인)
- [ ] **7. AI 문의 구조화** — 문의 폼에서 원문 입력 후 **AI로 필드 채우기** → 필드 반영 후 저장
- [ ] **8. AI 견적 초안** — `/quotes`에서 **견적 초안 도우미** → **AI로 초안 생성** → **이 초안으로 견적 작성** → 견적 작성 모달에 반영되는지
- [ ] **9. 견적 생성** — 견적 저장 후 목록·상세(drawer) 확인
- [ ] **10. 견적서 PDF** — 인쇄/PDF 페이지 열기(브라우저 PDF 저장)
- [ ] **11. 공개 견적 링크** — 견적 **보내기**에서 링크 복사 또는 메일 발송 후 `/quote-view/{token}` 열람(로그아웃 상태)
- [ ] **12. 견적 이메일 발송** — **보내기**에서 수신 메일 입력 후 발송 → 수신함 또는 Resend 로그
- [ ] **13. 견적 승인 → 청구** — 견적 상태 **승인** 후 drawer **청구 만들기** → `/invoices?quote=…&new=1` 로 청구 작성창·선금/잔금 제안 확인
- [ ] **14. 청구 생성·필터** — 청구 저장, `/invoices?customer={고객ID}` 로 고객 필터 적용되는지
- [ ] **15. 공개 청구 링크** — 청구 **발송**에서 링크 준비 후 `/invoice-view/{token}` 열람(로그아웃 상태)
- [ ] **16. 청구 PDF·이메일** — 청구 인쇄/PDF 페이지, **발송**에서 메일 발송
- [ ] **17. 청구 상태 변경** — 목록 또는 drawer에서 결제 상태 변경
- [ ] **18. 리마인드** — 리마인드 모달에서 **AI로 메시지**(선택) 후 저장 → 이력 표시
- [ ] **19. 비밀번호 재설정** — 로그아웃 → `/forgot-password` → 메일 링크 → `/reset-password`에서 새 비밀번호 → `/login` 재로그인
- [ ] **20. 활동·타임라인** — 고객 상세 또는 견적/청구 drawer에서 발송·링크 복사·(첫) 열람 로그가 쌓이는지

---

## 실패 시

- [operations-errors.md](./operations-errors.md) 표를 먼저 확인합니다.
