# Bill-IO 작업 이어하기 (알림 시스템)

**마지막 정리일:** 2026-04-02  
**저장소 루트:** 이 파일과 동일 프로젝트 (`saas-quote-mvp`)

새 Cursor 채팅을 열었을 때 **이 파일을 먼저 `@docs/CONTINUATION_HANDOFF.md` 로 첨부**하거나, 아래 **「새 채팅 첫 메시지 예시」**를 복사해 붙이면 이어서 작업할 수 있습니다.

---

## 1. 이번 브랜치/주제에서 끝난 것

- [x] **DB** — `notifications`, `notification_preferences`, 문의 INSERT 후 운영자용 `new_inquiry` 알림 트리거, `dedupe_key` 기반 중복 방지, Realtime용 `notifications` 반영 시도  
- [x] **공개 문의** — `0007_public_inquiry_form.sql` + `0008_notifications.sql` 순서로 적용 전제 (`submit_public_inquiry` 응답에 `ownerUserId` 등)  
- [x] **앱 내 알림 센터** — 헤더 종 아이콘, 미읽음 배지, 목록 drawer/패널, 읽음·모두 읽음, Realtime INSERT 구독, 토스트  
- [x] **브라우저 알림 (Web Notification)** — 권한 UX, 설정(on/off), 거부·미지원 처리  
- [x] **이메일** — 공개 문의 접수 시 Resend로 운영자 메일 (`src/lib/server/operator-email.ts`), 실패 시 문의 흐름 유지  
- [x] **설정 화면** — 알림 채널(앱/브라우저/이메일) 이벤트별 토글 카드  
- [x] **문의 UX** — 알림 링크 `/inquiries?focus=<id>`, 행·모바일 카드 하이라이트, 웹폼 채널 뱃지 등  
- [x] **확장 여지** — 견적 승인/거절, 청구 연체, 리마인드 등은 같은 `notifications` + `data.ts`의 `insertBillNotificationForUser` 패턴으로 이미 연결 가능한 구조  
- [x] **문서** — `README.md`, `docs/deployment.md` (§4 마이그레이션 8·9, §4.1 알림, RC 체크리스트), `.env.example` 보강  
- [x] **빌드** — `npm run build` 성공 확인됨  

---

## 2. 주요 파일 경로 (수정·생성 시 참고)

| 영역 | 경로 |
|------|------|
| 마이그레이션 | `supabase/migrations/0007_public_inquiry_form.sql`, `0008_notifications.sql` |
| 타입 | `src/types/supabase.ts`, `src/types/domain.ts` |
| 데이터·알림 생성 | `src/lib/data.ts`, `src/lib/notification-defaults.ts` |
| 서비스 롤 클라이언트 | `src/lib/supabase/service.ts` |
| 운영자 이메일 | `src/lib/server/operator-email.ts` (`RESEND_FROM_EMAIL` 없으면 `RESEND_FROM` 폴백) |
| 공개 API | `src/app/api/public/inquiry/route.ts` |
| 알림 UI | `src/components/app/notification-center.tsx` |
| 셸/레이아웃 | `src/components/app/app-shell.tsx`, `src/app/(app)/layout.tsx` |
| 설정 UI | `src/components/app/settings-notification-preferences-card.tsx`, `settings-form.tsx`, `settings/page.tsx` |
| 서버 액션 | `src/app/actions.ts` |
| 문의 보드 포커스 | `src/components/app/inquiries-board.tsx`, `src/app/(app)/inquiries/page.tsx` |
| 가입 시 prefs 시드 | `src/lib/auth.ts` (`ensureUserProfile`) |

---

## 3. 운영/배포 시 반드시 확인할 것

1. Supabase SQL을 **문서 순서대로** 적용했는지 — 특히 **`0008_notifications.sql`**.  
2. **Realtime** — `public.notifications` 가 replication에 포함되는지 (마이그레이션 실패 시 대시보드에서 수동).  
3. **환경 변수**  
   - 필수(메일): `RESEND_API_KEY`, `RESEND_FROM` 또는 `RESEND_FROM_EMAIL`  
   - 선택(운영자 메일의 prefs/수신주소 조회): **`SUPABASE_SERVICE_ROLE_KEY`** (서버만, `NEXT_PUBLIC_*` 금지)  
   - 링크 품질: `NEXT_PUBLIC_SITE_URL` 권장  
4. **데모 모드** — 알림 센터 등은 데모 세션에서 비활성 처리됨.

자세한 설명: **`docs/deployment.md`** → **§4.1 알림**.

---

## 4. 남겨둔 여지 / 다음에 할 만한 것 (선택)

- 견적·청구·리마인드 이벤트에 대해 **이메일 채널**까지 operator 쪽에서 보내는 로직은, 구조만 열려 있고 **새 문의에 집중**한 상태일 수 있음 → 요구사항에 맞게 `operator-email.ts` 또는 별도 모듈로 확장.  
- **`docs/deploy-runbook.md`**에 §4.1 한 줄 링크 추가 — 아직 안 넣었으면 선택 작업.  
- SMS/카카오 — 이번 단계 제외; `notification_preferences` / 타입 enum 확장 지점만 열어둔 상태.

---

## 5. 새 채팅 첫 메시지 예시 (복사용)

```
@docs/CONTINUATION_HANDOFF.md 를 읽고 Bill-IO 알림 작업을 이어가줘.
현재 코드베이스 기준으로 [하고 싶은 작업]만 해줘.
```

---

## 6. 알림 흐름 한 줄 요약

`inquiries` INSERT → DB 트리거로 `notifications` 행 생성 → (앱 열림) Realtime으로 UI·토스트·(설정 허용 시) 브라우저 알림 → (공개 폼) `POST /api/public/inquiry` 후 비동기 Resend 이메일 → 알림 클릭 시 `/inquiries?focus=<id>`.
