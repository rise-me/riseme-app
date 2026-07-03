import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAdminUser } from '@/lib/admin-server'

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
        <nav className="flex gap-2 text-sm font-semibold">
          <Link href={`/${locale}/admin`} className="px-3 py-1.5 rounded-full bg-secondary">
            Suporte
          </Link>
          <Link href={`/${locale}/admin/numeros`} className="px-3 py-1.5 rounded-full bg-secondary">
            Números
          </Link>
        </nav>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
