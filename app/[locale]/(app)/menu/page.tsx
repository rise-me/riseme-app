import { createServiceClient } from '@/lib/admin-server'
import { getUserAccess, canAccessBonuses } from '@/lib/user-access-server'
import { cotaDaUsuaria } from '@/lib/diet/quota'
import type { Cardapio } from '@/lib/diet/tipos'
import { MenuClient } from './MenuClient'

// "Mi menú" — cardápio personalizado gerado por IA. Server component: resolve
// acesso + cota + cardápios já gerados (RLS: cada aluna só lê os seus).

export const dynamic = 'force-dynamic'

export default async function MenuPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const access = await getUserAccess()
  const unlocked = canAccessBonuses(access)

  let menus: Array<{ id: number; created_at: string; menu: Cardapio }> = []
  let cota = null
  if (access.userId && unlocked) {
    const supabase = createServiceClient()
    const [{ data }, cotaRes] = await Promise.all([
      supabase
        .from('diet_menus')
        .select('id, created_at, menu')
        .eq('user_id', access.userId)
        .order('created_at', { ascending: false })
        .limit(20),
      cotaDaUsuaria(access.userId),
    ])
    menus = (data ?? []) as unknown as Array<{ id: number; created_at: string; menu: Cardapio }>
    cota = cotaRes
  }

  return (
    <MenuClient
      locale={locale}
      unlocked={unlocked}
      menus={menus}
      cota={cota}
    />
  )
}
