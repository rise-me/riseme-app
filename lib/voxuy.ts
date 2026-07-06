// Entrega do acesso pela Voxuy (WhatsApp que o Bruno já dispara na compra).
// Best-effort: se as envs não estiverem configuradas, apenas loga e segue —
// a criação da conta NUNCA depende disso (email/recovery é o backup).
//
// A Voxuy recebe um POST no webhook dela (URL + Token API do painel) e expõe
// os campos de `metadata` como variáveis na mensagem (Inserir variável → Venda →
// Campo metadata (API)). O shape exato é confirmado quando o Bruno ligar a conta.

export async function sendVoxuyAccess(params: {
  name?: string
  email: string
  phone?: string
  code: string
  link: string
}): Promise<void> {
  const url = process.env.VOXUY_WEBHOOK_URL
  const token = process.env.VOXUY_API_TOKEN
  if (!url || !token) {
    console.warn('[voxuy] VOXUY_WEBHOOK_URL/TOKEN ausentes — pulando envio WhatsApp (backup: email/recovery)')
    return
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        token,
        name: params.name ?? '',
        email: params.email,
        phone: params.phone ?? '',
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
