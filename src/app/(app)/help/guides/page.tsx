import type { Metadata } from "next"

import { helpGuides } from "@/content/help-center"

export const metadata: Metadata = { title: "사용 가이드" }

export default function HelpGuidesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">사용 가이드</h1>
      <p className="text-sm text-muted-foreground">
        제품 안의 화면 설명과 함께 보면 좋은 순서입니다. 로그인 후 동일 메뉴에서 실습해 보세요.
      </p>
      <ol className="space-y-4">
        {helpGuides.map((g, i) => (
          <li key={g.slug} id={g.slug} className="scroll-mt-24 rounded-xl border border-border/60 bg-muted/15 p-4">
            <p className="text-xs font-bold text-primary">{i + 1}</p>
            <h2 className="mt-1 text-base font-semibold">{g.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{g.summary}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
