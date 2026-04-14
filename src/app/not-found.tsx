import Link from "next/link"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="max-w-md text-center">
        <p className="text-6xl font-bold text-muted-foreground/40">404</p>
        <h1 className="mt-4 text-lg font-bold">페이지를 찾을 수 없습니다</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/" className={cn(buttonVariants({ variant: "secondary" }))}>
          홈으로
        </Link>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "outline" }))}>
          대시보드
        </Link>
      </div>
    </div>
  )
}
