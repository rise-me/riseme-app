import 'server-only'
import { getTranslations } from 'next-intl/server'
import { mockChallenges } from '@/lib/mock-challenges'
import { getMockDays } from '@/lib/mock-challenge-days'
import { diaNoFuso } from '@/lib/dias'
import type { DayProgress } from '@/lib/progress-server'
import type { ProximaAula } from '@/lib/proxima-aula'
import type { ClaseDeHoyProps } from '@/components/home/ClaseDeHoy'

/** Concluiu alguma aula hoje, no dia DELA (fuso da aluna)? Aula do "Tu cuidado" também conta. */
export function treinouHoje(progress: DayProgress[], tz: string): boolean {
  const hoje = diaNoFuso(new Date(), tz)
  return progress.some((p) => diaNoFuso(new Date(p.completed_at), tz) === hoje)
}

/** O cartão "Tu clase de hoy" pronto para a tela: título e duração da aula no idioma dela. */
export async function montarClaseDeHoy(prox: ProximaAula, jaTreinouHoje: boolean, locale: string): Promise<ClaseDeHoyProps | null> {
  const tDays = await getTranslations('challengeDays')
  const tData = await getTranslations('challengeData')
  const titulos = (tDays.raw(prox.challengeId) as string[] | undefined) ?? []
  const dia = getMockDays(prox.challengeId, titulos, locale)[prox.day - 1]
  if (!dia) return null
  return {
    estado: prox.primeira ? 'primera' : jaTreinouHoje ? 'hecha' : 'hoy',
    href: `/${locale}/challenges/${prox.challengeId}/player/${prox.day}`,
    challengeId: prox.challengeId,
    desafio: tData(`${prox.challengeId}.title`),
    emoji: mockChallenges.find((c) => c.id === prox.challengeId)?.thumbnail_emoji ?? '💪',
    dia: prox.day,
    titulo: dia.title,
    minutos: dia.duration_minutes,
  }
}
