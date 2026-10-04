// Cliente mínimo da Z-API (WhatsApp por instância conectada via QR code).
// Doc: developer.z-api.io → message/send-text.
//
// Envs (da INSTÂNCIA, painel Z-API → Instâncias):
//   ZAPI_INSTANCE_ID, ZAPI_TOKEN
//   ZAPI_CLIENT_TOKEN — opcional; só se o "token de segurança da conta" estiver
//   ativado no painel (aí a Z-API exige o header Client-Token em toda chamada).

export function isZapiConfigured(): boolean {
  return Boolean(process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN)
}

// A Z-API quer só dígitos com DDI ("5511999999999"), sem "+" nem máscara.
export function toZapiPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export async function sendZapiText(params: {
  phone: string
  message: string
  delayTyping?: number // 1–15 s mostrando "digitando..." antes de enviar
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const instance = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  if (!instance || !token) return { ok: false, error: 'zapi env ausente' }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN

  try {
    const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/send-text`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        phone: toZapiPhone(params.phone),
        message: params.message,
        ...(params.delayTyping ? { delayTyping: params.delayTyping } : {}),
      }),
    })
    const body = await res.text()
    if (!res.ok) return { ok: false, error: `${res.status} ${body.slice(0, 200)}` }
    const data = JSON.parse(body) as { messageId?: string }
    return { ok: true, messageId: data.messageId ?? '' }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
