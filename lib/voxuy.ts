// Entrega do acesso pela Voxuy (WhatsApp que o Bruno já dispara na compra).
// Fluxo: pagamento → webhook RiseMe (cria conta + código) → POST aqui na Voxuy
// com metadata { codigo_acesso, link_acesso } → Voxuy dispara o WhatsApp usando
// essas variáveis (Inserir variável → Venda → Campo metadata (API)).
//
// MULTI-PRODUTO: cada produto tem sua própria mensagem/evento na Voxuy. O mapa
// VOXUY_PRODUCTS liga o CÓDIGO DO PRODUTO ao ID DO EVENTO da Voxuy. Adicionar um
// produto novo = criar o evento na Voxuy + acrescentar uma linha nessa env.
//   VOXUY_PRODUCTS="PPPBF0A2:1176594,OUTROPRODUTO:1234567"
//   (formato: codigoProduto:idEvento — o planId da Voxuy é o próprio código do produto)
//
// URL e TOKEN são da CONTA (um só). Best-effort: se faltar env ou o produto não
// estiver mapeado, apenas loga e segue — a criação da conta NUNCA depende disso
// (backup = recovery por email).

interface VoxuyProduct {
  planId: string
  eventId: number
}

function getVoxuyProduct(productCode: string): VoxuyProduct | null {
  const map = process.env.VOXUY_PRODUCTS ?? ''
  for (const entry of map.split(',')) {
    const [code, eventId] = entry.split(':').map((s) => s?.trim())
    if (code && code === productCode && eventId) {
      return { planId: code, eventId: Number(eventId) }
    }
  }
  return null
}

export async function sendVoxuyAccess(params: {
  productCode: string
  transactionId: string
  name?: string
  email: string
  phone?: string
  code: string
  link: string
}): Promise<void> {
  const url = process.env.VOXUY_WEBHOOK_URL
  const token = process.env.VOXUY_API_TOKEN
  const product = getVoxuyProduct(params.productCode)
  if (!url || !token || !product) {
    console.warn(`[voxuy] pulando WhatsApp — env/produto ausente (produto ${params.productCode}). Backup: email/recovery`)
    return
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiToken: token,
        id: params.transactionId,
        planId: product.planId,
        clientName: params.name ?? '',
        clientEmail: params.email,
        clientPhoneNumber: params.phone ?? '',
        value: 0,
        freight: 0,
        totalValue: 0,
        paymentType: 99,
        status: 99,
        customEvent: product.eventId,
        metadata: {
          codigo_acesso: params.code,
          link_acesso: params.link,
        },
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[voxuy] envio falhou:', res.status, body.slice(0, 200))
    }
  } catch (err) {
    console.error('[voxuy] erro no envio:', err)
  }
}
