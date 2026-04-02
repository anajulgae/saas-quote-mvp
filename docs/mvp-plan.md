# AI 견적-청구-수금 SaaS MVP 계획

## 1. 폴더 구조 제안

```text
saas-quote-mvp/
  docs/
    mvp-plan.md
  supabase/
    migrations/
      0001_mvp_schema.sql
    seed.sql
  src/
    app/
      login/
      (app)/
        dashboard/
        inquiries/
        quotes/
        invoices/
        customers/
        settings/
    components/
      ui/
      app/
    lib/
      auth.ts
      demo-data.ts
      format.ts
      supabase/
    types/
      domain.ts
```

- `app`: 라우트와 레이아웃
- `components/app`: 재사용 앱 셸, 헤더, 상태 뱃지
- `lib`: 인증, 포맷터, 데모 데이터, Supabase 유틸
- `types`: 도메인 모델 타입
- `supabase`: 초기 스키마와 시드

## 2. 데이터베이스 스키마 제안

핵심 엔티티:

- `users`: 서비스 사용자 프로필
- `customers`: 고객 기본 정보
- `inquiries`: 문의 접수 및 파이프라인 상태
- `quotes`: 견적 헤더
- `quote_items`: 견적 항목
- `invoices`: 선금/잔금 청구 및 결제 상태
- `reminders`: 리마인드 발송 이력
- `activity_logs`: 주요 액션 로그
- `templates`: 견적/리마인드 템플릿
- `business_settings`: 사업자 기본 설정

핵심 상태값:

- 문의 상태: `new`, `qualified`, `quoted`, `won`, `lost`
- 견적 상태: `draft`, `sent`, `approved`, `rejected`, `expired`
- 결제 상태: `pending`, `deposit_paid`, `partially_paid`, `paid`, `overdue`
- 청구 타입: `deposit`, `balance`, `final`

## 3. 페이지별 UI 구조 제안

### `/login`
- 한국어 로그인 화면
- 이메일/비밀번호 로그인
- Supabase 미연결 시 데모 계정 로그인 지원

### `/dashboard`
- 이번 달 견적 발송 수
- 미수 금액
- 입금 대기 건수
- 오늘 해야 할 후속조치
- 파이프라인 요약
- 최근 활동

### `/inquiries`
- 문의 목록
- 모바일 카드 / 데스크톱 테이블
- 신규 등록 / 수정 다이얼로그
- 고객 연결, 상태, 예상 매출 관리

### `/quotes`
- 견적 리스트
- 상태 추적
- 항목 요약
- AI 견적 초안 생성 패널

### `/invoices`
- 선금/잔금 청구 목록
- 결제 상태 뱃지
- 리마인드 이력

### `/customers`
- 고객 목록
- 고객별 최근 문의/견적/청구 요약
- 고객 타임라인 상세

### `/settings`
- 사업자 기본 설정
- 기본 견적/리마인드 템플릿
- 결제 문구/계좌 안내

## 4. 구현 Phase 제안

### Phase 1
- Next.js + Tailwind + shadcn/ui + Supabase 토대
- 보호 라우트
- 로그인
- 앱 셸
- 필수 페이지 UI 초안
- 데모 데이터

### Phase 2
- Supabase DB 연결
- CRUD 서버 액션
- 고객/문의/견적/청구 실제 저장
- 활동 로그 적재

### Phase 3
- AI 견적 초안 생성 고도화
- 리마인드 자동화
- 필터/검색
- PDF/공유 링크

## 5. 현재 구현 원칙

- MVP 속도 우선, 과한 추상화 금지
- 모바일 우선 반응형
- 한국어 UI 우선
- 파일/변수/타입명은 영어 유지
- 로컬 데모 데이터로 즉시 테스트 가능
