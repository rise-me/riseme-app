import { getTranslations } from 'next-intl/server'
import { notFound, redirect } from 'next/navigation'
import { getMockBonusById, bonusHasLocale, bonusPagePath, bonusOriginalPath } from '@/lib/mock-bonuses'
import { getUserAccess, canAccessBonus } from '@/lib/user-access-server'
import { createServiceClient } from '@/lib/admin-server'
import { BonusReader } from './BonusReader'

const SIGNED_TTL = 60 * 60 // 1h

export default async function BonusReaderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params

  const bonus = getMockBonusById(id)
  if (!bonus || !bonusHasLocale(bonus, locale)) notFound()

  // trava server-side: conteúdo pago (igual ao player de desafio). Por item —
  // produto de upsell exige a compra dele, não basta ter um desafio.
  const access = await getUserAccess()
  if (!canAccessBonus(bonus, access)) {
    redirect(`/${locale}/bonus`)
  }

  const pageCount = bonus.pages[locale]
  const pagePaths = Array.from({ length: pageCount }, (_, i) => bonusPagePath(id, locale, i + 1))
  const originalPath = bonusOriginalPath(id, locale)

  // signed URLs geradas com service_role (bucket privado — cliente nunca lê direto)
  const supabase = createServiceClient()
  const [{ data: pageSigned }, { data: originalSigned }] = await Promise.all([
    supabase.storage.from('bonuses').createSignedUrls(pagePaths, SIGNED_TTL),
    supabase.storage.from('bonuses').createSignedUrl(originalPath, SIGNED_TTL, { download: true }),
  ])

  // preserva a ordem das páginas (a API pode não devolver na ordem pedida)
  const byPath = new Map((pageSigned ?? []).map((s) => [s.path, s.signedUrl]))
  const pageUrls = pagePaths
    .map((p) => byPath.get(p))
    .filter((u): u is string => Boolean(u))

  if (pageUrls.length === 0) notFound()

  const tData = await getTranslations('bonusData')

  return (
    <BonusReader
      locale={locale}
      title={tData(`${id}.title`)}
      pageUrls={pageUrls}
      downloadUrl={originalSigned?.signedUrl ?? null}
    />
  )
}
