import { redirect } from "next/navigation"

/** 예전 링크 호환: 성공 UI는 /forgot-password 한 페이지에서 처리합니다. */
export default function ForgotPasswordSentRedirectPage() {
  redirect("/forgot-password")
}
