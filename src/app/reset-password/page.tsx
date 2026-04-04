import Link from "next/link"

import { AuthScreenShell } from "@/components/app/auth-screen-shell"
import { UpdatePasswordForm } from "@/components/app/update-password-form"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { authCardClass } from "@/lib/auth-ui"
import { cn } from "@/lib/utils"
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) {
    return (
      <AuthScreenShell eyebrow="비밀번호 재설정">
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

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return (
      <AuthScreenShell eyebrow="비밀번호 재설정">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">설정 오류</CardTitle>
            <CardDescription>인증 클라이언트를 만들 수 없습니다.</CardDescription>
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <AuthScreenShell eyebrow="비밀번호 재설정">
        <Card className={authCardClass}>
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl font-semibold tracking-tight">링크를 다시 확인해 주세요</CardTitle>
            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
              재설정 메일의 링크를 이 브라우저에서 연 뒤 다시 시도해 주세요. 링크는 시간이 지나면
              만료될 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Link href="/forgot-password" className={cn(buttonVariants({ variant: "default" }), "h-10")}>
              비밀번호 찾기
            </Link>
            <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
              로그인
            </Link>
          </CardContent>
        </Card>
      </AuthScreenShell>
    )
  }

  return (
    <AuthScreenShell eyebrow="비밀번호 재설정">
      <UpdatePasswordForm />
    </AuthScreenShell>
  )
}
