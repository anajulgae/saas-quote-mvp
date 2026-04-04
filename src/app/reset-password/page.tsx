import Link from "next/link"

import { ResetPasswordFlow } from "@/components/app/reset-password-flow"
import { AuthScreenShell } from "@/components/app/auth-screen-shell"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { isSupabaseConfigured } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

export const dynamic = "force-dynamic"

/**
 * 비밀번호 재설정 완료 UI.
 * Supabase `resetPasswordForEmail` 의 redirectTo 는 반드시 이 페이지의 절대 URL이어야 하며,
 * Dashboard → Authentication → URL Configuration 의 Redirect URLs 에 동일 패턴이 허용돼 있어야 합니다.
 * (예: https://배포도메인/reset-password 및 로컬 http://localhost:3000/reset-password)
 */
export default function ResetPasswordPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AuthScreenShell eyebrow="계정 · 비밀번호 재설정">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">설정 오류</CardTitle>
            <CardDescription>인증 환경을 확인할 수 없습니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
              로그인
            </Link>
          </CardContent>
        </Card>
      </AuthScreenShell>
    )
  }

  return (
    <AuthScreenShell eyebrow="계정 · 비밀번호 재설정">
      <ResetPasswordFlow />
    </AuthScreenShell>
  )
}
