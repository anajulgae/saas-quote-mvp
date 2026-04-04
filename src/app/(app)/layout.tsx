import { AppShell } from "@/components/app/app-shell"
import { requireAppSession } from "@/lib/auth"
import { demoBusinessSettings } from "@/lib/demo-data"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await requireAppSession()

  return (
    <AppShell
      businessName={session.user.businessName || demoBusinessSettings.businessName}
      ownerName={session.user.fullName}
      isDemoSession={session.mode === "demo"}
    >
      {children}
    </AppShell>
  )
}
