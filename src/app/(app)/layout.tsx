import { AppShell } from "@/components/app/app-shell"
import { requireAppSession } from "@/lib/auth"
import { demoBusinessSettings } from "@/lib/demo-data"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await requireAppSession()

  const accountLine =
    session.mode === "demo"
      ? "샘플 데모 · DB 미연동"
      : session.user.email?.trim() || session.user.fullName

  return (
    <AppShell
      businessName={session.user.businessName || demoBusinessSettings.businessName}
      ownerName={session.user.fullName}
      accountLine={accountLine}
      isDemoSession={session.mode === "demo"}
    >
      {children}
    </AppShell>
  )
}
