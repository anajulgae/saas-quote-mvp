import type { Metadata } from "next"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button-variants"
import { helpGuides, helpNotices } from "@/content/help-center"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "고객센터",
  description: "Bill-IO FAQ, 공지, 가이드, 문의 접수. 전화 상담 없이 이메일·티켓으로 지원합니다.",
}

export default function HelpHomePage() {
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-xl font-bold tracking-tight">무엇을 도와드릴까요?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          반복 질문은 FAQ와 가이드를 먼저 봐 주세요. 계정·결제·오류는 문의 양식으로 남기시면 기록된 순서로 답변드립니다.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href="/help/faq" className={cn(buttonVariants({ size: "sm" }), "h-9")}>
            FAQ 보기
          </Link>
          <Link href="/help/contact" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9")}>
            문의 남기기
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold">최근 공지</h2>
        <ul className="mt-3 space-y-2">
          {helpNotices.slice(0, 3).map((n) => (
            <li key={n.id} className="rounded-lg border border-border/60 bg-card px-3 py-2 text-sm">
              <span className="text-xs text-muted-foreground">{n.date}</span>
              <p className="font-medium">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.body}</p>
            </li>
          ))}
        </ul>
        <Link href="/help/notices" className="mt-2 inline-block text-xs font-semibold text-primary hover:underline">
          공지 전체
        </Link>
      </section>

      <section>
        <h2 className="text-sm font-semibold">가이드 바로가기</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {helpGuides.slice(0, 6).map((g) => (
            <li key={g.slug}>
              <Link
                href={`/help/guides#${g.slug}`}
                className="block rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm font-medium hover:border-primary/30"
              >
                {g.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
