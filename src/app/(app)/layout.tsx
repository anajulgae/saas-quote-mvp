import { AppShell } from "@/components/app/app-shell"
import { requireAppSession } from "@/lib/auth"
import { demoBusinessSettings } from "@/lib/demo-data"
import { resolveSidebarSecondaryLine } from "@/lib/sidebar-display"

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await requireAppSession()

  const businessName = session.user.businessName || demoBusinessSettings.businessName
  const sidebarSecondary = resolveSidebarSecondaryLine(
    businessName,
    session.user.fullName,
    session.user.email
  )

  return (
    <AppShell
      businessName={businessName}
      sidebarSecondary={sidebarSecondary}
      isDemoSession={session.mode === "demo"}
    >
      {children}
    </AppShell>
  )
}
