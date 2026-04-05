# 운영자용 — 사용자에게 보이는 오류·원인 대응

Bill-IO에서 자주 나오는 **사용자 안내 문구**와 **먼저 확인할 설정**입니다.

| 증상(사용자에게 보이는 뉘앙스) | 원인 후보 | 조치 |
|--------------------------------|-----------|------|
| 견적 메일이 안 감 / “Resend가 설정되지 않았습니다” | `RESEND_API_KEY` 없음 | Vercel(또는 서버)에 `RESEND_API_KEY` 추가 후 재배포 |
| 메일 전송 403·422 | 발신 도메인 미인증 | Resend에서 도메인 인증 후 `RESEND_FROM`에 해당 주소 설정 |
| AI 버튼이 503 | `OPENAI_API_KEY` 없음 | 서버 환경 변수에 키 추가 |
| AI가 “모델이 설정되지 않았습니다” | 기능별 `OPENAI_MODEL_*` 누락 | `OPENAI_MODEL_INQUIRY_STRUCTURE` / `OPENAI_MODEL_COMPOSE_MESSAGE` / `OPENAI_MODEL_QUOTE_DRAFT` 각각 설정 후 재배포 |
| AI가 자꾸 실패·502 | 모델 한도·키 오류·모델명 오타 | OpenAI 대시보드·과금·위 세 변수·(초안 fallback 시) `OPENAI_MODEL_FALLBACK` 확인 |
| AI가 “너무 오래 걸렸습니다” | 지연·타임아웃 | `OPENAI_TIMEOUT_MS` 조정 또는 재시도 안내 |
| 설정에 “플랜 컬럼 미적용” 노란 박스 | `users.plan` 없음 | `supabase/migrations/0004_user_plan.sql` 실행 |
| 비밀번호 재설정 링크 무효·만료 | 링크 재사용·시간 초과 | `/forgot-password`에서 메일 재요청 |
| 인증 메일 링크 오류 | Redirect URL 누락 | Supabase에 `{SITE_URL}/auth/callback` 등록 |
| 재설정 후 로그인만 됨 | `redirectTo` 불일치 | `{SITE_URL}/reset-password` 가 Redirect URLs에 있는지 확인 |
| 로그인 직후 튕김 | `NEXT_PUBLIC_SITE_URL` 불일치 | 프로덕션 도메인과 Supabase Site URL 정렬 |

코드 참조: `src/lib/action-errors.ts`, `src/lib/send-resend.ts`, `src/lib/user-plan.ts`, `src/lib/site-url.ts`.
