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
  "quote.public_link_opened": "견적 링크 열람",
  "invoice.created": "청구 생성",
  "invoice.updated": "청구 수정",
  "invoice.status_changed": "결제 상태 변경",
  "invoice.payment_status_changed": "결제 상태 변경",
  /** @deprecated 새 로그는 reminder.created 사용 */
  "invoice.reminder_sent": "리마인드 기록",
  "reminder.created": "리마인드 기록",
  "invoice.deposit_paid": "선금 입금",
  "invoice.email_sent": "청구 이메일",
  "invoice.share_link_copied": "청구 링크 복사",
  "invoice.share_token_issued": "청구 링크 발급",
  "invoice.kakao_share_prepared": "청구 카카오 문구",
  "invoice.public_link_opened": "청구 링크 열람",
  "settings.saved": "설정 저장",
  "settings.seal_updated": "직인 설정",
  "inquiry_form.token_issued": "공개 문의 폼 링크",
  "inquiry_form.settings_saved": "공개 문의 폼 설정",
  "inquiry_form.disabled": "공개 문의 폼",
  "inquiry_form.link_copied": "문의 폼 링크 복사",
  "inquiry_form.email_opened": "문의 폼 메일 작성",
  "inquiry_form.kakao_copied": "문의 폼 카카오 문구",
  "inquiry_form.sms_copied": "문의 폼 문자 문구",
  "inquiry_form.qr_viewed": "문의 폼 QR",
  "messaging.channel_saved": "알림톡 채널 설정",
  "invoice.collection_plan_updated": "추심·연락 일정",
  "invoice.messaging_kakao_sent": "알림톡 발송",
  "quote.messaging_kakao_sent": "알림톡 발송",
  "customer.portal_token_issued": "고객 포털 링크",
  "public_inquiry.submitted": "공개·포털 문의 접수",
  "notification.operator_email_sent": "운영자 알림 메일",
  "tax_invoice.management_updated": "세금계산서 발행 설정",
  "tax_invoice.prepared": "세금계산서 발행 준비",
  "tax_invoice.issued": "세금계산서 발행 완료",
  "tax_invoice.issue_failed": "세금계산서 발행 실패",
  "tax_invoice.status_refreshed": "세금계산서 상태 동기화",
  "tax_invoice.asp_settings_saved": "전자세금계산서 연동 저장",
  "tax_invoice.asp_connection_tested": "전자세금계산서 연결 테스트",
  "customer.tax_invoice_profile_updated": "세금계산서용 고객 정보",
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
  if (action.startsWith("tax_invoice.")) {
    return "invoice"
  }
  if (action.startsWith("inquiry_form.")) {
    return "inquiry"
  }
  if (action === "public_inquiry.submitted" || action === "notification.operator_email_sent") {
    return "inquiry"
  }
  return "other"
}

export function resolveActivityHeadline(action: string): string {
  return headlineByAction[action] ?? "활동"
}

/** 타임라인·메타데이터에서 상태 raw 값을 한글로 쓸 때 `get*Meta().label` 과 동일 */
export {
  getInquiryStageMeta,
  getPaymentStatusMeta,
  getQuoteStatusMeta,
} from "@/lib/ops-status-meta"
