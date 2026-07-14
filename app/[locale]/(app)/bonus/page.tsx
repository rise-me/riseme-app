import { getTranslations } from 'next-intl/server'
import { mockBonuses, bonusHasLocale } from '@/lib/mock-bonuses'
import { getUserAccess, canAccessBonuses, canAccessBonus } from '@/lib/user-access-server'
import { BonusList } from './BonusList'

export default async function BonusPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const access = await getUserAccess()
  const hasAnyAccess = canAccessBonuses(access)

  const tData = await getTranslations('bonusData')

  const items = mockBonuses
    // só mostra material que tem PDF neste idioma
    .filter((b) => bonusHasLocale(b, locale))
    // produto de upsell só aparece pra quem comprou; brinde aparece sempre
    // (bloqueado pra quem ainda não tem acesso, convidando pro paywall)
    .filter((b) => b.access !== 'purchase' || canAccessBonus(b, access))
    .map((b) => ({
      id: b.id,
      emoji: b.emoji,
      pageCount: b.pages[locale] ?? 0,
      title: tData(`${b.id}.title`),
      description: tData(`${b.id}.description`),
      unlocked: canAccessBonus(b, access),
    }))

  return <BonusList items={items} locale={locale} hasAnyAccess={hasAnyAccess} />
}
