'use server'

// Botão de reembolso no app (vendas pela Stripe; Bruno 09/11/2026: "se a aluna clicou lá dentro do aplicativo e quer o
// reembolso, o mais simples possível"). Sem pergunta de motivo, sem aprovação: confere que a venda é da aluna logada e
// pede o reembolso na Stripe. A confirmação final sai pelo webhook quando a Stripe disser que foi feito.
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { reembolsarStripe, vendasStripeDaConta } from '@/lib/stripe-api'
import { avisarResponsavel } from '@/lib/stripe-vendas'

export async function pedirReembolso(sessionId: string, locale: string): Promise<{ ok: true } | { ok: false; erro: 'sem-login' | 'nao-e-sua' | 'stripe' }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: 'sem-login' }
  const minhas = await vendasStripeDaConta(user.id)
  if (!minhas.some((v) => v.sessionId === sessionId)) return { ok: false, erro: 'nao-e-sua' }
  const r = await reembolsarStripe({ sessionId, origem: 'aluna-app' })
  if (!r.ok) {
    console.error(`[reembolso-app] ${sessionId} (${user.id}) falhou:`, r.erro)
    await avisarResponsavel(`🚨 Stripe: aluna pediu reembolso NO APP e a Stripe recusou.\n${user.email} · sessão ${sessionId}\nErro: ${r.erro}\nDevolver no painel da Stripe.`)
    return { ok: false, erro: 'stripe' }
  }
  if (!r.jaExistia) await avisarResponsavel(`💸 Stripe: reembolso pedido pela aluna no app (automático).\n${user.email} · ${r.refundId}`)
  revalidatePath(`/${locale}/more/refund`)
  return { ok: true }
}
