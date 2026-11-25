// Atendimento por E-MAIL (14/11/2026). A Meta restringiu o WhatsApp do suporte por 24 h no pico do CL-PL; Bruno: "um e-mail
// profissional que envia e recebe, ligado a você, similar ao WhatsApp, de modo que ninguém fique sem acesso".
//
// Como funciona: o Resend recebe o que chega em qualquer endereço @riseme.app (pomoc@ = polonês, ayuda@ = espanhol) e avisa
// POST /api/email-suporte (evento email.received, só metadados). Aqui o e-mail é buscado de volta no Resend (é isso que
// prova que o aviso é verdadeiro), a aluna é achada pelo endereço, o MESMO cérebro do WhatsApp decide (decidirResposta,
// canal 'email') e a resposta sai por e-mail na mesma conversa. Ações: reenviar acesso (e-mail novo com a senha de sempre) e
// reembolso automático da Stripe (regra do Bruno de 09/11, mantida). O que precisa de pessoa vai por e-mail ao ALERTA_EMAIL.
//
// Histórico: linhas inertes em whatsapp_outbox (kind 'email-in' / 'email-out', phone = endereço da aluna, body = JSON).
// Fica separado de whatsapp_messages de propósito: nada do fluxo do WhatsApp varre essas linhas.

import { admin, aprendizadosAtivos, perfilDaAluna, criarConsulta, fecharConsulta, salvarAprendizado, type ConsultaAberta } from '@/lib/whatsapp-agent/conversa'
import { decidirResposta, redigirRespostaAprovada, type MensagemConversa } from '@/lib/whatsapp-agent/responder'
import { textoReembolsoStripe, registrarPedidoReembolso, reembolsoPrometido } from '@/lib/whatsapp-agent/reembolsos'
import { acharCompra, notaCompraAchada, type CompraAchada } from '@/lib/whatsapp-agent/achar-compra'
import { trocarEmail, KIND_EMAIL_TROCADO } from '@/lib/whatsapp-agent/acesso'
import { reembolsarStripe } from '@/lib/stripe-api'
import { buildAccessLink } from '@/lib/access-code'
import { senhaDaConta } from '@/lib/senha-conta'
import { sendAccessEmail } from '@/lib/email'

export const KIND_IN = 'email-in'
export const KIND_OUT = 'email-out'
const KIND_REENVIO = 'acesso-reenviado' // o mesmo do WhatsApp (trava de 2 h), aqui com phone = endereço
const MAX_RESPOSTAS_DIA = 8 // contra laço com resposta automática do outro lado
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://riseme.app'

/** Endereço do suporte por idioma. Todos caem na mesma caixa (qualquer nome @riseme.app chega). */
import { EMAIL_SUPORTE as ENDERECO_SUPORTE, emailSuporte as enderecoSuporte } from '@/lib/suporte' // fonte única dos endereços
export { ENDERECO_SUPORTE, enderecoSuporte }
const ASSINATURA: Record<string, string> = { pl: 'Zespół RiseMe', es: 'Equipo RiseMe', 'pt-BR': 'Equipe RiseMe', en: 'RiseMe Team', it: 'Il team RiseMe', cs: 'Tým RiseMe', tr: 'RiseMe Ekibi', ro: 'Echipa RiseMe', nl: 'Team RiseMe' }
const ASSUNTO_PADRAO: Record<string, string> = { pl: 'Twoja wiadomość do RiseMe', es: 'Tu mensaje a RiseMe', en: 'Your message to RiseMe' }

// ── Texto do bot (formato do WhatsApp) → e-mail ─────────────────────────────────────────────────────────────────
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
function paraHtml(texto: string): string {
  return esc(texto)
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#1a1a1a;font-weight:600;">$1</a>')
    .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/gm, '$1<i>$2</i>')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1a1a1a;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('\n')
}
const paraTexto = (texto: string) => texto.replace(/\*([^*\n]+)\*/g, '$1').replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/gm, '$1$2')

