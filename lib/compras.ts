// Registro de cada venda aprovada (tabela purchases, que existia sem uso) para o estorno não apagar o acesso de
// quem tem OUTRA compra válida do mesmo produto. Caso real (20/10/2026): Beata (CL-PL) pagou 2x; o estorno da
// cobrança duplicada apagou o acesso da compra que valia. Vale para Perfect Pay e Hotmart.
import type { SupabaseClient } from '@supabase/supabase-js'

export async function registrarCompra(db: SupabaseClient, p: { userId: string; produto: string; venda: string; valorCentavos?: number }) {
  const { error } = await db.from('purchases').upsert(
    { user_id: p.userId, product_id: p.produto, stripe_payment_id: p.venda, amount: Math.round(p.valorCentavos ?? 0) },
    { onConflict: 'stripe_payment_id', ignoreDuplicates: true },
  )
  if (error) console.error(`[compras] não registrou ${p.venda}:`, error.message)
}

/** Apaga o registro desta venda e diz se o acesso deve cair: só quando não sobra outra compra do mesmo produto. */
export async function deveRevogar(db: SupabaseClient, p: { userId: string; produto: string; venda: string }): Promise<boolean> {
  await db.from('purchases').delete().eq('stripe_payment_id', p.venda)
  const { count } = await db.from('purchases').select('id', { count: 'exact', head: true }).eq('user_id', p.userId).eq('product_id', p.produto)
  // Sobrou compra registrada do mesmo produto → mantém o acesso. Sem registro nenhum (venda de antes deste
  // registro existir) → comportamento antigo: revoga.
  return !count
}
