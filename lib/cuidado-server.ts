import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { canAccessBonuses, type UserAccess } from '@/lib/user-access-server'
import {
  aulasDoCuidado,
  cuidadoDaAluna,
  cuidadoLigado,
  PREFIXO_PROGRESSO_CUIDADO,
  TIPOS_CUIDADO,
  type CuidadoDaAluna,
  type TipoCuidado,
} from '@/lib/cuidado'

export interface EstadoCuidado {
  ligado: boolean
  cuidado: CuidadoDaAluna | null // null = perguntar
  // Tipos que ela marcou E que têm aula no idioma dela (só esses aparecem)
  tipos: { tipo: TipoCuidado; aulas: number; feitas: number }[]
}

/** Tudo que a tela do desafio precisa saber do "Tu cuidado" desta aluna. */
export async function estadoCuidado(access: UserAccess, locale: string): Promise<EstadoCuidado> {
  const desligado: EstadoCuidado = { ligado: false, cuidado: null, tipos: [] }
  if (!access.userId) return desligado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return desligado
  const ligado = cuidadoLigado({ admin: user.app_metadata?.role === 'admin', comprou: canAccessBonuses(access), locale })
  if (!ligado) return desligado

  const cuidado = cuidadoDaAluna(user.user_metadata)
  const marcados = TIPOS_CUIDADO.filter((t) => cuidado?.[t])
  if (!marcados.length) return { ligado, cuidado, tipos: [] }

  const feitas = await progressoDoCuidado()
  const tipos = marcados
    .map((tipo) => {
      const aulas = aulasDoCuidado(tipo, locale)
      return { tipo, aulas: aulas.length, feitas: aulas.filter((a) => feitas.has(`${a.progresso.challengeId}/${a.progresso.dayNumber}`)).length }
    })
    .filter((t) => t.aulas > 0)
  return { ligado, cuidado, tipos }
}

/** Aulas do cuidado concluídas pela aluna, como 'cuidado:<desafio>/<dia>'. */
export async function progressoDoCuidado(): Promise<Set<string>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Set()
  const { data } = await supabase
    .from('user_progress')
    .select('challenge_id, day_number')
    .eq('user_id', user.id)
    .like('challenge_id', `${PREFIXO_PROGRESSO_CUIDADO}%`)
  return new Set(((data ?? []) as { challenge_id: string; day_number: number }[]).map((p) => `${p.challenge_id}/${p.day_number}`))
}

/** Pode abrir a página/aula deste tipo? (ligado, marcou o tipo e há aula no idioma) */
export async function podeVerCuidado(access: UserAccess, locale: string, tipo: TipoCuidado): Promise<boolean> {
  const e = await estadoCuidado(access, locale)
  return e.tipos.some((t) => t.tipo === tipo)
}
