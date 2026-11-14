// "Tu clase de hoy": a primeira tela do app (Progreso) abre com UM botão que leva direto à próxima aula.
// Por quê (medido 14/11/2026, contas de 10/10–06/11): de cada 100 compradoras, 80 entram no app e só 36 concluem
// uma aula na 1ª semana; a tela inicial mostrava contadores zerados e a aula 1 ficava a ~4 toques.
// Plano e medição: docs/primeira-aula.md.
import { mockChallenges } from './mock-challenges'
import type { DayProgress } from './progress-server'
import type { UserAccess } from './user-access-server'
import { PREFIXO_PROGRESSO_CUIDADO } from './cuidado'

// ES e PL primeiro (mesma regra do "Tu cuidado"); outro idioma entra quando o texto dele for revisado.
export const CLASE_HOY_IDIOMAS = ['es', 'pl']

export interface ProximaAula {
  challengeId: string
  day: number // próxima aula a fazer (1 = nunca treinou neste desafio)
  feitas: number
  total: number
  primeira: boolean // nunca concluiu NENHUMA aula de desafio (compradora nova)
}

function podeAbrir(id: string, access: UserAccess): boolean {
  const c = mockChallenges.find((x) => x.id === id)
  if (!c) return false
  return c.is_free || access.hasActiveSubscription || access.ownedChallengeIds.has(id)
}

/**
 * Qual aula o botão abre: continua o desafio em que ela treinou por último; se nunca treinou, o desafio que ela
 * comprou (o de menor número primeiro). Desafio terminado não entra. null = nada para oferecer.
 * A aula é sempre a seguinte à última concluída: é a única que a trava de ordem do player deixa abrir.
 */
export function proximaAula(progress: DayProgress[], access: UserAccess): ProximaAula | null {
  const reais = progress.filter((p) => !p.challenge_id.startsWith(PREFIXO_PROGRESSO_CUIDADO) && mockChallenges.some((c) => c.id === p.challenge_id))
  const feitasPor = new Map<string, number>()
  for (const p of reais) feitasPor.set(p.challenge_id, (feitasPor.get(p.challenge_id) ?? 0) + 1)

  const total = (id: string) => mockChallenges.find((c) => c.id === id)?.days_count ?? 0
  const aberto = (id: string) => podeAbrir(id, access) && (feitasPor.get(id) ?? 0) < total(id)

  // progress vem do mais recente para o mais antigo
  const recentes = [...new Set(reais.map((p) => p.challenge_id))]
  const comprados = mockChallenges.map((c) => c.id).filter((id) => access.ownedChallengeIds.has(id))
  const doPase = access.hasActiveSubscription ? mockChallenges.map((c) => c.id) : []
  const id = [...recentes, ...comprados, ...doPase].find(aberto)
  if (!id) return null

  const feitas = feitasPor.get(id) ?? 0
  return { challengeId: id, day: feitas + 1, feitas, total: total(id), primeira: reais.length === 0 }
}
