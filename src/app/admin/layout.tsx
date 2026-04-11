import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Bill-IO 운영",
  robots: { index: false, follow: false },
}

export default function AdminRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 antialiased">
      {children}
    </div>
  )
}
