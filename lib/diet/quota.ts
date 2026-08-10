// Cota de cardápios por plano — decisão Bruno 2026-08-06:
//   compra vitalícia  → 2 no TOTAL (cortesia incluída na compra)
//   assinatura mensal → 3 por mês-calendário
//   assinatura anual  → 1 por semana (segunda a domingo, UTC)
//   cota esgotada na vitalícia → convite pra assinar (paywall existente)
// Contagem sempre no servidor, em cima de diet_menus (service role) — o app
// nunca decide sozinho se pode gerar.
import { createClient as createAdminClient } from '@supabase/supabase-js'

export type PlanoCota = 'annual' | 'monthly' | 'lifetime' | 'none'

export interface Cota {
  plano: PlanoCota
  limite: number
  usados: number
  restantes: number
  /** true quando esgotou mas renova sozinha (assinante); false = precisa upgrade */
  renova: boolean
}

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

function inicioDoMesUTC(agora: Date): Date {
  return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), 1))
}

function inicioDaSemanaUTC(agora: Date): Date {
  const d = new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()))
  const dow = d.getUTCDay() // 0=domingo
  const diasDesdeSegunda = (dow + 6) % 7
  d.setUTCDate(d.getUTCDate() - diasDesdeSegunda)
  return d
}

/** Resolve o plano da usuária pra fins de cota (assinatura ativa vence a vitalícia). */
async function planoDaUsuaria(userId: string): Promise<PlanoCota> {
  const sb = admin()
  const [{ data: subs }, { data: compras }] = await Promise.all([
    sb
      .from('subscriptions')
      .select('plan_type, current_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'canceled']),
    sb
      .from('user_challenges')
      .select('challenge_id')
      .eq('user_id', userId)
      .eq('access_type', 'lifetime')
      .limit(1),
  ])

  // Cancelada vale até o fim do período pago (mesma regra do getUserAccess).
  const ativas = (subs ?? []).filter(
    (s) => new Date(s.current_period_end as string).getTime() > Date.now()
  )
  if (ativas.some((s) => s.plan_type === 'annual')) return 'annual'
  if (ativas.length > 0) return 'monthly'
  if ((compras ?? []).length > 0) return 'lifetime'
  return 'none'
}

export async function cotaDaUsuaria(userId: string): Promise<Cota> {
  const plano = await planoDaUsuaria(userId)
  const agora = new Date()

  let limite = 0
  let desde: Date | null = null
  let renova = false
  if (plano === 'monthly') {
    limite = 3
    desde = inicioDoMesUTC(agora)
    renova = true
  } else if (plano === 'annual') {
    limite = 1
    desde = inicioDaSemanaUTC(agora)
    renova = true
  } else if (plano === 'lifetime') {
    limite = 2
    desde = null // total, desde sempre
    renova = false
  }

  if (limite === 0) return { plano, limite: 0, usados: 0, restantes: 0, renova: false }

  let query = admin()
    .from('diet_menus')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (desde) query = query.gte('created_at', desde.toISOString())
  const { count } = await query

  const usados = count ?? 0
  return { plano, limite, usados, restantes: Math.max(0, limite - usados), renova }
}
