import Link from "next/link"

import { UpdatePasswordForm } from "@/components/app/update-password-form"

export const dynamic = "force-dynamic"
import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server"

export default async function UpdatePasswordPage() {
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
        <div className="mx-auto w-full max-w-md">
          <Card className="border-border/80 bg-background/95 shadow-md ring-1 ring-border/40">
            <CardHeader>
              <CardTitle className="text-xl font-semibold tracking-tight">유효한 링크가 필요합니다</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                비밀번호 재설정 메일에 포함된 링크로 접속해 주세요. 링크는 일정 시간 후 만료될 수
                있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row">
              <Link href="/forgot-password" className={cn(buttonVariants({ variant: "default" }))}>
                비밀번호 찾기
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
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
      <div className="mx-auto w-full max-w-md">
        <UpdatePasswordForm />
      </div>
    </div>
  )
}
