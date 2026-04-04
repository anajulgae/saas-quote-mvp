import Link from "next/link"
import { Mail } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function ForgotPasswordSentPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff,#f4f4f5_50%,#eef2ff)] px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <Card className="border-border/80 bg-background/95 shadow-md ring-1 ring-border/40">
          <CardHeader className="space-y-2">
            <div className="flex size-11 items-center justify-center rounded-xl bg-muted text-foreground">
              <Mail className="size-5" aria-hidden />
            </div>
            <CardTitle className="text-xl font-semibold tracking-tight">메일을 확인해 주세요</CardTitle>
            <CardDescription className="text-sm leading-relaxed">
              입력하신 주소로 비밀번호 재설정 링크를 보냈습니다. 메일의 안내에 따라 새 비밀번호를
              설정한 뒤 로그인해 주세요. 메일이 보이지 않으면 스팸함을 확인해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              가입되지 않은 이메일로 요청한 경우 메일이 오지 않을 수 있습니다.
            </p>
            <Link
              href="/login"
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              로그인으로 돌아가기
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
