import type { Metadata } from "next"

import { helpNotices } from "@/content/help-center"

export const metadata: Metadata = { title: "공지사항" }

export default function HelpNoticesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">공지사항</h1>
      <ul className="space-y-4">
        {helpNotices.map((n) => (
          <li key={n.id} className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{n.date}</p>
            <h2 className="mt-1 text-base font-semibold">{n.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
