// Consulta SÓ LEITURA à API da Hotmart (compras e assinaturas por e-mail), para o agente de WhatsApp enxergar o que
// a Hotmart diz antes de responder sobre dinheiro: cobrança dupla, reembolso pedido, assinatura, tentativas recusadas.
// Até 04/11/2026 essa conferência era manual (Claude no chat, mediana de 25 h); 30 de 57 transferências por dinheiro
// em 30 dias eram "conferir na Hotmart". Decisão do Bruno (04/11/2026): opção 2, API direta, só leitura.
// Reembolso NUNCA sai daqui: é o Bruno, no painel.
//
// Credenciais: HOTMART_CLIENT_ID + HOTMART_CLIENT_SECRET (Hotmart → Ferramentas → Credenciais Hotmart), na Vercel.
// Sem elas, tudo aqui devolve null e o agente segue como antes (pede o e-mail e transfere).
// Doc: developers.hotmart.com → Autenticação (client credentials) · Vendas → Histórico de vendas · Assinaturas → Assinantes.

const TOKEN_URL = 'https://api-sec-vlc.hotmart.com/security/oauth/token'
const API = 'https://developers.hotmart.com/payments/api/v1'

export function hotmartConfigurada(): boolean {
  return Boolean(process.env.HOTMART_CLIENT_ID && process.env.HOTMART_CLIENT_SECRET)
}

let _token: { valor: string; validoAte: number } | null = null

