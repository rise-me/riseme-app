import { getTranslations } from 'next-intl/server'
import { mockBonuses, bonusHasLocale } from '@/lib/mock-bonuses'
import { getUserAccess, canAccessBonuses } from '@/lib/user-access-server'
import { BonusList } from './BonusList'

export default async function BonusPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const access = await getUserAccess()
  const unlocked = canAccessBonuses(access)

  const tData = await getTranslations('bonusData')

  // só mostra bônus que têm PDF neste idioma
  const items = mockBonuses
    .filter((b) => bonusHasLocale(b, locale))
    .map((b) => ({
      id: b.id,
      emoji: b.emoji,
      pageCount: b.pages[locale] ?? 0,
      title: tData(`${b.id}.title`),
      description: tData(`${b.id}.description`),
    }))

  return <BonusList items={items} locale={locale} unlocked={unlocked} />
}
