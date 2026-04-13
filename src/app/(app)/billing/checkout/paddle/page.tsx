import Link from "next/link"
import { redirect } from "next/navigation"

import { PaddleCheckoutLauncher } from "@/components/billing/paddle-checkout-launcher"
import { buttonVariants } from "@/components/ui/button-variants"
import { getAppSession } from "@/lib/auth"
import { getBillingProvider, getBillingProviderName } from "@/lib/billing/provider"
import {
  createPaddleTransaction,
  getPaddlePriceIdForPlan,
} from "@/lib/billing/providers/paddle-provider"
import { normalizePlan } from "@/lib/plan-features"

export const metadata = {
  title: "Paddle 결제",
  robots: { index: false, follow: false },
}

export default async function PaddleCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const sp = await searchParams
  const plan = normalizePlan(sp.plan)
  const checkoutPath = `/billing/checkout/paddle?plan=${encodeURIComponent(plan)}`

  const session = await getAppSession()
  if (!session?.user?.id || session.mode !== "supabase") {
    redirect(`/login?next=${encodeURIComponent(checkoutPath)}`)
  }

  if (getBillingProviderName() !== "paddle") {
    redirect("/billing")
  }

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

  const priceId = getPaddlePriceIdForPlan(plan)
  if (!priceId) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <h1 className="text-lg font-semibold text-destructive">가격 정보 오류</h1>
        <p className="text-sm text-muted-foreground">
          <strong>{plan}</strong> 플랜의 Price ID가 없습니다.
        </p>
        <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
          요금 페이지로
        </Link>
      </div>
    )
  }

  const email = session.user.email?.trim() ?? ""
  if (!email) {
    redirect("/settings")
  }

  // 서버에서 트랜잭션 생성 → transactionId를 클라이언트에 전달
  const txn = await createPaddleTransaction({
    priceId,
    email,
    userId: session.user.id,
    plan,
  })

  if (!txn.ok) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6">
        <h1 className="text-lg font-semibold text-destructive">결제 준비 오류</h1>
        <p className="text-sm text-muted-foreground">{txn.error}</p>
        <Link href="/billing" className={buttonVariants({ variant: "outline", size: "sm" })}>
          요금 페이지로
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-[50vh]">
      <PaddleCheckoutLauncher
        plan={plan}
        priceId={priceId}
        userId={session.user.id}
        email={email}
        transactionId={txn.transactionId}
      />
    </div>
  )
}
