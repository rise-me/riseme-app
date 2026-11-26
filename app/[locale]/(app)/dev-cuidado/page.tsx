import { notFound } from 'next/navigation'
import { ChallengeDetailClient } from '../challenges/[id]/ChallengeDetailClient'
import { CuidadoClient } from '../cuidado/[tipo]/CuidadoClient'
import { getTranslations } from 'next-intl/server'
import { mockChallenges } from '@/lib/mock-challenges'
import { getMockDays } from '@/lib/mock-challenge-days'
import { aulasDoCuidado, type TipoCuidado } from '@/lib/cuidado'
import type { EstadoCuidado } from '@/lib/cuidado-server'

// SÓ NO COMPUTADOR (npm run dev): prévia das telas do "Tu cuidado" com dados de mentira, para os prints do Bruno.
// Em produção não existe (404). ?tela=pergunta|cartao|aviso|lista&tipo=rodillas|espalda&simula=1 (aulas que ainda
// não subiram aparecem como se existissem).
export default async function DevCuidado({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { locale } = await params
  const sp = await searchParams
  const tela = sp.tela ?? 'pergunta'
  const tipo = (sp.tipo ?? 'rodillas') as TipoCuidado

  const simuladas = aulasDoCuidado(tipo, locale, Boolean(sp.simula))

  if (tela === 'lista') {
    return <CuidadoClient tipo={tipo} locale={locale} aulas={simuladas.map((a, i) => ({ ...a, feita: i < 2 }))} />
  }

  const base = mockChallenges.find((c) => c.id === '1')!
  const tDays = await getTranslations('challengeDays')
  const days = getMockDays('1', (tDays.raw('1') as string[]) ?? [], locale).map((d) => ({ ...d, completed: d.day_number < 4 }))
  const n = simuladas.length
  const estado: EstadoCuidado =
    tela === 'pergunta'
      ? { ligado: true, cuidado: null, tipos: [] }
      : {
          ligado: true,
          cuidado: { rodillas: true, espalda: tipo === 'espalda', origem: 'quiz', avisado: tela !== 'aviso' },
          tipos: [{ tipo: 'rodillas', aulas: n, feitas: tela === 'cartao' ? 2 : 0 }],
        }
  return (
    <ChallengeDetailClient
      challenge={{ ...base, status: 'active', current_day: 3 }}
      days={days}
      locale={locale}
      cuidado={estado}
    />
  )
}
