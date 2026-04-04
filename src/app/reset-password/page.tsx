import Link from "next/link"

import { UpdatePasswordForm } from "@/components/app/update-password-form"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function ResetPasswordPage() {
  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff,#f4f4f5_50%,#eef2ff)] px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">설정 오류</CardTitle>
              <CardDescription>인증 환경을 확인할 수 없습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
                로그인
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const supabase = await createServerSupabaseClient()
  if (!supabase) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff,#f4f4f5_50%,#eef2ff)] px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">설정 오류</CardTitle>
              <CardDescription>인증 클라이언트를 만들 수 없습니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
                로그인
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff,#f4f4f5_50%,#eef2ff)] px-4 py-12 sm:py-16">
        <div className="mx-auto w-full max-w-md space-y-5">
          <p className="text-center text-xs font-medium text-muted-foreground">비밀번호 재설정</p>
          <Card className="border-border/80 bg-background/95 shadow-md ring-1 ring-border/40">
            <CardHeader className="space-y-2">
              <CardTitle className="text-xl font-semibold tracking-tight">링크를 다시 확인해 주세요</CardTitle>
              <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                재설정 메일의 링크로 들어오거나, 링크가 만료되지 않았는지 확인해 주세요. 다른
                브라우저나 시크릿 창에서 연 경우에는 이 탭에서 세션이 잡히지 않을 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href="/forgot-password" className={cn(buttonVariants({ variant: "default" }), "h-10")}>
                비밀번호 찾기 다시 하기
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: "outline" }), "h-10")}>
                로그인
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff,#f4f4f5_50%,#eef2ff)] px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md space-y-5">
        <p className="text-center text-xs font-medium text-muted-foreground">비밀번호 재설정</p>
        <UpdatePasswordForm />
      </div>
    </div>
  )
}
