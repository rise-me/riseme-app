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

// A Z-API quer só dígitos com DDI ("5511999999999"), sem "+" nem máscara — ou o LID do
// WhatsApp como veio ("1453…@lid"), que também serve de destino.
export function toZapiPhone(phone: string): string {
  if (phone.endsWith('-group')) return phone // id de grupo ("1203…-group") vai como está
  const d = phone.replace(/\D/g, '')
  return phone.endsWith('@lid') ? `${d}@lid` : d
}

// ── Conexão da instância (14/11/2026) ────────────────────────────────────────────────────────────────────────────
// A Z-API ACEITA mensagem com a instância desconectada e guarda numa fila própria (até 1.000); ao reconectar, solta
// tudo de uma vez. Em 14/11 a Meta restringiu o número por 24 h e, em 2 h, 220 mensagens (67 acessos) foram para essa
// fila marcadas como "enviadas" aqui. Regra: nunca entregar mensagem a uma instância desconectada.
export const DESCONECTADA = 'instância desconectada: nada foi entregue à Z-API'
let _conexao: { em: number; estado: 'conectado' | 'desconectado' | 'incerto'; detalhe: string } | null = null
export async function conexaoZapi(): Promise<{ estado: 'conectado' | 'desconectado' | 'incerto'; detalhe: string }> {
  if (_conexao && Date.now() - _conexao.em < 30_000) return _conexao
  const instance = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  if (!instance || !token) return { estado: 'incerto', detalhe: 'sem env' }
  const headers: Record<string, string> = {}
  if (process.env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN
  let r: { estado: 'conectado' | 'desconectado' | 'incerto'; detalhe: string }
  try {
    const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/status`, { headers })
    const body = (await res.json().catch(() => null)) as { connected?: boolean; smartphoneConnected?: boolean; error?: string } | null
    if (!res.ok || !body || typeof body.connected !== 'boolean') r = { estado: 'incerto', detalhe: `status HTTP ${res.status}` }
    else r = { estado: body.connected ? 'conectado' : 'desconectado', detalhe: body.error || '' }
  } catch (err) {
    r = { estado: 'incerto', detalhe: String(err).slice(0, 120) }
  }
  _conexao = { em: Date.now(), ...r }
  return r
}

/** Fila própria da Z-API (mensagens aceitas e ainda não entregues ao WhatsApp): contar ou limpar. */
export async function filaZapi(acao: 'contar' | 'limpar'): Promise<Record<string, unknown>> {
  const instance = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  if (!instance || !token) return { erro: 'zapi env ausente' }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN
  const url = `https://api.z-api.io/instances/${instance}/token/${token}/queue`
  if (acao === 'limpar') {
    const res = await fetch(url, { method: 'DELETE', headers })
    return { http: res.status, corpo: (await res.text()).slice(0, 300) }
  }
  // contar: pagina a fila (30 por página) sem guardar o texto das mensagens (têm senha)
  let total = 0, paginas = 0, pagingState: string | undefined
  const telefones = new Set<string>()
  let primeiro: unknown = null
  for (; paginas < 60; paginas++) {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ pageSize: 30, ...(pagingState ? { pagingState } : {}) }) })
    const texto = await res.text()
    if (!res.ok) {
      if (paginas === 0) {
        const g = await fetch(url, { headers })
        const gt = await g.text()
        let n: number | null = null
        try { const j = JSON.parse(gt); n = Array.isArray(j) ? j.length : Array.isArray(j?.messages) ? j.messages.length : null } catch { /* fica null */ }
        return { via: 'GET', http: g.status, total: n, postHttp: res.status, postCorpo: texto.slice(0, 200), corpo: n == null ? gt.slice(0, 200) : undefined }
      }
      return { via: 'POST', total, paginas, erro: `HTTP ${res.status} ${texto.slice(0, 200)}` }
    }
    const j = JSON.parse(texto) as { messages?: Record<string, unknown>[]; pagingState?: string; hasMore?: boolean }
    const ms = j.messages ?? (Array.isArray(j) ? (j as unknown as Record<string, unknown>[]) : [])
    if (paginas === 0 && ms[0]) primeiro = Object.keys(ms[0])
    total += ms.length
    for (const m of ms) { const t = String(m.phone ?? m.Phone ?? ''); if (t) telefones.add(t) }
    if (!j.hasMore || !j.pagingState || !ms.length) { paginas++; break }
    pagingState = j.pagingState
  }
  return { via: 'POST', total, telefones: telefones.size, paginas, campos: primeiro }
}

