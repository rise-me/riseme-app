// Reembolsos pela Hotmart com aprovação do responsável no WhatsApp (decisão do Bruno, 05/11/2026):
// 1) um pedido de reembolso vira um comando 'reembolsar' aguardando (whatsapp_comandos);
// 2) a lista numerada vai pro WhatsApp do responsável (às 20h ou na hora, se estiver perto do dia 15);
// 3) ele responde "ok 1 2", "ok todos" ou "não 2"; o sistema reembolsa pela API, avisa a aluna no idioma dela
//    e fecha a consulta. Regra do prazo: a garantia da Hotmart é de 15 DIAS; pedido dentro deles nunca pode
//    passar do dia 15 (depois o reembolso é manual, por fora). Perfect Pay não tem API: entra na lista como "no painel".
// Depois de validado, a aprovação vira automática dentro de um teto (escada P5; ainda não).
import { admin, registrarMensagem } from './conversa'
import { reembolsarHotmart } from '@/lib/hotmart-api'
import { sendZapiText, toZapiPhone } from '@/lib/zapi'

export interface PedidoReembolso {
  phone: string // chat dela (dígitos ou LID)
  nome: string
  email: string
  idioma: string
  plataforma: 'hotmart' | 'perfectpay'
  transacao: string
  produto: string
  valor: string // "23434 ARS"
  pagamento: string // CREDIT_CARD, BILLET/MERCADO_PAGO, PIX…
  compradaEm: string // ISO
  motivo: string
  consultaId?: number | null
  numero?: number // posição na última lista enviada
}

const dias = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)

export async function criarPedidoReembolso(p: PedidoReembolso): Promise<number | null> {
  const { data: existe } = await admin().from('whatsapp_comandos').select('id').eq('acao', 'reembolsar').eq('status', 'aguardando').filter('params->>transacao', 'eq', p.transacao).limit(1)
  if (existe?.length) return existe[0].id
  const resumo = `Reembolsar ${p.produto} (${p.valor}) de ${p.nome || p.email}, compra há ${dias(p.compradaEm)} dias — ${p.motivo}`
  const { data, error } = await admin().from('whatsapp_comandos').insert({ pedido: 'reembolso pedido pela aluna no WhatsApp', acao: 'reembolsar', params: p, resumo }).select('id').single()
  if (error) {
    console.error('[reembolsos] criar falhou:', error.message)
    return null
  }
  return data.id
}

export async function reembolsosPendentes(): Promise<{ id: number; params: PedidoReembolso }[]> {
  const { data } = await admin().from('whatsapp_comandos').select('id, params').eq('acao', 'reembolsar').eq('status', 'aguardando').order('id')
  return (data ?? []) as { id: number; params: PedidoReembolso }[]
}

/** Monta a lista numerada, grava o número em cada pedido e manda ao responsável. Devolve o texto (ou null se vazio). */
export async function enviarListaReembolsos(): Promise<string | null> {
  const lista = await reembolsosPendentes()
  const destino = (process.env.WHATSAPP_HANDOFF_PHONE ?? '').replace(/\D/g, '')
  if (!lista.length || !destino) return null
  const linhas: string[] = []
  for (let i = 0; i < lista.length; i++) {
    const { id, params: p } = lista[i]
    const n = i + 1
    await admin().from('whatsapp_comandos').update({ params: { ...p, numero: n } }).eq('id', id)
    const d = dias(p.compradaEm)
    const prazo = d >= 15 ? ' ⛔ *passou dos 15 dias (manual, por fora)*' : d >= 13 ? ` ⚠️ *vence em ${15 - d} dia(s)*` : ''
    const painel = p.plataforma === 'perfectpay' ? ' · 🖐 Perfect Pay: fazer no painel' : ''
    linhas.push(`*${n}* · ${p.nome || p.email} · ${p.produto} ${p.valor} · ${p.pagamento} · comprou há ${d} dias${prazo}${painel}\n   motivo: ${p.motivo}`)
  }
  const msg = [`💸 *Reembolsos aguardando sua aprovação* (${lista.length})`, ...linhas, '', 'Responda *ok 1 2*, *ok todos* ou *não 2*. Aprovado = reembolso na Hotmart pela API + aviso à aluna.'].join('\n')
  const r = await sendZapiText({ phone: destino, message: msg })
  if (!r.ok) {
    console.error('[reembolsos] lista não foi:', r.error)
    return null
  }
  await registrarMensagem({ phone: destino, direction: 'out', author: 'system', body: msg, waMessageId: r.messageId })
  return msg
}

