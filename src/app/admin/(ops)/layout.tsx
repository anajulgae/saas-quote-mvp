import { AdminShell } from "@/components/admin/admin-shell"
import { requireAdminAccess } from "@/lib/server/admin-auth"

export default async function AdminOpsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const ctx = await requireAdminAccess()

  return (
    <AdminShell adminEmail={ctx.email} adminRole={ctx.adminRole}>
      {children}
    </AdminShell>
  )
}
