import { getTranslations } from 'next-intl/server'
import { mockBonuses, bonusHasLocale, bonusPagePath, type MockBonus } from '@/lib/mock-bonuses'
import { getUserAccess, canAccessBonuses, canAccessBonus } from '@/lib/user-access-server'
import { createServiceClient } from '@/lib/admin-server'
import { BonusList } from './BonusList'

const COVER_TTL = 60 * 60 // 1h

export default async function BonusPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const access = await getUserAccess()
  const hasAnyAccess = canAccessBonuses(access)

  const tData = await getTranslations('bonusData')

  const visiveis = mockBonuses
    // só mostra material que tem PDF neste idioma
    .filter((b) => bonusHasLocale(b, locale))
    // produto de upsell só aparece pra quem comprou; brinde aparece sempre
    // (bloqueado pra quem ainda não tem acesso, convidando pro paywall)
    .filter((b) => b.access !== 'purchase' || canAccessBonus(b, access))

  // Capa = 1ª página do PDF. Só pros produtos comprados: é o que os faz parecer
  // o produto que são, em vez de mais um brinde de emoji na lista.
  const comprados = visiveis.filter((b) => b.access === 'purchase')
  const capas = new Map<string, string>()
  if (comprados.length > 0) {
    const supabase = createServiceClient()
    const paths = comprados.map((b) => bonusPagePath(b.id, locale, 1))
    const { data } = await supabase.storage.from('bonuses').createSignedUrls(paths, COVER_TTL)
    const porPath = new Map((data ?? []).map((s) => [s.path, s.signedUrl]))
    for (const b of comprados) {
      const url = porPath.get(bonusPagePath(b.id, locale, 1))
      if (url) capas.set(b.id, url)
    }
  }

  const toItem = (b: MockBonus) => ({
    id: b.id,
    emoji: b.emoji,
    pageCount: b.pages[locale] ?? 0,
    title: tData(`${b.id}.title`),
    description: tData(`${b.id}.description`),
    unlocked: canAccessBonus(b, access),
    coverUrl: capas.get(b.id) ?? null,
  })

  return (
    <BonusList
      produtos={comprados.map(toItem)}
      bonuses={visiveis.filter((b) => b.access !== 'purchase').map(toItem)}
      locale={locale}
      hasAnyAccess={hasAnyAccess}
    />
  )
}
