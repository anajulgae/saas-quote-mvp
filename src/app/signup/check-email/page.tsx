import type { Metadata } from "next"
import { z } from "zod"

import { AuthScreenShell } from "@/components/app/auth-screen-shell"
import { SignupCheckEmailPanel } from "@/components/app/signup-check-email-panel"
import { maskEmailForDisplay } from "@/lib/mask-email"

export const metadata: Metadata = {
  title: "이메일 인증 안내",
  description: "Bill-IO 회원가입 이메일 인증 안내",
  robots: { index: false, follow: false },
}

type PageProps = {
  searchParams?: Promise<{ email?: string }>
}

export default async function SignupCheckEmailPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {}
  const raw = typeof sp.email === "string" ? sp.email.trim() : ""
  const valid = z.string().email().safeParse(raw).success
  const prefillEmail = valid ? raw : ""
  const maskedEmail = valid ? maskEmailForDisplay(raw) : null

  return (
    <AuthScreenShell eyebrow="회원가입 · 이메일 인증">
      <SignupCheckEmailPanel prefillEmail={prefillEmail} maskedEmail={maskedEmail} />
    </AuthScreenShell>
  )
}
