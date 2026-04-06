import Link from "next/link"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export default function BizLandingNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-20 text-center text-slate-800">
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">페이지를 찾을 수 없습니다</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          주소가 바뀌었거나 비공개로 전환되었을 수 있습니다. 링크를 확인하거나 운영자에게 문의해 주세요.
        </p>
        <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-6 inline-flex h-9")}>
          Bill-IO 홈
        </Link>
      </div>
    </div>
  )
}
