import { redirect } from 'next/navigation'
import { getAdminUser } from '@/lib/admin-server'
import { AdminNav } from './AdminNav'

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Portão único: sem papel admin, nem o layout renderiza.
  const admin = await getAdminUser()
  if (!admin) redirect(`/${locale}/login`)

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between max-w-3xl mx-auto">
        <div>
          <p className="font-black text-lg leading-none">
            Rise<span className="text-xs font-bold">Me</span> <span className="text-muted-foreground font-semibold text-sm">Admin</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{admin.email}</p>
        </div>
        <AdminNav />
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
