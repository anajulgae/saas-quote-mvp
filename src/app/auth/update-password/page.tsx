import { redirect } from "next/navigation"

/** 예전 메일 링크 호환: 재설정 완료 화면은 /reset-password 로 통일 */
export default function LegacyUpdatePasswordRedirect() {
  redirect("/reset-password")
}
