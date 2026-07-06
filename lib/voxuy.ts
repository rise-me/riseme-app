// Entrega do acesso pela Voxuy (WhatsApp que o Bruno já dispara na compra).
// Fluxo: pagamento → webhook RiseMe (cria conta + código) → POST aqui na Voxuy
// com metadata { codigo_acesso, link_acesso } → Voxuy dispara o WhatsApp usando
// essas variáveis (Inserir variável → Venda → Campo metadata (API)).
//
// Best-effort: se as envs não estiverem configuradas, apenas loga e segue — a
// criação da conta NUNCA depende disso (backup = recovery por email).
//
// Schema conforme doc da Voxuy: apiToken vai no BODY; valores são inteiros;
// disparo por evento customizado (status 99 + customEvent) pra ter uma automação
// dedicada ao "acesso liberado", sem colidir com outros fluxos.

export async function sendVoxuyAccess(params: {
  transactionId: string
  name?: string
  email: string
  phone?: string
  code: string
  link: string
}): Promise<void> {
  const url = process.env.VOXUY_WEBHOOK_URL
  const token = process.env.VOXUY_API_TOKEN
  const customEvent = process.env.VOXUY_CUSTOM_EVENT_ID
  if (!url || !token || !customEvent) {
    console.warn('[voxuy] envs ausentes (URL/TOKEN/CUSTOM_EVENT) — pulando WhatsApp (backup: email/recovery)')
    return
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiToken: token,
        id: params.transactionId,
        clientName: params.name ?? '',
        clientEmail: params.email,
        clientPhoneNumber: params.phone ?? '',
        value: 0,
        freight: 0,
        totalValue: 0,
        paymentType: 1,
        status: 99,
        customEvent,
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
