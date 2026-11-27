// LISTA NOTURNA DE ANÚNCIOS (Bruno, 26/11/2026). Todo dia às 21h o lançador (~/Ferramentas/lancador-ads) manda a lista dos
// criativos exportados que ainda não subiram; o responsável aprova respondendo em texto livre no WhatsApp; aqui a resposta é
// entendida por IA (responder.ts → interpretarDecisaoLancador), confirmada a ele ("Entendi: …") e guardada para o lançador
// ler. Degrau 1: só sobe o que ele aprovar; sem resposta, nada sobe. Contrato: docs/HANDOFF-LANCADOR-WHATSAPP.md.
// A proposta mora numa linha inerte de whatsapp_outbox (kind 'lancador-proposta', phone 'lancador', body = JSON abaixo).
import { admin, registrarMensagem, consultasPendentes } from './conversa'
import { interpretarDecisaoLancador, type ItemLancador, type LeituraLancador } from './responder'
import { reembolsosPendentes } from './reembolsos'
import { sendZapiText } from '@/lib/zapi'

const KIND = 'lancador-proposta'
const JANELA_MS = 3 * 3_600_000 // a resposta dele vale como resposta à lista por 3 h depois do envio (21h → 00h)

export interface DecisaoLancador { subir: number[]; fora: number[]; segurar_tudo: boolean; observacoes: string; duvida: string | null }
export interface Proposta {
  id: string
  texto: string
  itens: ItemLancador[]
  status: 'aguardando' | 'decidido'
  decisao: DecisaoLancador | null
  historico: { de: 'bruno' | 'bot'; texto: string }[]
  mensagens: string[] // ids das mensagens nossas sobre esta lista (para reconhecer quando ele cita uma delas)
  criado: string
  atualizado: string
}

export function autorizado(header: string | null): boolean {
  const s = process.env.LANCADOR_SECRET
  return Boolean(s) && header === `Bearer ${s}`
}

async function dizer(message: string): Promise<string | null> {
  const destino = process.env.WHATSAPP_HANDOFF_PHONE
  if (!destino) return null
  const r = await sendZapiText({ phone: destino, message })
  if (!r.ok) { console.error('[lancador] mensagem ao responsável falhou:', r.error); return null }
  await registrarMensagem({ phone: destino.replace(/\D/g, ''), direction: 'out', author: 'system', body: message, waMessageId: r.messageId })
  return r.messageId ?? null
}

async function linha(id: string): Promise<{ rowId: number; p: Proposta } | null> {
  const { data } = await admin().from('whatsapp_outbox').select('id, body').eq('kind', KIND).like('body', `%"id":${JSON.stringify(id)}%`).order('id', { ascending: false }).limit(1)
  if (!data?.[0]) return null
  try { return { rowId: data[0].id as number, p: JSON.parse(data[0].body as string) as Proposta } } catch { return null }
}
async function gravar(rowId: number, p: Proposta): Promise<void> {
  await admin().from('whatsapp_outbox').update({ body: JSON.stringify({ ...p, atualizado: new Date().toISOString() }) }).eq('id', rowId)
}

/** Recebe a lista do lançador, guarda e manda ao responsável. Mesmo id de novo = substitui e reenvia. */
export async function receberProposta(e: { id: string; texto: string; itens: ItemLancador[] }): Promise<{ ok: true } | { ok: false; erro: string }> {
  const itens = (e.itens ?? []).filter((i) => Number.isInteger(i?.n) && typeof i?.nome === 'string')
  if (!e.id || !e.texto?.trim() || !itens.length) return { ok: false, erro: 'informe id, texto e itens [{n, nome, …}]' }
  if (new Set(itens.map((i) => i.n)).size !== itens.length) return { ok: false, erro: 'números repetidos em itens' }
  const msgId = await dizer(e.texto.trim())
  if (!msgId) return { ok: false, erro: 'não consegui mandar a lista ao WhatsApp do responsável' }
  const agora = new Date().toISOString()
  const p: Proposta = { id: e.id, texto: e.texto.trim(), itens, status: 'aguardando', decisao: null, historico: [], mensagens: [msgId], criado: agora, atualizado: agora }
  const antiga = await linha(e.id)
  if (antiga) await gravar(antiga.rowId, p)
  else await admin().from('whatsapp_outbox').insert({ phone: 'lancador', kind: KIND, body: JSON.stringify(p), send_after: agora, sent_at: agora, attempts: 5 })
  return { ok: true }
}

