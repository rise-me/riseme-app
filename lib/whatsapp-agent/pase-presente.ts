// Pase Completo por um ano, de presente, no lugar do reembolso (Bruno, 06/11/2026).
// Caso: a aluna aceitou uma oferta do Hotmart Recomenda (1 clique na página de obrigado: versão em outro idioma, outro
// desafio) e pede o dinheiro de volta. Em vez de devolver, oferecemos o Pase por um ano, grátis; se ela aceita, o acesso
// entra aqui e os pedidos de reembolso dela que ainda aguardavam o "ok" do responsável são cancelados.
import { mockChallenges } from '@/lib/mock-challenges'
import { admin } from './conversa'
import { marcarNaFila } from '@/lib/whatsapp-outbox'

export const PASE_PRESENTE_DIAS = 365

export async function darPaseUmAno(p: { userId: string; phone: string; origem: string }): Promise<'liberado' | 'ja-tinha' | 'erro'> {
  try {
    const db = admin()
    const fim = new Date(Date.now() + PASE_PRESENTE_DIAS * 86_400_000).toISOString()
    const { data: ativa } = await db.from('subscriptions').select('id, current_period_end').eq('user_id', p.userId).in('status', ['active', 'canceled']).gt('current_period_end', new Date().toISOString()).limit(1)
    const { error: e1 } = await db.from('subscriptions').upsert(
      { user_id: p.userId, stripe_sub_id: `presente:${p.origem}`, status: 'active', plan_type: 'annual', current_period_end: fim },
      { onConflict: 'stripe_sub_id' },
    )
    if (e1) throw e1
    const pagos = mockChallenges.filter((c) => !c.is_free).map((c) => c.id)
    const { error: e2 } = await db.from('user_challenges').upsert(
      pagos.map((cid) => ({ user_id: p.userId, challenge_id: cid, access_type: 'subscription' as const })),
      { onConflict: 'user_id,challenge_id', ignoreDuplicates: true },
    )
    if (e2) throw e2
    await marcarNaFila(p.phone, 'pase-presente', p.origem)
    return ativa?.length ? 'ja-tinha' : 'liberado'
  } catch (err) {
    console.error(`[pase-presente] falhou (${p.phone}):`, err)
    return 'erro'
  }
}

/** A aluna escolheu o Pase: os pedidos de reembolso dela que aguardavam aprovação saem da lista. */
export async function cancelarReembolsosPendentesDela(phone: string, motivo = 'aluna escolheu o Pase Completo por um ano no lugar do reembolso'): Promise<number> {
  const { data } = await admin().from('whatsapp_comandos').select('id').eq('acao', 'reembolsar').eq('status', 'aguardando').filter('params->>phone', 'eq', phone)
  const ids = (data ?? []).map((r) => r.id)
  if (ids.length) await admin().from('whatsapp_comandos').update({ status: 'cancelado', resultado: motivo, decided_at: new Date().toISOString() }).in('id', ids)
  return ids.length
}
