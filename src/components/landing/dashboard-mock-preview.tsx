import { Bell } from "lucide-react"

import { cn } from "@/lib/utils"

/** 히어로용 앱 UI — 브라우저 프레임으로 실제 제품 화면 느낌 강화 */
export function DashboardMockPreview({ className }: { className?: string }) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[min(100%,620px)] lg:max-w-none lg:mx-0", className)}>
      <div
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/[0.14] via-transparent to-teal-600/[0.1] blur-2xl sm:-inset-6"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-6 bottom-4 top-14 -z-10 hidden rounded-2xl border border-border/40 bg-muted/50 shadow-xl sm:block"
        aria-hidden
      />

      <div
        className={cn(
          "shadow-elevated relative overflow-hidden rounded-2xl border border-border/80 bg-card ring-2 ring-black/[0.06]",
          "sm:rounded-[1.25rem] sm:shadow-[0_32px_72px_-20px_rgba(15,23,42,0.22)]"
        )}
        aria-hidden
      >
        {/* 브라우저 크롬 */}
        <div className="flex items-center gap-2 border-b border-border/70 bg-muted/50 px-3 py-2.5 sm:px-4">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]/95" />
            <span className="size-2.5 rounded-full bg-[#febc2e]/95" />
            <span className="size-2.5 rounded-full bg-[#28c840]/95" />
          </div>
          <div className="min-w-0 flex-1 rounded-lg border border-border/60 bg-background/95 px-3 py-1.5 text-center shadow-sm">
            <p className="truncate font-mono text-[10px] font-medium text-muted-foreground sm:text-[11px]">
              app.bill-io.com<span className="text-foreground/80">/dashboard</span>
            </p>
          </div>
        </div>

        <div className="relative bg-card">
          {/* 플로팅: 새 문의 */}
          <div className="absolute left-1 top-[4.5rem] z-20 max-w-[11.5rem] rounded-xl border border-primary/30 bg-card/98 p-2.5 shadow-lg ring-1 ring-primary/20 backdrop-blur-sm sm:left-2 sm:top-[5.25rem] sm:max-w-[13.5rem]">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                !
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-foreground">새 문의 · 웹폼</p>
                <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-muted-foreground">
                  방금 접수됨 · 카톡 링크 유입
                </p>
              </div>
            </div>
          </div>

          <div className="absolute -right-0.5 top-[7.5rem] z-10 hidden w-[6.5rem] rounded-xl border border-border/70 bg-card/98 p-2.5 shadow-md ring-1 ring-black/[0.06] backdrop-blur-sm sm:block lg:top-[8.5rem]">
            <p className="text-[9px] font-semibold text-muted-foreground">오늘 후속</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">3건</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[68%] rounded-full bg-primary" />
            </div>
          </div>

          <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
            <div className="hidden items-center gap-1 rounded-lg border border-primary/25 bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary shadow-sm sm:flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/50 opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              LIVE
            </div>
            <div className="relative flex size-9 items-center justify-center rounded-xl border border-border/60 bg-muted/50 ring-1 ring-border/50">
              <Bell className="size-4 text-muted-foreground" strokeWidth={1.75} aria-hidden />
              <span className="absolute right-1 top-1 size-2 rounded-full bg-rose-500 ring-2 ring-card" />
            </div>
          </div>

          <div className="flex min-h-[360px] text-[10px] sm:min-h-[460px] sm:text-[11px] lg:min-h-[520px]">
            <div className="hidden w-[26%] shrink-0 border-r border-border/60 bg-muted/35 p-3 lg:block">
              <div className="mb-3 flex items-center gap-2">
                <div className="size-7 rounded-xl bg-gradient-to-br from-primary/30 to-teal-500/25 ring-1 ring-primary/30" />
                <div className="h-2 flex-1 max-w-[5rem] rounded-full bg-foreground/12" />
              </div>
              <div className="space-y-0.5">
                {["대시보드", "문의", "견적", "청구", "고객"].map((label, i) => (
                  <div
                    key={label}
                    className={cn(
                      "rounded-lg px-2.5 py-2 font-medium text-muted-foreground",
                      i === 0 && "bg-background font-bold text-foreground shadow-sm ring-1 ring-border/70"
                    )}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex min-w-0 flex-1 flex-col bg-background">
              <div className="flex items-center justify-between border-b border-border/60 px-3 py-3 sm:px-4">
                <div>
                  <p className="text-[11px] font-bold text-foreground sm:text-xs">운영 허브</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">문의 · 견적 · 청구 · 미수</p>
                </div>
                <span className="rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-[9px] font-semibold text-muted-foreground">
                  캘린더
                </span>
              </div>

              <div className="grid flex-1 grid-rows-[auto_auto_1fr] gap-2.5 p-2.5 sm:gap-3 sm:p-3.5">
                <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/[0.08] to-teal-500/[0.05] px-3 py-2 ring-1 ring-primary/15">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-primary">공개 문의 URL</p>
                  <p className="mt-0.5 truncate font-mono text-[9px] text-muted-foreground">
                    …/r/<span className="text-foreground/70">고객이 여기로 접수</span>
                  </p>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                  <div className="rounded-xl border border-border/60 bg-gradient-to-b from-muted/40 to-card p-3 ring-1 ring-black/[0.03]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground">이번 달 청구·입금</span>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-900">
                        추적 중
                      </span>
                    </div>
                    <div className="text-lg font-bold tracking-tight text-foreground sm:text-xl">₩ 12,420,000</div>
                    <p className="text-[9px] text-muted-foreground">미수 · 완납 구분</p>
                    <div className="mt-3 flex h-16 items-end gap-0.5 sm:h-[4.75rem]">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm bg-gradient-to-t from-primary/90 to-primary/55"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-card p-3 ring-1 ring-black/[0.03]">
                    <p className="mb-2 text-[10px] font-bold text-muted-foreground">견적 · 청구 라인</p>
                    <div className="flex flex-wrap gap-1">
                      <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[9px] font-bold">
                        발송 4
                      </span>
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[9px] font-bold text-primary ring-1 ring-primary/25">
                        승인 2
                      </span>
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold text-amber-950">
                        잔금 대기
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5 border-t border-border/50 pt-2">
                      {[
                        { n: "Q-218", a: "₩ 2.4M", st: "PDF·링크" },
                        { n: "INV-1042", a: "₩ 1.8M", st: "자동 리마인드 ON" },
                      ].map((row) => (
                        <div key={row.n} className="flex items-center justify-between gap-2 text-[9px] sm:text-[10px]">
                          <span className="font-bold text-foreground">{row.n}</span>
                          <span className="tabular-nums text-muted-foreground">{row.a}</span>
                          <span className="rounded bg-muted/70 px-1.5 py-0.5 text-[9px] font-medium">{row.st}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border/60 bg-muted/15 p-2.5 ring-1 ring-border/40 sm:p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground">미수 · 다음 연락</span>
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold text-rose-900">
                      입금 확인 필요 2
                    </span>
                  </div>
                  {[
                    { t: "영상 제작 견적", s: "선금 대기", c: "amber" as const },
                    { t: "인테리어 잔금", s: "자동 리마인드 발송 중", c: "rose" as const },
                    { t: "디자인 문의", s: "AI 운영 분석됨", c: "slate" as const },
                  ].map((row) => (
                    <div
                      key={row.t}
                      className="flex items-center justify-between gap-2 border-b border-border/45 py-2 last:border-0"
                    >
                      <span className="truncate font-semibold text-foreground">{row.t}</span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold",
                          row.c === "amber" && "bg-amber-500/15 text-amber-950",
                          row.c === "rose" && "bg-rose-500/12 text-rose-900",
                          row.c === "slate" && "bg-slate-500/10 text-slate-800"
                        )}
                      >
                        {row.s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3.5 text-center text-[11px] font-medium leading-snug text-muted-foreground sm:text-xs">
        실제 서비스와 동일한 메뉴 구조 · 가입 즉시 같은 화면으로 시작
      </p>
    </div>
  )
}
