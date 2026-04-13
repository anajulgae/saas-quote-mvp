import Link from "next/link"
import { redirect } from "next/navigation"

import { PaddleCheckoutLauncher } from "@/components/billing/paddle-checkout-launcher"
import { buttonVariants } from "@/components/ui/button-variants"
import { getAppSession } from "@/lib/auth"
import { getBillingProvider, getBillingProviderName } from "@/lib/billing/provider"
import { getPaddlePriceIdForPlan } from "@/lib/billing/providers/paddle-provider"
import { normalizePlan } from "@/lib/plan-features"

export const metadata = {
  title: "Paddle 결제",
  robots: { index: false, follow: false },
}

export default async function PaddleCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; error?: string }>
}) {
  const sp = await searchParams
  const plan = normalizePlan(sp.plan)
  const checkoutPath = `/billing/checkout/paddle?plan=${encodeURIComponent(plan)}`

  // ── 1. 로그인 체크 ──────────────────────────────────────────────
  const session = await getAppSession()
  if (!session?.user?.id || session.mode !== "supabase") {
    redirect(`/login?next=${encodeURIComponent(checkoutPath)}`)
  }

  // ── 2. Paddle이 선택된 PG인지 체크 ──────────────────────────────
  if (getBillingProviderName() !== "paddle") {
    redirect("/billing")
  }

  // ── 3. 설정 완료 여부 체크 ──────────────────────────────────────
  const provider = getBillingProvider()
  if (!provider.isConfigured()) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <h1 className="text-lg font-semibold text-destructive">결제 설정 오류</h1>
        <p className="text-sm text-muted-foreground">
          {provider.getConfigurationError() ?? "Paddle 환경 변수가 설정되지 않았습니다."}
        </p>
        <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
          요금 페이지로
        </Link>
      </div>
    )
  }

  // ── 4. Price ID 확인 ─────────────────────────────────────────────
  const priceId = getPaddlePriceIdForPlan(plan)
  if (!priceId) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <h1 className="text-lg font-semibold text-destructive">가격 정보 오류</h1>
        <p className="text-sm text-muted-foreground">
          <strong>{plan}</strong> 플랜의 Paddle Price ID가 .env.local에 없습니다.
          <br />
          <code className="text-xs">BILLING_PADDLE_PRICE_{plan.toUpperCase()}_MONTHLY</code> 를 확인하세요.
        </p>
        <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
          요금 페이지로
        </Link>
      </div>
    )
  }

  // ── 5. 이메일 확인 ───────────────────────────────────────────────
  const email = session.user.email?.trim() ?? ""
  if (!email) {
    redirect("/settings")
  }

  // ── 6. 체크아웃 렌더링 (Paddle.js 오버레이) ──────────────────────
  return (
    <div className="min-h-[50vh]">
      <PaddleCheckoutLauncher
        plan={plan}
        priceId={priceId}
        userId={session.user.id}
        email={email}
      />
    </div>
  )
}
