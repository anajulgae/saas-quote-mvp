import Link from "next/link"

import { AuthScreenShell } from "@/components/app/auth-screen-shell"
import { ForgotPasswordForm } from "@/components/app/forgot-password-form"
import { isSupabaseConfigured } from "@/lib/auth"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function ForgotPasswordPage() {
  const ok = isSupabaseConfigured()

  return (
    <AuthScreenShell eyebrow="계정 · 비밀번호 재설정">
      {!ok ? (
        <Card className="border-destructive/25 bg-destructive/5 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">비밀번호 재설정을 사용할 수 없습니다</CardTitle>
            <CardDescription>인증 환경이 구성되지 않았습니다. 관리자에게 문의해 주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
              로그인으로
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ForgotPasswordForm />
      )}
    </AuthScreenShell>
  )
}
