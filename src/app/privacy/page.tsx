import type { Metadata } from "next"
import Link from "next/link"

import { buttonVariants } from "@/components/ui/button-variants"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description:
    "Bill-IO 서비스의 개인정보 수집·이용·보관 및 이용자 권리 안내. 관련 법령을 준수합니다.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6 text-sm leading-relaxed">
        <p>
          <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-8 px-2")}>
            ← 홈
          </Link>
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">개인정보처리방침</h1>
        <p className="text-muted-foreground">
          Bill-IO(이하 &quot;서비스&quot;)는 이용자의 개인정보를 중요하게 다루며, 관련 법령을 준수합니다. 본 방침은
          서비스 제공을 위해 처리하는 정보의 범위와 목적을 안내합니다.
        </p>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">1. 수집 항목</h2>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>회원가입·로그인: 이메일, 비밀번호(암호화 저장), 표시 이름 등 인증에 필요한 정보</li>
            <li>사업 운영: 고객·견적·청구 등 이용자가 입력한 업무 데이터</li>
            <li>기술 정보: 접속 로그, 쿠키, IP 등 서비스 안정 운영에 필요한 최소 정보</li>
          </ul>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. 이용 목적</h2>
          <p className="text-muted-foreground">
            계정 관리, 견적·청구 기능 제공, 고객 지원, 보안·부정 이용 방지, 법적 의무 이행.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. 보관 및 파기</h2>
          <p className="text-muted-foreground">
            관련 법령 또는 이용약관에 따른 기간 동안 보관 후 파기합니다. 이용자는 계정 설정 또는 고객 지원을 통해
            삭제·열람 요청을 할 수 있습니다.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">4. 제3자 제공·처리 위탁</h2>
          <p className="text-muted-foreground">
            호스팅·인증·이메일 발송 등 운영에 필요한 범위에서 신뢰할 수 있는 수탁사에 처리를 위탁할 수 있습니다.
            위탁 시 계약 등을 통해 개인정보 보호 의무를 부과합니다.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-base font-semibold">5. 이용자 권리</h2>
          <p className="text-muted-foreground">
            개인정보 열람·정정·삭제·처리 정지를 요청할 수 있으며, 문의는 서비스 내 안내 또는 공개된 연락처로
            가능합니다.
          </p>
        </section>
        <p className="text-xs text-muted-foreground">
          시행일: 2026년 4월 2일 · 내용은 서비스 정책에 따라 변경될 수 있으며, 변경 시 서비스 내 공지합니다.
        </p>
      </div>
    </div>
  )
}