async function token(): Promise<string | null> {
  const id = process.env.HOTMART_CLIENT_ID
  const secret = process.env.HOTMART_CLIENT_SECRET
  if (!id || !secret) return null
  if (_token && _token.validoAte > Date.now() + 60_000) return _token.valor
  const res = await fetch(`${TOKEN_URL}?grant_type=client_credentials&client_id=${encodeURIComponent(id)}&client_secret=${encodeURIComponent(secret)}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
  }).catch(() => null)
  if (!res?.ok) {
    console.error('[hotmart-api] token falhou:', res?.status, (await res?.text().catch(() => ''))?.slice(0, 150))
    return null
  }
  const d = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!d.access_token) return null
  _token = { valor: d.access_token, validoAte: Date.now() + (d.expires_in ?? 3600) * 1000 }
  return _token.valor
}

async function get(path: string, params: Record<string, string>): Promise<Record<string, unknown> | null> {
  const t = await token()
  if (!t) return null
  const q = new URLSearchParams(params).toString()
  const res = await fetch(`${API}/${path}?${q}`, { headers: { Authorization: `Bearer ${t}` } }).catch(() => null)
  if (!res?.ok) {
    console.error(`[hotmart-api] ${path} falhou:`, res?.status, (await res?.text().catch(() => ''))?.slice(0, 150))
    return null
  }
  return (await res.json().catch(() => null)) as Record<string, unknown> | null
}

export interface CompraHotmart {
  transacao: string
  produto: string
  produtoId: number | null
  oferta: string | null
  status: string // status cru da Hotmart (APPROVED, COMPLETE, REFUNDED, PROTESTED, CANCELLED, …)
  valor: number | null
  moeda: string | null
  pagamento: string | null // CREDIT_CARD, BILLET, PIX, PAYPAL, …
  metodo: string | null // MERCADO_PAGO, PSE, …
  assinatura: boolean
  recorrencia: number | null
  pedidoEm: string | null // ISO
  aprovadaEm: string | null // ISO
  garantiaAte: string | null // ISO
}

export interface AssinaturaHotmart {
  codigo: string
  produto: string
  plano: string | null
  status: string // ACTIVE, INACTIVE, DELAYED, CANCELLED_BY_CUSTOMER, …
  trial: boolean
  inicio: string | null
  proximaCobranca: string | null
}

const iso = (ms: unknown) => (typeof ms === 'number' && ms > 0 ? new Date(ms).toISOString() : null)

/** Todas as compras (qualquer status) de um e-mail, da mais recente para a mais antiga. null = sem credencial ou API fora. */
export async function comprasPorEmail(email: string): Promise<CompraHotmart[] | null> {
  // A Hotmart pede janela de datas em algumas contas; primeiro sem, depois com 2 anos.
  let d = await get('sales/history', { buyer_email: email, max_results: '50' })
  if (!d) d = await get('sales/history', { buyer_email: email, max_results: '50', start_date: String(Date.now() - 730 * 86_400_000), end_date: String(Date.now()) })
  if (!d) return null
  const items = (d.items as Record<string, unknown>[] | undefined) ?? []
  return items
    .map((it) => {
      const p = (it.purchase ?? {}) as Record<string, unknown>
      const price = (p.price ?? {}) as Record<string, unknown>
      const pay = (p.payment ?? {}) as Record<string, unknown>
      const prod = (it.product ?? {}) as Record<string, unknown>
      return {
        transacao: String(p.transaction ?? ''),
        produto: String(prod.name ?? ''),
        produtoId: typeof prod.id === 'number' ? prod.id : null,
        oferta: ((p.offer as Record<string, unknown> | undefined)?.code as string | undefined) ?? null,
        status: String(p.status ?? ''),
        valor: typeof price.value === 'number' ? price.value : null,
        moeda: (price.currency_code as string | undefined) ?? null,
        pagamento: (pay.type as string | undefined) ?? null,
        metodo: (pay.method as string | undefined) ?? null,
        assinatura: Boolean(p.is_subscription),
        recorrencia: typeof p.recurrency_number === 'number' ? p.recurrency_number : null,
        pedidoEm: iso(p.order_date),
        aprovadaEm: iso(p.approved_date),
        garantiaAte: iso(p.warranty_expire_date),
      }
    })
    .sort((a, b) => (b.pedidoEm ?? '').localeCompare(a.pedidoEm ?? ''))
}

export async function assinaturasPorEmail(email: string): Promise<AssinaturaHotmart[] | null> {
  const d = await get('subscriptions', { subscriber_email: email, max_results: '20' })
  if (!d) return null
  const items = (d.items as Record<string, unknown>[] | undefined) ?? []
  return items.map((it) => {
    const prod = (it.product ?? {}) as Record<string, unknown>
    const plan = (it.plan ?? {}) as Record<string, unknown>
    return {
      codigo: String(it.subscriber_code ?? ''),
      produto: String(prod.name ?? ''),
      plano: (plan.name as string | undefined) ?? null,
      status: String(it.status ?? ''),
      trial: Boolean(it.trial),
      inicio: iso(it.accession_date),
      proximaCobranca: iso(it.date_next_charge),
    }
  })
}

// Como cada status se lê (em português, para o agente). Fonte: doc da Hotmart + casos reais de out/2026.
const STATUS: Record<string, string> = {
  APPROVED: 'APROVADA (paga)',
  COMPLETE: 'APROVADA e concluída (paga, fora da garantia da Hotmart)',
  REFUNDED: 'REEMBOLSADA (dinheiro devolvido ou a caminho)',
  PARTIALLY_REFUNDED: 'reembolsada em parte',
  PROTESTED: 'REEMBOLSO PEDIDO, em análise na Hotmart (aprova em até 7 dias)',
  CHARGEBACK: 'CONTESTADA no cartão (chargeback)',
  CANCELLED: 'CANCELADA (não foi paga)',
  EXPIRED: 'EXPIRADA (não foi paga)',
  STARTED: 'INICIADA e NÃO paga (checkout aberto ou pagamento não concluído)',
  WAITING_PAYMENT: 'AGUARDANDO pagamento (boleto/PSE/Oxxo não pago)',
  PRINTED_BILLET: 'boleto gerado, NÃO pago',
  PROCESSING_TRANSACTION: 'em processamento',
  UNDER_ANALISYS: 'em análise',
  NO_FUNDS: 'RECUSADA pelo banco (sem fundos) — não foi cobrada',
  OVERDUE: 'atrasada',
  BLOCKED: 'bloqueada',
  PRE_ORDER: 'pré-venda',
}

const fmtData = (s: string | null) => (s ? s.slice(0, 10) : '?')

/**
 * Bloco em português para o perfil do agente: o que a Hotmart diz sobre esse e-mail. null = sem credencial/API fora
 * (o agente então segue sem ver a Hotmart). Lista TUDO, inclusive tentativas não pagas: é isso que explica "cobraram
 * duas vezes" (quase sempre 1 aprovada + tentativas recusadas) sem pedir print atrás de print.
 */
export async function resumoHotmart(email: string): Promise<string | null> {
  const [compras, assinaturas] = await Promise.all([comprasPorEmail(email), assinaturasPorEmail(email)])
  if (!compras) return null
  const hoje = Date.now()
  const linhas: string[] = []
  if (!compras.length) linhas.push(`Nenhuma compra na Hotmart com o e-mail ${email} (nem aprovada, nem tentativa).`)
  for (const c of compras) {
    const dias = c.pedidoEm ? Math.floor((hoje - new Date(c.pedidoEm).getTime()) / 86_400_000) : null
    linhas.push(
      `- ${fmtData(c.pedidoEm)}${dias !== null ? ` (há ${dias} dias)` : ''} · ${c.produto}${c.oferta ? ` [oferta ${c.oferta}]` : ''} · ` +
        `${c.valor !== null ? `${c.valor} ${c.moeda ?? ''}` : 'valor ?'} · ${c.pagamento ?? '?'}${c.metodo ? `/${c.metodo}` : ''} · ` +
        `${STATUS[c.status] ?? c.status} · transação ${c.transacao}${c.assinatura ? ` · assinatura, cobrança nº ${c.recorrencia ?? '?'}` : ''}`,
    )
  }
  const pagas = compras.filter((c) => ['APPROVED', 'COMPLETE'].includes(c.status))
  const naoPagas = compras.filter((c) => ['STARTED', 'CANCELLED', 'EXPIRED', 'NO_FUNDS', 'WAITING_PAYMENT', 'PRINTED_BILLET'].includes(c.status))
  const resumo = `Resumo: ${pagas.length} compra(s) PAGA(S)${pagas.length ? ` (${pagas.map((c) => c.produto).join('; ')})` : ''}; ` +
    `${naoPagas.length} tentativa(s) NÃO paga(s); ${compras.filter((c) => c.status === 'REFUNDED').length} reembolsada(s); ` +
    `${compras.filter((c) => c.status === 'PROTESTED').length} reembolso(s) em análise.`
  const ass = (assinaturas ?? []).map(
    (a) => `- ${a.produto}${a.plano ? ` (${a.plano})` : ''} · status ${a.status}${a.trial ? ' · em TRIAL' : ''} · início ${fmtData(a.inicio)} · próxima cobrança ${fmtData(a.proximaCobranca)} · código ${a.codigo}`,
  )
  return [
    `HOTMART (consultado agora pelo e-mail ${email}; é o que a Hotmart REALMENTE registra, use como fato):`,
    ...linhas,
    resumo,
    ass.length ? 'Assinaturas:' : 'Assinaturas: nenhuma.',
    ...ass,
  ].join('\n')
}