const CONFIRMA: Record<string, (p: PedidoReembolso) => string> = {
  es: (p) => `Listo${p.nome ? ', ' + p.nome.split(' ')[0] : ''}. Tu reembolso de *${p.produto}* (${p.valor}) ya está en proceso en Hotmart (lo aprueban en hasta 7 días).\n\n${/BILLET|MERCADO|PSE|PIX|OXXO|EFECTY|YAPE/i.test(p.pagamento) ? 'Como pagaste por un medio local, el dinero vuelve en hasta 7 días hábiles después de la aprobación (Hotmart puede pedirte por correo los datos para la devolución).' : 'Si pagaste con tarjeta, el dinero aparece en tu factura actual o en la siguiente.'}\n\nGracias por darnos la oportunidad 💛`,
  pl: (p) => `Gotowe${p.nome ? ', ' + p.nome.split(' ')[0] : ''}. Twój zwrot za *${p.produto}* (${p.valor}) jest już w trakcie realizacji w Hotmart (zatwierdzenie do 7 dni).\n\nJeśli płaciłaś kartą, pieniądze pojawią się na bieżącym lub następnym wyciągu.\n\nDziękujemy, że dałaś nam szansę 💛`,
  en: (p) => `Done${p.nome ? ', ' + p.nome.split(' ')[0] : ''}. Your refund for *${p.produto}* (${p.valor}) is now being processed at Hotmart (approved within 7 days).\n\nIf you paid by card, it shows on your current or next statement; local payment methods take up to 7 business days.\n\nThank you for giving us a chance 💛`,
}

async function executarUm(id: number, p: PedidoReembolso): Promise<string> {
  const db = admin()
  if (p.plataforma !== 'hotmart') {
    await db.from('whatsapp_comandos').update({ status: 'cancelado', resultado: 'Perfect Pay: sem API, fazer no painel', decided_at: new Date().toISOString() }).eq('id', id)
    return `${p.numero} · ${p.nome}: Perfect Pay, faça no painel (tirei da lista).`
  }
  const r = await reembolsarHotmart(p.transacao)
  if (!r.ok) {
    await db.from('whatsapp_comandos').update({ status: 'erro', resultado: r.erro, decided_at: new Date().toISOString() }).eq('id', id)
    return `${p.numero} · ${p.nome}: ❌ ${r.erro}`
  }
  const texto = (CONFIRMA[p.idioma] ?? CONFIRMA.es)(p)
  const envio = await sendZapiText({ phone: p.phone, message: texto, delayTyping: 2 })
  if (envio.ok) await registrarMensagem({ phone: toZapiPhone(p.phone), direction: 'out', author: 'human', body: texto, waMessageId: envio.messageId })
  if (p.consultaId) await db.from('whatsapp_consultas').update({ status: 'respondida', orientacao: 'reembolso pela API da Hotmart, aprovado pelo responsável no WhatsApp', resposta_enviada: texto, answered_at: new Date().toISOString() }).eq('id', p.consultaId)
  await db.from('whatsapp_comandos').update({ status: 'executado', resultado: `reembolsado ${p.transacao}; aluna avisada: ${envio.ok ? 'sim' : 'NÃO (' + envio.error + ')'}`, decided_at: new Date().toISOString() }).eq('id', id)
  return `${p.numero} · ${p.nome}: ✅ reembolsado (${p.transacao})${envio.ok ? ', aluna avisada' : ', mas o aviso a ela falhou'}`
}

/** Usado pelo caminho genérico de "sim" (um comando aguardando) — lib/whatsapp-agent/comandos.ts. */
export async function executarReembolso(id: number, p: PedidoReembolso): Promise<string> {
  return executarUm(id, p)
}

const OK = /^(ok|sim|aprova|aprovar|pode|faz|manda)\s+(todos|todas|tudo|[\d\s,e]+)\s*$/i
const NAO = /^(n[aã]o|nao|cancela|recusa|recusar)\s+(todos|todas|tudo|[\d\s,e]+)\s*$/i

/** Resposta do responsável à lista ("ok 1 2", "ok todos", "não 2"). null = não é isso (aí o roteador por intenção decide). */
export async function tratarAprovacaoReembolso(texto: string): Promise<string | null> {
  const t = texto.trim()
  const m = OK.exec(t) ?? NAO.exec(t)
  if (!m) return null
  return aprovarReembolsos({ aprovar: OK.test(t), todos: /^(todos|todas|tudo)$/i.test(m[2]), numeros: (m[2].match(/\d+/g) ?? []).map(Number) })
}

/** Executa (ou recusa) os reembolsos da última lista pelos números; usado pelo atalho acima e pelo roteador por intenção. */
export async function aprovarReembolsos(d: { aprovar: boolean; todos: boolean; numeros: number[] }): Promise<string> {
  const { aprovar, todos } = d
  const lista = await reembolsosPendentes()
  if (!lista.length) return 'Não há reembolso aguardando.'
  const nums = todos ? lista.map((x) => x.params.numero).filter((n): n is number => Boolean(n)) : d.numeros
  const alvo = lista.filter((x) => x.params.numero && nums.includes(x.params.numero))
  if (!alvo.length) return `Não achei esses números na última lista (${lista.map((x) => x.params.numero ?? '?').join(', ')}).`
  const saida: string[] = []
  for (const { id, params } of alvo) {
    if (aprovar) saida.push(await executarUm(id, params))
    else {
      await admin().from('whatsapp_comandos').update({ status: 'cancelado', resultado: 'recusado pelo responsável', decided_at: new Date().toISOString() }).eq('id', id)
      saida.push(`${params.numero} · ${params.nome}: ❎ não reembolsar (a consulta #${params.consultaId ?? '?'} continua com você)`)
    }
  }
  return saida.join('\n')
}
