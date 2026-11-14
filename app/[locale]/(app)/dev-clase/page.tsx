import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ClaseDeHoy } from '@/components/home/ClaseDeHoy'
import { FirstAccessNotice } from '@/components/home/FirstAccessNotice'
import { getMockDays } from '@/lib/mock-challenge-days'

// SÓ NO COMPUTADOR (npm run dev): prévia do "Tu clase de hoy" com dados de mentira. 404 em produção.
// ?estado=primera|hoy|hecha
export default async function DevClase({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { locale } = await params
  const estado = ((await searchParams).estado ?? 'primera') as 'primera' | 'hoy' | 'hecha'
  const t = await getTranslations('progress')
  const tData = await getTranslations('challengeData')
  const tDays = await getTranslations('challengeDays')
  const n = estado === 'primera' ? 1 : 4
  const dia = getMockDays('1', (tDays.raw('1') as string[]) ?? [], locale)[n - 1]
  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('greeting', { name: 'María' })}</h1>
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">M</div>
      </div>
      <ClaseDeHoy
        estado={estado}
        href="#"
        challengeId="1"
        desafio={tData('1.title')}
        emoji="💪"
        dia={n}
        titulo={dia.title}
        minutos={dia.duration_minutes}
      />
      {estado === 'primera' && <FirstAccessNotice locale={locale} inline />}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0 text-2xl">🔥</div>
        <div>
          <p className="text-4xl font-black leading-none">{estado === 'primera' ? 0 : 3}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{t('daysSequence')}</p>
        </div>
      </div>
    </div>
  )
}