/** Moldura da marca (a mesma do e-mail de acesso): cabeçalho preto RiseMe, cartão branco, botão opcional. */
export function htmlEmail(p: { texto: string; titulo?: string; botao?: { rotulo: string; link: string }; rodape?: string; previa?: string }): string {
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  ${p.previa ? `<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(p.previa)}</span>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
        <tr><td style="background:#1a1a1a;padding:24px 32px;">
          <div style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">RiseMe</div>
        </td></tr>
        <tr><td style="padding:32px;">
          ${p.titulo ? `<h1 style="margin:0 0 20px;font-size:22px;font-weight:800;line-height:1.25;">${esc(p.titulo)}</h1>` : ''}
          ${paraHtml(p.texto)}
          ${p.botao ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;"><tr><td align="center">
            <a href="${p.botao.link}" style="display:block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px;border-radius:16px;text-align:center;">${esc(p.botao.rotulo)}</a>
          </td></tr></table>` : ''}
        </td></tr>
        ${p.rodape ? `<tr><td style="padding:20px 32px;border-top:1px solid #eee;"><p style="margin:0;font-size:12px;line-height:1.5;color:#999;">${esc(p.rodape)}</p></td></tr>` : ''}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export type ResultadoEnvio = { ok: true; id: string | null } | { ok: false; erro: string }

/** Manda um e-mail do suporte (resposta do bot, resposta manual pelo chat, aviso às alunas). Registra em 'email-out'. */
export async function enviarEmailSuporte(p: {
  para: string
  assunto: string
  texto: string // formato do WhatsApp (*negrito*, linhas em branco entre blocos)
  idioma?: string
  de?: string // endereço @riseme.app; padrão = o do idioma
  titulo?: string
  botao?: { rotulo: string; link: string }
  rodape?: string
  emRespostaA?: string | null // Message-ID do e-mail dela (mantém a conversa junta no cliente de e-mail)
  auto?: boolean // true = resposta do bot (conta no teto diário)
  registrar?: boolean
}): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, erro: 'RESEND_API_KEY ausente' }
  const de = p.de ?? enderecoSuporte(p.idioma)
  const assinatura = ASSINATURA[p.idioma ?? ''] ?? 'RiseMe'
  const corpo = `${p.texto.trim()}\n\n${assinatura}`
  const headers: Record<string, string> = {}
  if (p.emRespostaA) { headers['In-Reply-To'] = p.emRespostaA; headers.References = p.emRespostaA }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: `RiseMe <${de}>`,
        to: [p.para],
        reply_to: de,
        subject: p.assunto,
        html: htmlEmail({ texto: corpo, titulo: p.titulo, botao: p.botao, rodape: p.rodape, previa: paraTexto(p.texto).slice(0, 110) }),
        text: paraTexto(corpo) + (p.botao ? `\n\n${p.botao.rotulo}: ${p.botao.link}` : ''),
        ...(Object.keys(headers).length ? { headers } : {}),
      }),
    })
    const txt = await res.text()
    if (!res.ok) return { ok: false, erro: `Resend ${res.status}: ${txt.slice(0, 200)}` }
    const id = (JSON.parse(txt) as { id?: string }).id ?? null
    if (p.registrar !== false) await gravar(p.para, KIND_OUT, { assunto: p.assunto, texto: p.texto, resendId: id, de, auto: Boolean(p.auto) })
    return { ok: true, id }
  } catch (err) {
    return { ok: false, erro: String(err).slice(0, 200) }
  }
}

async function gravar(endereco: string, kind: string, corpo: Record<string, unknown>): Promise<number | null> {
  const agora = new Date().toISOString()
  const { data, error } = await admin().from('whatsapp_outbox').insert({ phone: endereco.toLowerCase(), kind, body: JSON.stringify(corpo), send_after: agora, sent_at: agora, attempts: 5 }).select('id').single()
  if (error) console.error(`[email-suporte] falha ao gravar ${kind}:`, error.message)
  return (data?.id as number | undefined) ?? null
}

/** Aviso à equipe (o que o bot não resolve sozinho). Vai ao ALERTA_EMAIL; o WhatsApp do responsável pode estar fora. */
async function avisarEquipe(assunto: string, linhas: string[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const para = process.env.ALERTA_EMAIL
  console.log(`[email-suporte] aviso à equipe: ${assunto}`)
  if (!apiKey || !para) return
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ from: process.env.RESEND_FROM ?? 'RiseMe <acesso@riseme.app>', to: para.split(',').map((e) => e.trim()).filter(Boolean), subject: `📧 Suporte por e-mail: ${assunto}`.slice(0, 180), text: linhas.filter(Boolean).join('\n') }),
  }).catch(() => null)
}

// ── E-mail recebido ─────────────────────────────────────────────────────────────────────────────────────────────
interface Recebido { id: string; de: string; nome: string | null; para: string[]; assunto: string; texto: string; html: string | null; messageId: string | null; headers: Record<string, string>; anexos: number }

