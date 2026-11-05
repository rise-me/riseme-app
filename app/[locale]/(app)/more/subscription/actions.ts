'use server'

// Botão "Cancelar suscripción" do app (Bruno, 05/11/2026, item 4 do plano do mapa do WhatsApp / p3): antes a página só
// mostrava um link para a Hotmart, e só quando a tabela `subscriptions` tinha a linha; quem não achava o caminho era
// cobrada no dia 8 do teste grátis e virava pedido de reembolso. Agora o app lê as assinaturas da aluna na Hotmart pelo
// e-mail da conta (e pelos anteriores) e cancela pela API, com a conferência de que a assinatura é dela.
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/admin-server'
import { assinaturasPorEmail, cancelarAssinaturaHotmart, hotmartConfigurada, type AssinaturaHotmart } from '@/lib/hotmart-api'

/** E-mails da conta logada: o atual + os anteriores (trocados pelo suporte; a Hotmart guarda a assinatura no da compra). */
async function emailsDaContaLogada(): Promise<{ userId: string; emails: string[] } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const anteriores = ((user.user_metadata?.emails_anteriores as string[] | undefined) ?? []).map((e) => e.toLowerCase())
  return { userId: user.id, emails: [...new Set([user.email.toLowerCase(), ...anteriores])] }
}

/** Assinaturas da aluna logada na Hotmart (todas; a página decide o que mostrar). null = Hotmart não configurada/indisponível. */
export async function assinaturasDaAluna(): Promise<AssinaturaHotmart[] | null> {
  if (!hotmartConfigurada()) return null
  const conta = await emailsDaContaLogada()
  if (!conta) return null
  const listas = await Promise.all(conta.emails.map((e) => assinaturasPorEmail(e).catch(() => null)))
  if (listas.every((l) => l === null)) return null
  const vistos = new Set<string>()
  return listas.flatMap((l) => l ?? []).filter((a) => a.codigo && !vistos.has(a.codigo) && vistos.add(a.codigo))
}

export async function cancelarAssinatura(codigo: string, locale: string): Promise<{ ok: true } | { ok: false; erro: 'nao-e-sua' | 'hotmart' | 'sem-login' }> {
  const conta = await emailsDaContaLogada()
  if (!conta) return { ok: false, erro: 'sem-login' }
  // A assinatura precisa estar entre as da aluna logada (nunca cancelar código digitado por terceiros).
  const minhas = (await assinaturasDaAluna()) ?? []
  if (!minhas.some((a) => a.codigo === codigo)) return { ok: false, erro: 'nao-e-sua' }
  const r = await cancelarAssinaturaHotmart(codigo)
  if (!r.ok) {
    console.error(`[assinatura] cancelar ${codigo} falhou (${conta.userId}):`, r.erro)
    return { ok: false, erro: 'hotmart' }
  }
  // O webhook SUBSCRIPTION_CANCELLATION também faz isto; aqui garante na hora (o acesso vale até current_period_end).
  await createServiceClient().from('subscriptions').update({ status: 'canceled' }).eq('stripe_sub_id', codigo).eq('user_id', conta.userId)
  console.log(`[assinatura] cancelada pelo app: ${codigo} (${conta.userId})`)
  revalidatePath(`/${locale}/more/subscription`)
  return { ok: true }
}
