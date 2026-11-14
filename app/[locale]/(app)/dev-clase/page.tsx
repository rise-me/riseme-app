import { notFound } from 'next/navigation'
import { ProgressView } from '../progress/ProgressView'
import { montarClaseDeHoy } from '@/lib/clase-hoy-server'
import type { DayProgress } from '@/lib/progress-server'

// SÓ NO COMPUTADOR (npm run dev): a tela inicial INTEIRA com dados de mentira, para ver o "Tu clase de hoy". 404 em produção.
// ?estado=primera|hoy|hecha  ·  &antes=1 mostra a tela como é HOJE (sem o cartão), para comparar.
export default async function DevClase({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { locale } = await params
  const sp = await searchParams
  const estado = (sp.estado ?? 'primera') as 'primera' | 'hoy' | 'hecha'
  const antes = Boolean(sp.antes)
  const tz = 'America/Bogota'

  // Aluna de mentira: nova (nenhuma aula) · 3 aulas até ontem · 3 aulas, a última hoje
  const dia = 864e5
  const feitas = estado === 'primera' ? [] : estado === 'hoy' ? [3, 2, 1] : [2, 1, 0]
  const progress: DayProgress[] = feitas.map((atras, i) => ({
    challenge_id: '1',
    day_number: feitas.length - i,
    watched_pct: 90,
    // eslint-disable-next-line react-hooks/purity -- prévia de desenvolvimento: as datas de mentira partem de "agora"
    completed_at: new Date(Date.now() - atras * dia - 3600_000).toISOString(),
  }))
  const prox = { challengeId: '1', day: feitas.length + 1, feitas: feitas.length, total: 28, primeira: estado === 'primera' }
  const clase = antes ? null : await montarClaseDeHoy(prox, estado === 'hecha', locale)

  return (
    <ProgressView
      locale={locale}
      progress={progress}
      user={{ id: 'previa', realName: 'María', initial: 'M', onboarded: estado !== 'primera' }}
      tz={tz}
      clase={clase}
    />
  )
}
