import Link from "next/link"
import {
  Bell,
  CalendarDays,
  Globe,
  LayoutGrid,
  Link2,
  Megaphone,
  Sparkles,
  Users,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button-variants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { DashboardHubSnapshot, DashboardNotificationPreview } from "@/lib/data"
import { formatDateTime } from "@/lib/format"
import { planAllowsFeature } from "@/lib/plan-features"
import { cn } from "@/lib/utils"

function hubCardClass() {
  return "border-border/65 bg-card/80 shadow-none ring-1 ring-black/[0.03] transition-[border-color,box-shadow] hover:border-primary/18 hover:shadow-sm"
}

export function DashboardOperationalHub({
  hub,
  notificationPreview,
  siteOrigin,
}: {
  hub: DashboardHubSnapshot
  notificationPreview: DashboardNotificationPreview[]
  siteOrigin: string
}) {
  const origin = siteOrigin.replace(/\/$/, "")
  const formUrl =
    hub.publicInquiryFormEnabled && hub.publicInquiryFormToken
      ? `${origin}/r/${encodeURIComponent(hub.publicInquiryFormToken)}`
      : null
  const proLanding = planAllowsFeature(hub.plan, "mini_landing")
  const portal = planAllowsFeature(hub.plan, "customer_mini_portal")

  return (
    <section className="space-y-3" aria-labelledby="dash-hub-heading">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="dash-hub-heading" className="text-base font-semibold tracking-tight text-foreground">
            운영 허브
          </h2>
          <p className="mt-0.5 max-w-2xl text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
            메뉴는 고객·문의·견적·청구 네 가지로 단순하게 두고, 유입·발송·알림·AI(문의 분석·풀 견적·수금 문구)는
            여기서 한눈에 이어집니다.
          </p>
        </div>
        <Link
          href="/settings"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 shrink-0 gap-1.5 text-xs font-medium"
          )}
        >
          <LayoutGrid className="size-3.5" aria-hidden />
          설정에서 전부 관리
        </Link>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={hubCardClass()}>
          <CardHeader className="space-y-1 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Megaphone className="size-3.5" aria-hidden />
              </div>
              <CardTitle className="text-sm font-semibold">유입·접수</CardTitle>
            </div>
            <CardDescription className="text-[11px] leading-snug">
              공개 문의 폼 링크를 복사해 카톡·인스타·명함에 올립니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {formUrl ? (
              <>
                <p className="truncate rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                  {formUrl}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Link
                    href="/settings#public-inquiry"
                    className={cn(buttonVariants({ size: "sm" }), "h-8 text-xs")}
                  >
                    폼 설정
                  </Link>
                  <Link
                    href="/inquiries"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
                  >
                    문의함
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-[11px] leading-snug text-muted-foreground">
                아직 링크가 없습니다. 설정에서 공개 문의 폼을 켜면 여기에 표시됩니다.
              </p>
            )}
            {!formUrl ? (
              <Link href="/settings#public-inquiry" className={cn(buttonVariants({ size: "sm" }), "h-8 w-fit text-xs")}>
                공개 문의 켜기
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card className={hubCardClass()}>
          <CardHeader className="space-y-1 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Users className="size-3.5" aria-hidden />
              </div>
              <CardTitle className="text-sm font-semibold">고객 포털·랜딩</CardTitle>
            </div>
            <CardDescription className="text-[11px] leading-snug">
              거래 고객에게 견적·청구 요약 페이지(Pro)와 업체 소개 페이지를 제공합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5 pt-0">
            {portal ? (
              <Link href="/customers" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
                고객별 포털 링크
              </Link>
            ) : (
              <span className="text-[11px] text-muted-foreground">Pro · 미니 포털</span>
            )}
            {proLanding ? (
              <Link
                href="/settings/landing"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}
              >
                업체 소개 편집
              </Link>
            ) : (
              <Link
                href="/billing?plan=pro"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 text-xs text-primary")}
              >
                Pro · 공개 랜딩
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className={hubCardClass()}>
          <CardHeader className="space-y-1 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-3.5" aria-hidden />
              </div>
              <CardTitle className="text-sm font-semibold">발송·AI</CardTitle>
            </div>
            <CardDescription className="text-[11px] leading-snug">
              문의 운영 분석·풀 견적 초안·청구 추심·발송 문구를 AI로 줄이고, 공개 링크·PDF·메일로 발송합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5 pt-0">
            <Link href="/quotes" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
              견적·AI
            </Link>
            <Link href="/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-8 text-xs")}>
              템플릿·문구
            </Link>
          </CardContent>
        </Card>

        <Card className={hubCardClass()}>
          <CardHeader className="space-y-1 pb-2">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell className="size-3.5" aria-hidden />
              </div>
              <CardTitle className="text-sm font-semibold">알림·일정</CardTitle>
            </div>
            <CardDescription className="text-[11px] leading-snug">
              실시간 알림(종 아이콘)·브라우저·이메일. 아래는 최근 알림 미리보기입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {notificationPreview.length ? (
              <ul className="space-y-1.5">
                {notificationPreview.map((n) => (
                  <li key={n.id}>
                    {n.linkPath?.startsWith("/") ? (
                      <Link
                        href={n.linkPath}
                        className={cn(
                          "block rounded-md border border-transparent px-1.5 py-1 text-[11px] leading-snug transition-colors hover:border-border/60 hover:bg-muted/30",
                          !n.isRead && "font-medium text-foreground"
                        )}
                      >
                        <span className="line-clamp-2">{n.title}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground">
                          {formatDateTime(n.createdAt)}
                        </span>
                      </Link>
                    ) : (
                      <span className="block px-1.5 py-1 text-[11px] text-muted-foreground line-clamp-2">{n.title}</span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] leading-snug text-muted-foreground">
                새 문의·견적 이벤트가 오면 여기에 쌓입니다. 우측 상단 종 아이콘에서도 동일하게 확인할 수 있습니다.
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 border-t border-border/50 pt-2">
              <Link
                href="/settings#notifications-prefs"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2 text-[11px]")}
              >
                알림 설정
              </Link>
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <CalendarDays className="size-3" aria-hidden />
                캘린더는 각 목록 화면에서
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/55 bg-muted/10 px-3 py-2 text-[11px] text-muted-foreground">
        <Globe className="size-3.5 shrink-0 text-primary/80" aria-hidden />
        <span>
          <strong className="font-medium text-foreground">한 흐름</strong> — 웹폼·포털 유입 → 문의 정리 → 견적 발송·공유
          → 청구·리마인드·추심까지 Bill-IO 안에서 이어집니다.
        </span>
        <Link2 className="size-3.5 shrink-0 opacity-60" aria-hidden />
      </div>
    </section>
  )
}