/** Imagem com legenda (Z-API send-image; image = URL pública/assinada ou data:base64). Usado no grupo e no aviso ao responsável. */
export async function sendZapiImage(params: { phone: string; image: string; caption?: string }): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const instance = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  if (!instance || !token) return { ok: false, error: 'zapi env ausente' }
  if ((await conexaoZapi()).estado === 'desconectado') return { ok: false, error: DESCONECTADA }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN
  try {
    const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/send-image`, {
      method: 'POST', headers,
      body: JSON.stringify({ phone: params.phone.includes('-group') ? params.phone : toZapiPhone(params.phone), image: params.image, ...(params.caption ? { caption: params.caption } : {}) }),
    })
    const body = await res.text()
    if (!res.ok) return { ok: false, error: `${res.status} ${body.slice(0, 200)}` }
    return { ok: true, messageId: (JSON.parse(body) as { messageId?: string }).messageId ?? '' }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export async function sendZapiText(params: {
  phone: string
  message: string
  delayTyping?: number // 1–15 s mostrando "digitando..." antes de enviar
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const instance = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  if (!instance || !token) return { ok: false, error: 'zapi env ausente' }
  if ((await conexaoZapi()).estado === 'desconectado') return { ok: false, error: DESCONECTADA }

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

async function zapiCall(method: 'POST' | 'PUT', path: string, body?: unknown): Promise<boolean> {
  const instance = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  if (!instance || !token) return false
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (process.env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN
  try {
    const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    if (!res.ok) console.error(`[zapi] ${method} ${path.split('/')[0]} falhou: ${res.status} ${(await res.text()).slice(0, 150)}`)
    return res.ok
  } catch (err) {
    console.error(`[zapi] ${method} ${path.split('/')[0]} erro:`, err)
    return false
  }
}

/** GET cru na Z-API (JSON ou null). Para operações de grupo que só rodam no servidor. */
export async function zapiGet(path: string): Promise<unknown> {
  const instance = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  if (!instance || !token) return null
  const headers: Record<string, string> = {}
  if (process.env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN
  const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/${path}`, { headers }).catch(() => null)
  if (!res?.ok) return null
  return res.json().catch(() => null)
}

/** Renomeia um grupo (groupId = "<id>-group"). */
export function renomearGrupo(groupId: string, nome: string) {
  return zapiCall('POST', 'update-group-name', { groupId, groupName: nome })
}

/** Enquete num grupo (a Z-API só manda enquete para grupo), com várias respostas. */
export function enviarEnquete(groupId: string, pergunta: string, opcoes: string[]) {
  return zapiCall('POST', 'send-poll', { phone: groupId, message: pergunta, poll: opcoes.map((name) => ({ name })) })
}

/** Ajustes do grupo (a Z-API exige os quatro campos). */
export function ajustarGrupo(a: { phone: string; adminOnlyMessage: boolean; adminOnlySettings: boolean; requireAdminApproval: boolean; adminOnlyAddMember: boolean }) {
  return zapiCall('POST', 'update-group-settings', a)
}

/** O número tem WhatsApp? null = não deu para perguntar (sem env ou Z-API fora). */
export async function temWhatsApp(phone: string): Promise<boolean | null> {
  const instance = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  if (!instance || !token) return null
  const headers: Record<string, string> = {}
  if (process.env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN
  const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/phone-exists/${toZapiPhone(phone)}`, { headers }).catch(() => null)
  if (!res?.ok) return null
  return Boolean(((await res.json().catch(() => ({}))) as { exists?: boolean }).exists)
}

/** Marca a conversa como não lida (aparece como pendente no celular do suporte). */
export function marcarNaoLida(phone: string) {
  return zapiCall('POST', 'modify-chat', { phone, action: 'unread' })
}

/** Etiqueta do WhatsApp Business (ids em GET /tags; criar em POST /business/create-tag). */
export function etiquetar(phone: string, tagId: string, acao: 'add' | 'remove' = 'add') {
  return zapiCall('PUT', `chats/${phone}/tags/${tagId}/${acao}`)
}

async function listarEtiquetas(): Promise<{ id: string; name: string }[]> {
  const instance = process.env.ZAPI_INSTANCE_ID
  const token = process.env.ZAPI_TOKEN
  if (!instance || !token) return []
  const headers: Record<string, string> = {}
  if (process.env.ZAPI_CLIENT_TOKEN) headers['Client-Token'] = process.env.ZAPI_CLIENT_TOKEN
  const res = await fetch(`https://api.z-api.io/instances/${instance}/token/${token}/tags`, { headers }).catch(() => null)
  if (!res?.ok) return []
  const d = (await res.json().catch(() => [])) as { id?: string | number; name?: string }[]
  return (Array.isArray(d) ? d : []).map((t) => ({ id: String(t.id ?? ''), name: t.name ?? '' }))
}

const ETIQUETAS = new Map<string, string>()

/** Id da etiqueta pelo NOME; cria no WhatsApp Business se ainda não existir. */
export async function garantirEtiqueta(nome: string): Promise<string | null> {
  if (ETIQUETAS.has(nome)) return ETIQUETAS.get(nome)!
  let achada = (await listarEtiquetas()).find((t) => t.name === nome)
  if (!achada) {
    await zapiCall('POST', 'business/create-tag', { name: nome })
    achada = (await listarEtiquetas()).find((t) => t.name === nome)
  }
  if (!achada?.id) return null
  ETIQUETAS.set(nome, achada.id)
  return achada.id
}