export async function decisaoDa(id: string): Promise<{ status: 'aguardando' | 'decidido'; decisao: DecisaoLancador | null; atualizado: string } | null> {
  const l = await linha(id)
  return l ? { status: l.p.status, decisao: l.p.decisao, atualizado: l.p.atualizado } : null
}

/** Resumo final do lançador ("subiram 7, 1 reprovado") para o responsável. */
export async function avisarResultado(id: string, texto: string): Promise<boolean> {
  const msgId = await dizer(texto.trim())
  const l = await linha(id)
  if (l && msgId) await gravar(l.rowId, { ...l.p, mensagens: [...l.p.mensagens, msgId] })
  return Boolean(msgId)
}

// ── O que ele decidiu ────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Nome curto para a confirmação: "AD38_H3-H2-H1_CTAU_…" → "AD38 H3-H2-H1"; "AD12_H1.V10_CTAU_…" → "AD12 H1.V10";
 * "AD48_G2_G56[V21].V42.90_CALI_L" → "V42.90". Com `comAvatar`, soma a avatar ("AD15 H2 AV86") para separar irmãos.
 * 1ª noite real (26/11): "AD12_H1.V10" saía só "V10" e dois "AD15 H2" de avatares diferentes saíam iguais.
 */
function curto(nome: string, comAvatar = false): string {
  const partes = nome.split('_')
  if (/^AD\d/.test(partes[0]) && /^H\d/.test(partes[1] ?? '')) {
    const av = comAvatar ? partes.find((x) => /^AV\d/.test(x) && x !== 'AV0') : undefined
    return `${partes[0]} ${partes[1]}${av ? ` ${av}` : ''}`
  }
  const v = nome.match(/\.(V\d+(?:\.[A-Z0-9]+)*)/)
  return v ? v[1] : partes[0]
}
function rotulo(itens: ItemLancador[], nums: number[]): string {
  const base = itens.map((i) => curto(i.nome))
  const repetido = new Set(base.filter((b, k) => base.indexOf(b) !== k))
  const nomeDe = (i: ItemLancador) => curto(i.nome, repetido.has(curto(i.nome)))
  const sel = itens.filter((i) => nums.includes(i.n))
  const porOferta = new Map<string, ItemLancador[]>()
  for (const i of sel) porOferta.set(i.oferta ?? '', [...(porOferta.get(i.oferta ?? '') ?? []), i])
  return [...porOferta.entries()].map(([of, l]) => `${l.length}${of ? ` ${of}` : ''} (${l.map((i) => `${i.n} ${nomeDe(i)}`).join(', ')})`).join(' + ')
}

/**
 * Aplica a leitura da IA à proposta. Pura (sem banco nem envio): devolve o novo estado e a frase para ele.
 * Confere a leitura contra a lista: número inexistente ou item nos dois lados vira pergunta, nunca chute.
 */
export function aplicarLeitura(p: Proposta, fala: string, r: LeituraLancador): { proposta: Proposta; resposta: string } {
  const todos = p.itens.map((i) => i.n)
  const historico = [...p.historico, { de: 'bruno' as const, texto: fala }]
  const pergunta = (texto: string) => ({ proposta: { ...p, status: 'aguardando' as const, decisao: { subir: [], fora: [], segurar_tudo: false, observacoes: r.observacoes, duvida: texto }, historico: [...historico, { de: 'bot' as const, texto }] }, resposta: `❓ ${texto}\n\nEnquanto você não responder, nada sobe.` })
  if (r.duvida) return pergunta(r.duvida)
  const estranhos = [...r.subir, ...r.fora].filter((n) => !todos.includes(n))
  if (estranhos.length) return pergunta(`Entendi um número que não está na lista (${[...new Set(estranhos)].join(', ')}). Quais itens sobem?`)
  let subir = r.segurarTudo ? [] : [...new Set(r.subir)].sort((a, b) => a - b)
  const nosDois = subir.filter((n) => r.fora.includes(n))
  if (nosDois.length) return pergunta(`Fiquei em dúvida sobre ${rotulo(p.itens, nosDois)}: sobe ou fica fora?`)
  subir = subir.filter((n) => todos.includes(n))
  const fora = todos.filter((n) => !subir.includes(n)) // o que ele não aprovou não sobe
  const decisao: DecisaoLancador = { subir, fora, segurar_tudo: r.segurarTudo || subir.length === 0, observacoes: r.observacoes, duvida: null }
  const linhas = [
    subir.length ? `✅ Entendi: ${subir.length === todos.length ? 'sobem todos, ' : 'sobem '}${rotulo(p.itens, subir)}.` : '✋ Entendi: hoje não sobe nada.',
    subir.length && fora.length ? `Ficam fora: ${rotulo(p.itens, fora)}.` : '',
    r.observacoes ? `📝 Anotei para o lançador tratar com você no chat (não executo sozinho): ${r.observacoes}` : '',
    'Se não for isso, é só me corrigir.',
  ].filter(Boolean)
  const resposta = linhas.join('\n')
  return { proposta: { ...p, status: 'decidido', decisao, historico: [...historico, { de: 'bot', texto: resposta }] }, resposta }
}

