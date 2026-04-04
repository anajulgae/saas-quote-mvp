import { z } from "zod"

import { SignupCheckEmailPanel } from "@/components/app/signup-check-email-panel"
import { maskEmailForDisplay } from "@/lib/mask-email"

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff,#f4f4f5_50%,#eef2ff)] px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <SignupCheckEmailPanel prefillEmail={prefillEmail} maskedEmail={maskedEmail} />
      </div>
    </div>
  )
}