async function buscarRecebido(id: string): Promise<Recebido | { erro: string }> {
  // A chave de ENVIO (RESEND_API_KEY) é restrita a enviar: ler o e-mail recebido pede uma chave de acesso total, à parte
  // (RESEND_INBOUND_KEY), para não mexer na que entrega os acessos.
  const apiKey = process.env.RESEND_INBOUND_KEY ?? process.env.RESEND_API_KEY
  if (!apiKey) return { erro: 'RESEND_INBOUND_KEY ausente' }
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${apiKey}` } })
  const txt = await res.text()
  if (!res.ok) return { erro: `Resend ${res.status}: ${txt.slice(0, 200)}` }
  const j = JSON.parse(txt) as { from?: string; to?: string[] | string; subject?: string; text?: string | null; html?: string | null; message_id?: string; headers?: Record<string, string> | { name: string; value: string }[]; attachments?: unknown[] }
  const bruto = j.from ?? ''
  const endereco = bruto.match(/<([^<>\s]+@[^<>\s]+)>/)?.[1] ?? bruto.match(/[^\s<>"]+@[^\s<>"]+/)?.[0] ?? ''
  const nomeRemetente = bruto.includes('<') ? bruto.slice(0, bruto.indexOf('<')).replace(/"/g, '').trim() : ''
  const headers: Record<string, string> = {}
  if (Array.isArray(j.headers)) for (const h of j.headers) headers[String(h.name).toLowerCase()] = String(h.value)
  else for (const [k, v] of Object.entries(j.headers ?? {})) headers[k.toLowerCase()] = String(v)
  const texto = (j.text && j.text.trim()) || textoDoHtml(j.html ?? '')
  return {
    id,
    de: endereco.toLowerCase().trim(),
    nome: nomeRemetente || null,
    para: (Array.isArray(j.to) ? j.to : [j.to ?? '']).map((t) => String(t).toLowerCase().replace(/^.*<|>.*$/g, '').trim()).filter(Boolean),
    assunto: (j.subject ?? '').trim(),
    texto,
    html: j.html ?? null,
    messageId: j.message_id ?? headers['message-id'] ?? null,
    headers,
    anexos: j.attachments?.length ?? 0,
  }
}

const textoDoHtml = (html: string, semBlocoCitado = false) =>
  (semBlocoCitado ? html.replace(/<blockquote[\s\S]*<\/blockquote>/gi, '\n').replace(/<div[^>]+class="[^"]*(gmail_quote|moz-cite-prefix|yahoo_quoted)[^"]*"[\s\S]*$/i, '') : html)
    .replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

/**
 * O que ela escreveu agora, sem a citação. Caso de origem (15/11/2026): 2 respostas ao aviso chegaram "vazias" e ficaram sem
 * resposta. Webmails poloneses (onet, op) deixam a resposta ABAIXO da citação ou só no HTML; cortar no 1º sinal de citação
 * jogava tudo fora. Ordem: resposta no topo → HTML sem o bloco citado → linhas fora da citação, abaixo dela.
 */
export function textoDela(texto: string, html?: string | null): string {
  const topo = semCitacao(texto)
  if (topo) return topo
  if (html) {
    const semBloco = semCitacao(textoDoHtml(html, true))
    if (semBloco) return semBloco
  }
  const CABECALHO = /^(On .{5,120} wrote:|W dniu .{5,160}(pisze|napisa[łl]\w*(\(a\))?):?|Dnia .{5,160}(pisze|napisa[łl]\w*(\(a\))?):?|El .{5,160} escribi[oó]:|Em .{5,160} escreveu:|(Od|From|De|Do|To|Para|Temat|Subject|Asunto|Data|Date|Fecha):\s.*)$/i
  const linhas = texto.replace(/\r/g, '').split('\n').map((l) => l.trim())
  const temCitacaoMarcada = linhas.some((l) => l.startsWith('>'))
  if (!temCitacaoMarcada) return '' // sem ">" não dá para separar o que é dela do que é nosso
  return linhas.filter((l) => l && !l.startsWith('>') && !CABECALHO.test(l) && !/^-{2,}|^_{8,}$/.test(l)).join('\n').trim()
}

/** Tira a citação da resposta ("W dniu … pisze:", "> …") e deixa só o que ela escreveu agora. */
export function semCitacao(texto: string): string {
  const linhas = texto.replace(/\r/g, '').split('\n')
  const corte = linhas.findIndex((l) => {
    const t = l.trim()
    return /^>/.test(t) ||
      /^(On .{5,120} wrote:|W dniu .{5,160}(pisze|napisa[łl]\w*(\(a\))?):?|Dnia .{5,160}(pisze|napisa[łl]\w*(\(a\))?):?|El .{5,160} escribi[oó]:|Em .{5,160} escreveu:|Il giorno .{5,160} ha scritto:)$/i.test(t) ||
      /^-{2,}\s*(Original Message|Wiadomość oryginalna|Mensaje original|Mensagem original|Forwarded message)/i.test(t) ||
      /^_{8,}$/.test(t) ||
      /^(Od|From|De):\s.*@/i.test(t)
  })
  return (corte >= 0 ? linhas.slice(0, corte) : linhas).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function ehAutomatico(r: Recebido): string | null {
  const h = r.headers
  if (/^(mailer-daemon|postmaster|no-?reply|noreply|bounces?|notifications?)@/i.test(r.de)) return 'remetente automático'
  if (/@riseme\.app$/i.test(r.de)) return 'nosso próprio domínio'
  if (h['auto-submitted'] && !/^no$/i.test(h['auto-submitted'])) return 'auto-submitted'
  if (h['x-autoreply'] || h['x-autorespond'] || h['x-auto-response-suppress']) return 'resposta automática'
  if (/^(bulk|junk|list)$/i.test(h.precedence ?? '') || h['list-unsubscribe'] || h['list-id']) return 'lista/boletim'
  if (/^(auto(matic)? ?(reply|response)|autoreply|out of office|undeliver|delivery status|automatyczna odpowied|autoodpowied|respuesta autom|fuera de la oficina)/i.test(r.assunto)) return 'assunto de resposta automática'
  return null
}

async function conversaDoEndereco(endereco: string): Promise<MensagemConversa[]> {
  const { data } = await admin().from('whatsapp_outbox').select('kind, body, created_at').eq('phone', endereco).in('kind', [KIND_IN, KIND_OUT]).order('id', { ascending: false }).limit(20)
  const conversa: MensagemConversa[] = []
  for (const r of (data ?? []).reverse()) {
    try {
      const b = JSON.parse(r.body as string) as { texto?: string; assunto?: string; ignorado?: string }
      if (b.ignorado || !b.texto) continue
      conversa.push({ autor: r.kind === KIND_IN ? 'student' : 'agent', texto: r.kind === KIND_IN && b.assunto && !/^re:/i.test(b.assunto) ? `[Assunto: ${b.assunto}]\n${b.texto}` : b.texto, em: r.created_at as string })
    } catch { /* linha estranha: fica de fora */ }
  }
  return conversa
}

/** Processa um e-mail recebido (id do Resend). Nunca lança. Devolve um resumo curto para o log. */
export async function processarEmailRecebido(emailId: string): Promise<string> {
  const r = await buscarRecebido(emailId)
  if ('erro' in r) {
    // Não deu para ler o e-mail (chave sem permissão de leitura, id falso): nada é respondido; a equipe fica sabendo.
    await avisarEquipe('não consegui ler um e-mail recebido', [`id ${emailId}`, r.erro, 'Se for "restricted_api_key": falta gravar na Vercel a RESEND_INBOUND_KEY (chave do Resend com acesso total).'])
    return `erro ao ler ${emailId}: ${r.erro}`
  }
  if (!r.de.includes('@')) return `sem remetente (${emailId})`
  const db = admin()
  const texto = textoDela(r.texto, r.html).slice(0, 4000) + (r.anexos ? `\n[A aluna anexou ${r.anexos} arquivo(s); por e-mail o sistema ainda não abre anexos.]` : '')
  const auto = ehAutomatico(r)
  // Grava primeiro (o Resend reenvia o aviso se demorarmos): quem gravou a 1ª linha deste id é quem responde.
  const meu = await gravar(r.de, KIND_IN, { id: r.id, para: r.para, assunto: r.assunto, texto, messageId: r.messageId, ...(auto ? { ignorado: auto } : {}) })
  const { data: iguais } = await db.from('whatsapp_outbox').select('id').eq('phone', r.de).eq('kind', KIND_IN).like('body', `%"id":"${r.id}"%`).order('id').limit(1)
  if (meu && iguais?.[0] && iguais[0].id !== meu) return `repetido (${emailId})`
  if (auto) return `ignorado: ${auto} (${r.de})`
  if (!texto.trim()) {
    // Chegou sem texto nenhum (só a citação, ou enviado em branco): em vez de silêncio, pede a dúvida. 1 vez por dia por endereço.
    const lingua = r.para.some((t) => t.startsWith('pomoc@')) || /\.pl$/i.test(r.de) ? 'pl' : 'es'
    const { count: jaPediu } = await db.from('whatsapp_outbox').select('id', { count: 'exact', head: true }).eq('phone', r.de).eq('kind', KIND_OUT).gte('created_at', new Date(Date.now() - 24 * 3_600_000).toISOString()).like('body', '%"vazio":true%')
    if ((jaPediu ?? 0) > 0) return `vazio de novo (${r.de})`
    const pedido = lingua === 'pl'
      ? 'Cześć! Dostaliśmy Twoją wiadomość, ale dotarła do nas bez treści. Napisz proszę jeszcze raz, w czym możemy pomóc (dostęp, logowanie, aplikacja, zwrot), a od razu się tym zajmiemy. 💚'
      : '¡Hola! Recibimos tu mensaje, pero nos llegó sin texto. Escríbenos de nuevo contándonos en qué te ayudamos (acceso, inicio de sesión, la app, reembolso) y lo vemos enseguida. 💛'
    const env = await enviarEmailSuporte({ para: r.de, assunto: /^re:/i.test(r.assunto) ? r.assunto : `Re: ${r.assunto || ASSUNTO_PADRAO[lingua]}`, texto: pedido, idioma: lingua, emRespostaA: r.messageId, auto: true, registrar: false })
    if (env.ok) await gravar(r.de, KIND_OUT, { assunto: r.assunto, texto: pedido, resendId: env.id, auto: true, vazio: true })
    return `vazio: pedi a dúvida (${r.de})`
  }

  const desde = new Date(Date.now() - 24 * 3_600_000).toISOString()
  const { count: respostas } = await db.from('whatsapp_outbox').select('id', { count: 'exact', head: true }).eq('phone', r.de).eq('kind', KIND_OUT).gte('created_at', desde).like('body', '%"auto":true%')
  if ((respostas ?? 0) >= MAX_RESPOSTAS_DIA) {
    await avisarEquipe(`${r.de} passou de ${MAX_RESPOSTAS_DIA} respostas em 24 h`, [`Parei de responder sozinho a ${r.de}.`, `Última mensagem dela:`, texto.slice(0, 1500)])
    return `teto diário (${r.de})`
  }

  // Quem é: conta com este e-mail; senão e-mail citado; senão a compra é PROCURADA (e-mail parecido, código, telefone, nome).
  const conversaAntes = await conversaDoEndereco(r.de)
  const quem = await identificar(r.de, r.nome, conversaAntes, true)
  const userId = quem.userId
  let emailConta = quem.emailConta
  // Achada só pelo NOME: prova fraca; o bot vê a compra, mas trata como conta não confirmada (não revela dados dela).
  const perfil = userId ? await perfilDaAluna(userId, quem.achada?.como !== 'nome', null).catch(() => null) : null
  if (perfil) {
    const nota = quem.achada ? notaCompraAchada(quem.achada, { de: r.de, corrigido: quem.corrigido, emailAntigo: quem.emailAntigo ?? '' })
      : quem.emailAntigo ? `E-MAIL DA CONTA JÁ CORRIGIDO PELO SISTEMA: no checkout ficou gravado ${quem.emailAntigo} (digitado diferente); o login dela agora é ${r.de}. Não peça e-mail nem comprovante.` : ''
    if (nota) perfil.cartao = `${nota}\n\n${perfil.cartao ?? ''}`
  }
  const idiomaDoEndereco = r.para.some((t) => t.startsWith('pomoc@')) || /\.pl$/i.test(r.de) ? 'pl' : r.para.some((t) => t.startsWith('ayuda@')) ? 'es' : undefined
  const idioma = perfil?.idioma ?? idiomaDoEndereco ?? 'es'
  if (perfil) {
    const { count: reenvios } = await db.from('whatsapp_outbox').select('id', { count: 'exact', head: true }).eq('phone', r.de).eq('kind', KIND_REENVIO).gte('created_at', new Date(Date.now() - 2 * 3_600_000).toISOString())
    perfil.reenvioRecente = (reenvios ?? 0) > 0
  }
  const de = r.para.find((t) => /@riseme\.app$/.test(t) && !/^acesso@/.test(t)) ?? enderecoSuporte(idioma)
  const assunto = /^re:/i.test(r.assunto) ? r.assunto : `Re: ${r.assunto || ASSUNTO_PADRAO[idioma] || ASSUNTO_PADRAO.en}`
  const conversa = conversaAntes
  if (!conversa.length) return `sem conversa (${r.de})`

  let decisao
  try {
    decisao = await decidirResposta({ perfil, conversa, agora: new Date().toISOString(), aprendizados: await aprendizadosAtivos().catch(() => []), canal: 'email', idiomaPadrao: idioma })
  } catch (err) {
    await avisarEquipe(`o bot deu erro ao responder ${r.de}`, [String(err).slice(0, 300), '', 'Mensagem dela:', texto.slice(0, 2000)])
    return `erro do agente (${r.de})`
  }

  let resposta = decisao.texto ?? ''
  const notas: string[] = []
  if (quem.achada) notas.push(`compra achada (${quem.achada.como}${quem.corrigido ? '; e-mail da conta corrigido' : ''})`)
  const d = decisao.tipo === 'responder' ? decisao : null
  let pis = (d?.reembolsoTransacoes ?? []).filter((t) => t.startsWith('pi_'))
  // Reembolso prometido no texto é reembolso feito (25/11/2026): o bot escreveu que encaminha e não devolveu o código.
  const prometidos = await reembolsoPrometido({ userId, textoBot: resposta, textosDela: conversa.filter((m) => m.autor === 'student').map((m) => m.texto), pisDoBot: pis }).catch(() => [] as string[])
  if (prometidos.length) { pis = prometidos; notas.push('o texto prometia o reembolso sem o código: o sistema executou') }
  if (d || prometidos.length) {
    // Reembolso da Stripe: automático (Bruno 09/11 e 12/11; zero chargeback), no 2º pedido ou decisão clara (17/11).
    if (d?.reembolsoCategoria || pis.length) await registrarPedidoReembolso({ phone: r.de, canal: 'email', categoria: d?.reembolsoCategoria ?? (prometidos.length ? 'prometido_pelo_bot' : undefined), devolveu: pis, motivo: d?.reembolsoMotivo }).catch((err) => console.error('[reembolso-pedido] falhou:', err))
    if (pis.length) {
      const res = await Promise.all(pis.map((pi) => reembolsarStripe({ paymentIntent: pi, origem: 'aluna-whatsapp' }).catch((err) => ({ ok: false as const, erro: String(err) }))))
      const falhas = res.map((x, i) => (x.ok ? null : `${pis[i]}: ${'erro' in x ? x.erro : '?'}`)).filter(Boolean)
      resposta = textoReembolsoStripe(idioma, perfil?.nome, falhas.length === 0)
      notas.push(`reembolso Stripe ${pis.join(', ')}${falhas.length ? ` FALHOU (${falhas.join('; ')})` : ' pedido'}`)
      if (falhas.length) await avisarEquipe(`REEMBOLSO STRIPE falhou (${r.de})`, [falhas.join('; '), 'Conferir no painel da Stripe.'])
    }
    const outros = (d?.reembolsoTransacoes ?? []).filter((t) => !t.startsWith('pi_'))
    if (outros.length) await avisarEquipe(`reembolso para aprovar (${r.de})`, [`Transações: ${outros.join(', ')}`, `Motivo: ${d?.reembolsoMotivo ?? '-'}`, '', 'O bot já respondeu a ela. Aprovar no chat do bot.', '', 'Mensagem dela:', texto.slice(0, 1500)])
    let trocouAgora = false
    if (d?.novoEmail) {
      // Ela escreve DO endereço novo (prova que é dela) e a conta nunca entrou: o sistema corrige e manda o acesso para lá.
      const t = d.novoEmail === r.de && userId && perfil && !perfil.ultimoLogin ? await trocarEmail({ userId, atual: emailConta, novo: r.de }) : null
      if (t?.ok) { await gravar(r.de, KIND_EMAIL_TROCADO, { de: emailConta, para: r.de, motivo: 'pedido dela; conta nunca entrou' }); notas.push(`e-mail da conta corrigido: ${emailConta} → ${r.de}`); emailConta = r.de; trocouAgora = true }
      else await avisarEquipe(`troca de e-mail pedida (${r.de})`, [`Novo e-mail: ${d.novoEmail}`, 'Por e-mail a troca só é automática quando ela escreve do endereço novo e a conta nunca entrou: fazer pelo chat do bot.'])
    }
    // Acesso de novo: e-mail de acesso separado, sempre para o e-mail da conta, com a senha DE SEMPRE (18/11/2026:
    // nunca geramos outra; lib/senha-conta.ts). E-mail da conta corrigido agora = ela nunca recebeu o acesso: vai sem pedir.
    if ((d?.reenviarAcesso || quem.corrigido || trocouAgora) && !pis.length && userId && !perfil?.reenvioRecente) {
      const senha = await senhaDaConta({ userId, email: emailConta }).catch((err) => ({ erro: String(err instanceof Error ? err.message : err) }))
      const envio = 'erro' in senha ? { ok: false as const, erro: senha.erro } : await sendAccessEmail({ email: emailConta, code: senha.code, link: buildAccessLink(APP_URL(), idioma, emailConta, senha.code), locale: idioma })
      notas.push(envio.ok ? `acesso reenviado para ${emailConta}` : `REENVIO DO ACESSO FALHOU: ${envio.erro}`)
      if (envio.ok) await gravar(r.de, KIND_REENVIO, { email: r.de })
      else await avisarEquipe(`o bot prometeu acesso novo a ${r.de} e o envio falhou`, [envio.erro])
    }
  } else if (decisao.tipo !== 'responder') {
    // Transferência por e-mail entra na MESMA fila do WhatsApp (25/11/2026). Antes virava só um e-mail de aviso, fora da
    // lista das 20h e sem número: 9 avisos de uma mesma aluna em 7 dias e ninguém respondeu. Agora é consulta #id: aparece
    // na lista, e a resposta do responsável ("#id …") sai por e-mail para ela (responderConsultaPorEmail).
    const consultaId = await criarConsulta({ phone: r.de, nome: perfil?.nome ?? r.nome ?? undefined, motivo: `[E-MAIL] ${decisao.motivo}`, resumo: `✉️ por e-mail · ${decisao.consulta?.resumo ?? decisao.motivo}`, opcaoA: decisao.consulta?.opcaoA ?? '', opcaoB: decisao.consulta?.opcaoB ?? '' }).catch(() => null)
    await avisarEquipe(`consulta #${consultaId ?? '?'}: ${perfil?.nome ?? r.nome ?? 'aluna'} <${r.de}> precisa de você`, [`Motivo: ${decisao.motivo}`, decisao.consulta?.resumo ?? '', decisao.consulta?.opcaoA ? `A) ${decisao.consulta.opcaoA}` : '', decisao.consulta?.opcaoB ? `B) ${decisao.consulta.opcaoB}` : '', '', 'O bot respondeu a ela:', resposta, '', 'Mensagem dela:', texto.slice(0, 2000), '', `Para responder: no WhatsApp do bot, "#${consultaId ?? 'id'} <o que responder>" (a resposta sai por e-mail para ela).`])
    notas.push(`transferido (consulta #${consultaId ?? '?'}): ${decisao.motivo}`)
  }
  if (!resposta.trim()) return `sem resposta (${r.de}; ${notas.join('; ')})`
  const envio = await enviarEmailSuporte({ para: r.de, assunto, texto: resposta, idioma, de, emRespostaA: r.messageId, auto: true })
  if (!envio.ok) await avisarEquipe(`a resposta a ${r.de} NÃO saiu`, [envio.erro, '', resposta])
  return `${envio.ok ? 'respondido' : 'RESPOSTA FALHOU'} (${r.de}; ${idioma}${notas.length ? `; ${notas.join('; ')}` : ''})`
}

