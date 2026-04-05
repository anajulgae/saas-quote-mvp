import type { ActivityKind } from "@/types/domain"

const headlineByAction: Record<string, string> = {
  "auth.login_success": "로그인",
  "auth.signup_complete": "회원가입",
  "customer.created": "고객 등록",
  "inquiry.created": "문의 등록",
  "inquiry.updated": "문의 수정",
  "quote.linked_to_inquiry": "견적·문의 연결",
  "quote.created": "견적 생성",
  "quote.updated": "견적 수정",
  "quote.status_changed": "견적 상태 변경",
  "quote.duplicated": "견적 복제",
  "quote.deleted": "견적 삭제",
  "quote.sent": "견적 발송",
  "quote.email_sent": "견적 이메일",
  "quote.share_link_copied": "공유 링크 복사",
  "quote.share_token_issued": "공유 링크 발급",
  "quote.kakao_share_prepared": "카카오 공유 문구",
  "invoice.created": "청구 생성",
  "invoice.updated": "청구 수정",
  "invoice.status_changed": "결제 상태 변경",
  "invoice.payment_status_changed": "결제 상태 변경",
  /** @deprecated 새 로그는 reminder.created 사용 */
  "invoice.reminder_sent": "리마인드 기록",
  "reminder.created": "리마인드 기록",
  "invoice.deposit_paid": "선금 입금",
  "settings.saved": "설정 저장",
  "settings.seal_updated": "직인 설정",
}

export function resolveActivityKind(action: string): ActivityKind {
  if (action.startsWith("customer.")) {
    return "other"
  }
  if (action.startsWith("inquiry.")) {
    return "inquiry"
  }
  if (action.startsWith("quote.")) {
    return "quote"
  }
  if (action === "reminder.created" || action.includes("reminder")) {
    return "reminder"
  }
  if (action.startsWith("invoice.")) {
    return "invoice"
  }
  return "other"
}

export function resolveActivityHeadline(action: string): string {
  return headlineByAction[action] ?? "활동"
}
