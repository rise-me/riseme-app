// Cliente da Stripe do app (conta da LLC; 1º uso: CL-PL por link de pagamento, 09/11/2026).
// O app só LÊ sessões de checkout e cria REEMBOLSOS: a chave pode (e deve) ser restrita a isso.
//   STRIPE_SECRET_KEY      chave restrita: Checkout Sessions (leitura) + Refunds (escrita)
//   STRIPE_WEBHOOK_SECRET  whsec_… do endpoint https://riseme.app/api/stripe
// Regras do Bruno para a Stripe (docs/stripe-checkout-plano.md §4b): zero chargeback. Reembolso sem atrito quando a
// aluna pede, e devolução automática no aviso antecipado de fraude (fase de teste). Nunca distribuir reembolso fora disso.
import 'server-only'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/admin-server'

let cliente: Stripe | null = null

export function stripeConfigurada(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export function stripe(): Stripe {
  const chave = process.env.STRIPE_SECRET_KEY
  if (!chave) throw new Error('STRIPE_SECRET_KEY ausente')
  cliente ??= new Stripe(chave)
  return cliente
}

/** Valida a assinatura sobre o corpo CRU (nunca parsear antes). Lança se não bater. */
export function eventoAssinado(corpo: string, assinatura: string | null): Stripe.Event {
  const segredo = process.env.STRIPE_WEBHOOK_SECRET
  if (!segredo) throw new Error('STRIPE_WEBHOOK_SECRET ausente')
  if (!assinatura) throw new Error('sem Stripe-Signature')
  // Só a verificação usa o SDK: não precisa da chave secreta aqui.
  return Stripe.webhooks.constructEvent(corpo, assinatura, segredo)
}

export type OrigemReembolso = 'aluna-whatsapp' | 'aluna-app' | 'aviso-fraude'

export type ResultadoReembolso =
  | { ok: true; refundId: string; status: string; jaExistia: boolean }
  | { ok: false; erro: string; naoEncontrada?: boolean }

/**
 * Pede o reembolso INTEGRAL de uma venda da Stripe. Use só quando a aluna pediu (WhatsApp ou app) ou no aviso de
 * fraude. Idempotente: pedir 2x devolve o mesmo reembolso (Idempotency-Key + reembolso existente).
 * O resultado final (BLIK leva até 2 h e pode falhar) chega pelo webhook; nunca diga "devolvido" com base nisto.
 * Aceita o pi_… (payment intent) ou o cs_… (sessão do checkout).
 */
export async function reembolsarStripe(p: { paymentIntent?: string; sessionId?: string; origem: OrigemReembolso }): Promise<ResultadoReembolso> {
  if (!stripeConfigurada()) return { ok: false, erro: 'STRIPE_SECRET_KEY ausente' }
  const db = createServiceClient()
  const filtro = p.paymentIntent ? { col: 'payment_intent', val: p.paymentIntent } : p.sessionId ? { col: 'session_id', val: p.sessionId } : null
  if (!filtro) return { ok: false, erro: 'informe paymentIntent ou sessionId' }
  const { data: venda } = await db.from('stripe_vendas').select('session_id, payment_intent, reembolso_id, reembolso_status').eq(filtro.col, filtro.val).maybeSingle()
  const pi = (venda?.payment_intent as string | undefined) ?? p.paymentIntent
  if (!pi) return { ok: false, erro: 'venda Stripe não encontrada', naoEncontrada: true }

  // Já pedido e não falhou → o mesmo reembolso (pedido repetido da aluna não gera outro).
  if (venda?.reembolso_id && venda.reembolso_status !== 'failed' && venda.reembolso_status !== 'canceled') {
    return { ok: true, refundId: venda.reembolso_id as string, status: (venda.reembolso_status as string) ?? 'pending', jaExistia: true }
  }

  try {
    const existentes = await stripe().refunds.list({ payment_intent: pi, limit: 10 })
    const vivo = existentes.data.find((r) => r.status !== 'failed' && r.status !== 'canceled')
    const refund = vivo ?? (await stripe().refunds.create(
      { payment_intent: pi, reason: p.origem === 'aviso-fraude' ? 'fraudulent' : 'requested_by_customer', metadata: { origem: p.origem } },
      // Chave por tentativa: um reembolso que FALHOU pode ser pedido de novo; o mesmo pedido repetido não duplica.
      { idempotencyKey: `reembolso-${pi}-${existentes.data.length}` },
    ))
    if (venda) {
      await db.from('stripe_vendas').update({
        reembolso_id: refund.id,
        reembolso_status: refund.status ?? 'pending',
        reembolso_origem: (refund.metadata?.origem as string | undefined) ?? p.origem,
        reembolso_pedido_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('session_id', venda.session_id)
    }
    console.log(`[stripe] reembolso ${refund.id} (${refund.status}) de ${pi}, origem ${p.origem}${vivo ? ', já existia' : ''}`)
    return { ok: true, refundId: refund.id, status: refund.status ?? 'pending', jaExistia: Boolean(vivo) }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Cobrança já totalmente devolvida (ex.: o Bruno devolveu no painel): conta como feito.
    if (/already been refunded|charge_already_refunded/i.test(msg)) {
      const lista = await stripe().refunds.list({ payment_intent: pi, limit: 1 }).catch(() => null)
      const r = lista?.data[0]
      if (r) return { ok: true, refundId: r.id, status: r.status ?? 'succeeded', jaExistia: true }
    }
    console.error(`[stripe] reembolso de ${pi} falhou (origem ${p.origem}):`, msg)
    return { ok: false, erro: msg.slice(0, 300) }
  }
}

/** Vendas Stripe da conta (para o bot e o app saberem se há o que reembolsar). */
export async function vendasStripeDaConta(userId: string): Promise<{
  sessionId: string
  paymentIntent: string | null
  valorCentavos: number | null
  moeda: string | null
  criadaEm: string
  reembolsoStatus: string | null
}[]> {
  const { data } = await createServiceClient()
    .from('stripe_vendas')
    .select('session_id, payment_intent, valor_centavos, moeda, created_at, reembolso_status')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []).map((v) => ({
    sessionId: v.session_id as string,
    paymentIntent: (v.payment_intent as string | null) ?? null,
    valorCentavos: (v.valor_centavos as number | null) ?? null,
    moeda: (v.moeda as string | null) ?? null,
    criadaEm: v.created_at as string,
    reembolsoStatus: (v.reembolso_status as string | null) ?? null,
  }))
}
