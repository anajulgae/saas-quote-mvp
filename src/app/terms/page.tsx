import type { Metadata } from "next"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "이용약관",
  description: "Bill-IO 이용약관",
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed">
        <p>
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2")}>
            ← 홈
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">이용약관</h1>
        <p className="text-muted-foreground">
          본 약관은 Bill-IO 서비스 이용과 관련하여 운영자와 이용자 간 권리·의무를 규정합니다.
        </p>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">1. 서비스 내용</h2>
          <p className="text-muted-foreground">
            Bill-IO는 견적·청구·수금 관련 업무를 지원하는 클라우드 소프트웨어입니다. 기능·가용성은 운영 정책에 따라
            변경될 수 있습니다.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. 계정 및 의무</h2>
          <p className="text-muted-foreground">
            이용자는 정확한 정보를 제공하고 계정 보안을 유지해야 합니다. 타인에게 피해를 주는 이용, 불법 행위,
            시스템 부정 접근은 금지됩니다.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. 데이터 및 책임</h2>
          <p className="text-muted-foreground">
            이용자가 입력한 데이터의 소유권은 이용자에게 있습니다. 세금·법적 효력이 있는 문서의 최종 검토는 이용자의
            책임입니다. 서비스 장애 등으로 인한 간접 손해에 대해 운영자의 책임은 관련 법령이 허용하는 범위 내로
            한정됩니다.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">4. 요금 및 결제</h2>
          <p className="text-muted-foreground">
            유료 플랜이 도입되는 경우 별도 안내·동의 절차를 거칩니다. 무료 구간의 제한은 서비스 내 공지를 따릅니다.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">5. 약관 변경·해지</h2>
          <p className="text-muted-foreground">
            운영자는 필요 시 약관을 변경할 수 있으며, 중요한 변경은 합리적인 방법으로 공지합니다. 이용자는 언제든지
            서비스 이용을 중단할 수 있습니다.
          </p>
        </section>
        <p className="text-xs text-muted-foreground">시행일: 2026년 4월 2일</p>
      </div>
    </div>
  )
}