// ── Quem escreve ────────────────────────────────────────────────────────────────────────────────────────────────
interface Quem { userId: string | null; emailConta: string; achada: CompraAchada | null; corrigido: boolean; emailAntigo: string | null }

/**
 * Acha a conta de quem escreve. 1) conta com este e-mail; 2) e-mail que ela citou; 3) a compra é procurada pelo que ela
 * já deu (lib/whatsapp-agent/achar-compra.ts). `corrigir`: e-mail do checkout digitado errado + conta que NUNCA entrou +
 * ela escreve do endereço certo (o que prova que o endereço é dela) → o e-mail da conta é corrigido na hora.
 */
async function identificar(de: string, nome: string | null, conversa: MensagemConversa[], corrigir: boolean): Promise<Quem> {
  const db = admin()
  const { data: conta } = await db.from('users').select('id, email').eq('email', de).limit(1)
  if (conta?.[0]) {
    const { data: troca } = await db.from('whatsapp_outbox').select('body').eq('phone', de).eq('kind', KIND_EMAIL_TROCADO).order('id', { ascending: false }).limit(1)
    let antigo: string | null = null
    try { antigo = troca?.[0] ? ((JSON.parse(troca[0].body as string) as { de?: string }).de ?? null) : null } catch { /* linha antiga em outro formato */ }
    return { userId: conta[0].id as string, emailConta: de, achada: null, corrigido: false, emailAntigo: antigo }
  }
  const dela = conversa.filter((m) => m.autor === 'student').map((m) => m.texto)
  // Escreveu de outro endereço e citou o e-mail da compra: vale para achar a conta. O acesso novo vai SEMPRE para o e-mail
  // da conta (nunca para quem escreveu), então quem não é a dona não ganha nada com isso.
  const citados = [...new Set(dela.flatMap((t) => t.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? []).map((e) => e.toLowerCase()))].filter((e) => !/@riseme\.app$/.test(e))
  if (citados.length) {
    const { data: porCitado } = await db.from('users').select('id, email').in('email', citados).limit(1)
    if (porCitado?.[0]) return { userId: porCitado[0].id as string, emailConta: (porCitado[0].email as string).toLowerCase(), achada: null, corrigido: false, emailAntigo: null }
  }
  const achada = await acharCompra({ de, nome, textos: dela })
  if (!achada) return { userId: null, emailConta: de, achada: null, corrigido: false, emailAntigo: null }
  if (corrigir && achada.como === 'email-parecido' && achada.emailDela === de && achada.nuncaEntrou) {
    const t = await trocarEmail({ userId: achada.userId, atual: achada.emailConta, novo: de })
    if (t.ok) {
      await gravar(de, KIND_EMAIL_TROCADO, { de: achada.emailConta, para: de, motivo: 'digitado errado no checkout; conta nunca entrou' })
      return { userId: achada.userId, emailConta: de, achada, corrigido: true, emailAntigo: achada.emailConta }
    }
    console.error(`[email-suporte] correção do e-mail falhou (${de}): ${t.erro}`)
  }
  return { userId: achada.userId, emailConta: achada.emailConta, achada, corrigido: false, emailAntigo: null }
}

