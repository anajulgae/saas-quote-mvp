import { ForgotPasswordForm } from "@/components/app/forgot-password-form"
import { isSupabaseConfigured } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const ok = isSupabaseConfigured()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff,#f4f4f5_50%,#eef2ff)] px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        {!ok ? (
          <Card className="border-destructive/25 bg-destructive/5 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">비밀번호 재설정을 사용할 수 없습니다</CardTitle>
              <CardDescription>인증 환경이 구성되지 않았습니다. 관리자에게 문의해 주세요.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login" className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
                로그인으로 돌아가기
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ForgotPasswordForm />
        )}
      </div>
    </div>
  )
}
