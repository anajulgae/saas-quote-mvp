import { SignupCheckEmailPanel } from "@/components/app/signup-check-email-panel"

export default function SignupCheckEmailPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ffffff,#f4f4f5_50%,#eef2ff)] px-4 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <SignupCheckEmailPanel />
      </div>
    </div>
  )
}