/** Há lista aberta para resposta agora? (enviada há menos de 3 h) */
async function propostaAberta(): Promise<{ rowId: number; p: Proposta } | null> {
  const { data } = await admin().from('whatsapp_outbox').select('id, body').eq('kind', KIND).gte('created_at', new Date(Date.now() - 2 * JANELA_MS).toISOString()).order('id', { ascending: false }).limit(3)
  for (const row of data ?? []) {
    try {
      const p = JSON.parse(row.body as string) as Proposta
      if (Date.now() - new Date(p.criado).getTime() < JANELA_MS) return { rowId: row.id as number, p }
    } catch { /* linha estranha */ }
  }
  return null
}

/**
 * Mensagem do responsável: é a resposta à lista de anúncios? true = tratada aqui (ele já ouviu o "Entendi" ou a pergunta).
 * false = não há lista aberta ou a mensagem é sobre outra coisa; o roteador segue o caminho de sempre.
 */
export async function tratarRespostaLancador(fala: string, citada?: string): Promise<boolean> {
  const aberta = await propostaAberta()
  if (!aberta) return false
  const { p } = aberta
  const citou = Boolean(citada && p.mensagens.includes(citada))
  const [consultas, reembolsos] = await Promise.all([consultasPendentes().catch(() => []), reembolsosPendentes().catch(() => [])])
  const outras = [consultas.length ? `${consultas.length} consulta(s) de aluna aguardando resposta dele` : '', reembolsos.length ? `${reembolsos.length} reembolso(s) aguardando aprovação dele` : ''].filter(Boolean).join('; ')
  const leitura = await interpretarDecisaoLancador({ texto: fala, itens: p.itens, historico: p.historico, decisaoAnterior: p.decisao && !p.decisao.duvida ? { subir: p.decisao.subir, fora: p.decisao.fora } : null, outrasPendencias: outras, citouALista: citou })
  if (!leitura.sobreALista && !citou) return false
  const { proposta, resposta } = aplicarLeitura(p, fala, leitura)
  const msgId = await dizer(resposta)
  await gravar(aberta.rowId, { ...proposta, mensagens: msgId ? [...proposta.mensagens, msgId] : proposta.mensagens })
  return true
}

/** Teste no servidor (kind 'teste-agente', campo `lancador`): roda as falas em sequência, sem banco nem envio. */
export async function simularLancador(e: { itens: ItemLancador[]; falas: string[]; outras?: string }): Promise<{ fala: string; sobreALista: boolean; status: string; decisao: DecisaoLancador | null; resposta: string }[]> {
  const agora = new Date().toISOString()
  let p: Proposta = { id: 'teste', texto: '', itens: e.itens, status: 'aguardando', decisao: null, historico: [], mensagens: [], criado: agora, atualizado: agora }
  const saida = []
  for (const fala of e.falas) {
    const leitura = await interpretarDecisaoLancador({ texto: fala, itens: p.itens, historico: p.historico, decisaoAnterior: p.decisao && !p.decisao.duvida ? { subir: p.decisao.subir, fora: p.decisao.fora } : null, outrasPendencias: e.outras ?? '', citouALista: false })
    if (!leitura.sobreALista) { saida.push({ fala, sobreALista: false, status: p.status, decisao: p.decisao, resposta: '(não é sobre a lista: segue o caminho normal do bot)' }); continue }
    const r = aplicarLeitura(p, fala, leitura)
    p = r.proposta
    saida.push({ fala, sobreALista: true, status: p.status, decisao: p.decisao, resposta: r.resposta })
  }
  return saida
}
