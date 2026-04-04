import Link from "next/link"
import { Mail } from "lucide-react"

import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function ForgotPasswordSentPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff,#f4f4f5_50%,#eef2ff)] px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md space-y-6">
        <p className="text-center text-xs font-medium text-muted-foreground">비밀번호 재설정</p>
        <Card className="border-border/80 bg-background/95 shadow-md ring-1 ring-border/40">
          <CardHeader className="space-y-2">
            <div className="flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
              <Mail className="size-5" aria-hidden />
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight">메일을 확인해 주세요</CardTitle>
            <CardDescription className="text-sm leading-relaxed text-muted-foreground">
              입력하신 주소로 재설정 링크를 보냈습니다. 링크를 연 뒤 새 비밀번호를 저장하면 로그인할
              수 있습니다. 메일이 없으면 스팸함을 확인해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
              가입된 이메일이 아니면 메일이 오지 않을 수 있습니다.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href="/login" className={cn(buttonVariants({ variant: "default", size: "sm" }), "h-9")}>
                로그인으로
              </Link>
              <Link
                href="/forgot-password"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}
              >
                다른 이메일로 다시 요청
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
