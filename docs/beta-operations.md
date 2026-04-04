# 비공개 베타 운영 점검 가이드

3~5명 규모 베타에서 **막히는 지점**을 빠르게 찾기 위한 최소 체크리스트입니다.

## 1. Supabase에서 볼 이벤트 (`activity_logs`)

운영자는 SQL Editor 또는 이후 대시보드에서 아래 `action` 값의 빈도·최근 시각을 보면 됩니다.

| action | 의미 |
|--------|------|
| `auth.login_success` | 로그인 성공 (세션 수준) |
| `inquiry.created` | 문의 생성 |
| `quote.created` | 견적 생성 |
| `quote.status_changed` | 견적 상태만 변경 |
| `quote.updated` | 견적 전체 수정(항목·금액 등) |
| `invoice.created` | 청구 생성 |
| `invoice.status_changed` | 결제 상태만 변경(빠른 액션) |
| `invoice.payment_status_changed` | 청구 폼 저장 시 입금 상태가 바뀐 경우 |
| `invoice.updated` | 청구 폼 저장 |
| `reminder.created` | 리마인드 기록 생성 |
| `settings.saved` | 사업장 설정 저장 |

예시(최근 7일, 사용자별 건수):

```sql
select action, count(*) as n
from activity_logs
where created_at > now() - interval '7 days'
group by action
order by n desc;
```

## 2. 베타 사용자에게 물어볼 피드백

- 첫 방문 후 **5분 안에** “무엇을 해야 할지” 알았는지  
- **첫 문의 → 첫 견적 → 첫 청구** 중 어디에서 멈췄는지  
- **설정**(사업장명, 계좌, 리마인드 문구)을 찾았는지  
- 모바일/작은 화면에서 **버튼·다이얼로그**가 불편한지  

## 3. 즉시 수정이 필요한 신호

- `auth.login_success`는 있는데 `inquiry.created` / `quote.created`가 거의 없음 → 온보딩·빈 상태 안내 부족 또는 고객 생성 단계에서 이탈  
- `quote.created`는 많은데 `invoice.created`가 없음 → 청구 화면 진입·이해 문제  
- `invoice.status_changed` 없이 `overdue` 청구만 쌓임 → 결제 상태 업데이트 UX 문제  
- 로그인 오류 문의 다수 → Supabase Auth URL·Redirect 설정 재확인  

## 4. 데이터 수집 범위

- **PII 최소화**: `activity_logs.description`은 업무 맥락 위주이며, 베타 기간에는 고객 실명 대신 회사명/제목 위주로 표시됩니다.  
- **데모 모드**: `ENABLE_DEMO_LOGIN` 등으로 데모 세션을 쓰는 경우 DB 로그는 남지 않습니다. 베타는 **실제 Supabase 계정** 기준으로 보는 것이 좋습니다.