// ── Consulta aberta por e-mail: a resposta do responsável ("#id …" no WhatsApp do bot) sai por e-mail ─────────────────────
/** Devolve a frase para o responsável. Lança se o envio falhar (a consulta continua pendente). */
export async function responderConsultaPorEmail(consulta: ConsultaAberta, orientacao: string): Promise<string> {
  const endereco = consulta.phone
  const conversa = await conversaDoEndereco(endereco)
  const quem = await identificar(endereco, consulta.nome, conversa, false)
  const perfil = quem.userId ? await perfilDaAluna(quem.userId, quem.achada?.como !== 'nome', null).catch(() => null) : null
  const idioma = perfil?.idioma ?? (/\.pl$/i.test(endereco) ? 'pl' : 'es')
  const { data: semReembolso } = quem.userId
    ? await admin().from('stripe_vendas').select('payment_intent, oferta, valor_centavos, moeda, created_at').eq('user_id', quem.userId).is('reembolso_id', null).not('payment_intent', 'is', null).order('created_at', { ascending: false }).limit(6)
    : { data: [] as { payment_intent: string; oferta: string | null; valor_centavos: number | null; moeda: string | null; created_at: string }[] }
  const comprasStripe = (semReembolso ?? []).map((v) => `${v.payment_intent} · ${v.oferta ?? 'compra'} · ${v.valor_centavos != null ? (Number(v.valor_centavos) / 100).toFixed(2) : '?'} ${String(v.moeda ?? '').toUpperCase()} · ${String(v.created_at).slice(0, 10)}`)
  const { enviar, nota, mensagem, aprendizado, reembolsarStripe: aDevolver } = await redigirRespostaAprovada({ perfil, conversa, resumo: consulta.resumo, opcaoA: consulta.opcaoA, opcaoB: consulta.opcaoB, orientacao, comprasStripe })
  const pis = aDevolver.filter((pi) => (semReembolso ?? []).some((v) => v.payment_intent === pi))
  let texto = mensagem
  let feito = ''
  if (pis.length) {
    const res = await Promise.all(pis.map((pi) => reembolsarStripe({ paymentIntent: pi, origem: 'aluna-whatsapp' }).catch((err) => ({ ok: false as const, erro: String(err) }))))
    const falhas = res.map((x, i) => (x.ok ? null : `${pis[i]}: ${'erro' in x ? x.erro : '?'}`)).filter(Boolean)
    if (falhas.length) return `❌ Consulta #${consulta.id} (e-mail) — tentei o reembolso na Stripe e falhou: ${falhas.join('; ').slice(0, 300)}. Nada foi dito à aluna; a consulta continua pendente.`
    texto = textoReembolsoStripe(idioma, perfil?.nome, true)
    feito = ` Reembolso pedido na Stripe: ${pis.map((pi) => comprasStripe.find((c) => c.startsWith(pi))?.split(' · ').slice(1, 3).join(' ') ?? pi).join(' + ')}.`
    await registrarPedidoReembolso({ phone: endereco, canal: 'email', categoria: 'aprovado_pelo_responsavel', devolveu: pis, motivo: orientacao.slice(0, 200) }).catch(() => {})
  } else if (!enviar) {
    return `✋ Consulta #${consulta.id} (e-mail) — não enviei nada para a aluna.\n${nota || 'Não ficou claro o que responder a ela.'}\n\nQuando decidir, responda de novo com #${consulta.id}.`
  }
  const { data: ultimo } = await admin().from('whatsapp_outbox').select('body').eq('phone', endereco).eq('kind', KIND_IN).order('id', { ascending: false }).limit(1)
  let assunto = ASSUNTO_PADRAO[idioma] ?? ASSUNTO_PADRAO.en
  let messageId: string | null = null
  try { const b = JSON.parse((ultimo?.[0]?.body as string) ?? '{}') as { assunto?: string; messageId?: string }; if (b.assunto) assunto = b.assunto; messageId = b.messageId ?? null } catch { /* sem o último: assunto padrão */ }
  const envio = await enviarEmailSuporte({ para: endereco, assunto: /^(re|odp):/i.test(assunto) ? assunto : `Re: ${assunto}`, texto, idioma, emRespostaA: messageId })
  if (!envio.ok) throw new Error(`envio do e-mail à aluna falhou: ${envio.erro}`)
  await fecharConsulta(consulta.id, { status: 'respondida', orientacao, respostaEnviada: texto })
  if (aprendizado && !pis.length) await salvarAprendizado(aprendizado, consulta.id)
  return `✅ Consulta #${consulta.id} — enviado por e-mail para ${consulta.nome ?? 'a aluna'}:${feito}\n\n«${texto}»`
}
