// Atendimento por E-MAIL (14/11/2026). A Meta restringiu o WhatsApp do suporte por 24 h no pico do CL-PL; Bruno: "um e-mail
// profissional que envia e recebe, ligado a você, similar ao WhatsApp, de modo que ninguém fique sem acesso".
//
// Como funciona: o Resend recebe o que chega em qualquer endereço @riseme.app (pomoc@ = polonês, ayuda@ = espanhol) e avisa
// POST /api/email-suporte (evento email.received, só metadados). Aqui o e-mail é buscado de volta no Resend (é isso que
// prova que o aviso é verdadeiro), a aluna é achada pelo endereço, o MESMO cérebro do WhatsApp decide (decidirResposta,
// canal 'email') e a resposta sai por e-mail na mesma conversa. Ações: reenviar acesso (e-mail novo com senha nova) e
// reembolso automático da Stripe (regra do Bruno de 09/11, mantida). O que precisa de pessoa vai por e-mail ao ALERTA_EMAIL.
//
// Histórico: linhas inertes em whatsapp_outbox (kind 'email-in' / 'email-out', phone = endereço da aluna, body = JSON).
// Fica separado de whatsapp_messages de propósito: nada do fluxo do WhatsApp varre essas linhas.

import { admin, aprendizadosAtivos, perfilDaAluna } from '@/lib/whatsapp-agent/conversa'
import { decidirResposta, type MensagemConversa } from '@/lib/whatsapp-agent/responder'
import { textoReembolsoStripe } from '@/lib/whatsapp-agent/reembolsos'
import { reembolsarStripe } from '@/lib/stripe-api'
import { generateAccessCode, buildAccessLink } from '@/lib/access-code'
import { sendAccessEmail } from '@/lib/email'

export const KIND_IN = 'email-in'
export const KIND_OUT = 'email-out'
const KIND_REENVIO = 'acesso-reenviado' // o mesmo do WhatsApp (trava de 2 h), aqui com phone = endereço
const MAX_RESPOSTAS_DIA = 8 // contra laço com resposta automática do outro lado
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? 'https://riseme.app'

/** Endereço do suporte por idioma. Todos caem na mesma caixa (qualquer nome @riseme.app chega). */
export const ENDERECO_SUPORTE: Record<string, string> = { pl: 'pomoc@riseme.app', es: 'ayuda@riseme.app' }
export const enderecoSuporte = (idioma?: string | null) => ENDERECO_SUPORTE[idioma ?? ''] ?? 'ayuda@riseme.app'
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
interface Recebido { id: string; de: string; nome: string | null; para: string[]; assunto: string; texto: string; messageId: string | null; headers: Record<string, string>; anexos: number }

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
  const texto = (j.text && j.text.trim()) || (j.html ?? '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>|<\/p>|<\/div>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  return {
    id,
    de: endereco.toLowerCase().trim(),
    nome: nomeRemetente || null,
    para: (Array.isArray(j.to) ? j.to : [j.to ?? '']).map((t) => String(t).toLowerCase().replace(/^.*<|>.*$/g, '').trim()).filter(Boolean),
    assunto: (j.subject ?? '').trim(),
    texto,
    messageId: j.message_id ?? headers['message-id'] ?? null,
    headers,
    anexos: j.attachments?.length ?? 0,
  }
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
  const texto = semCitacao(r.texto).slice(0, 4000) + (r.anexos ? `\n[A aluna anexou ${r.anexos} arquivo(s); por e-mail o sistema ainda não abre anexos.]` : '')
  const auto = ehAutomatico(r)
  // Grava primeiro (o Resend reenvia o aviso se demorarmos): quem gravou a 1ª linha deste id é quem responde.
  const meu = await gravar(r.de, KIND_IN, { id: r.id, para: r.para, assunto: r.assunto, texto, messageId: r.messageId, ...(auto ? { ignorado: auto } : {}) })
  const { data: iguais } = await db.from('whatsapp_outbox').select('id').eq('phone', r.de).eq('kind', KIND_IN).like('body', `%"id":"${r.id}"%`).order('id').limit(1)
  if (meu && iguais?.[0] && iguais[0].id !== meu) return `repetido (${emailId})`
  if (auto) return `ignorado: ${auto} (${r.de})`
  if (!texto.trim()) return `vazio (${r.de})`

  const desde = new Date(Date.now() - 24 * 3_600_000).toISOString()
  const { count: respostas } = await db.from('whatsapp_outbox').select('id', { count: 'exact', head: true }).eq('phone', r.de).eq('kind', KIND_OUT).gte('created_at', desde).like('body', '%"auto":true%')
  if ((respostas ?? 0) >= MAX_RESPOSTAS_DIA) {
    await avisarEquipe(`${r.de} passou de ${MAX_RESPOSTAS_DIA} respostas em 24 h`, [`Parei de responder sozinho a ${r.de}.`, `Última mensagem dela:`, texto.slice(0, 1500)])
    return `teto diário (${r.de})`
  }

  // Quem é: conta com este e-mail. Escrever do e-mail da conta confirma a identidade (o acesso só vai para esse endereço).
  const { data: conta } = await db.from('users').select('id, email').eq('email', r.de).limit(1)
  let userId = (conta?.[0]?.id as string | undefined) ?? null
  let emailConta = r.de
  if (!userId) {
    // Escreveu de outro endereço e citou o e-mail da compra: vale para achar a conta. O acesso novo vai SEMPRE para o e-mail
    // da conta (nunca para quem escreveu), então quem não é a dona não ganha nada com isso.
    const citados = [...new Set((await conversaDoEndereco(r.de)).filter((m) => m.autor === 'student').flatMap((m) => m.texto.match(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g) ?? []).map((e) => e.toLowerCase()))].filter((e) => !/@riseme\.app$/.test(e))
    if (citados.length) {
      const { data: porCitado } = await db.from('users').select('id, email').in('email', citados).limit(1)
      if (porCitado?.[0]) { userId = porCitado[0].id as string; emailConta = (porCitado[0].email as string).toLowerCase() }
    }
  }
  const perfil = userId ? await perfilDaAluna(userId, true, null).catch(() => null) : null
  const idiomaDoEndereco = r.para.some((t) => t.startsWith('pomoc@')) || /\.pl$/i.test(r.de) ? 'pl' : r.para.some((t) => t.startsWith('ayuda@')) ? 'es' : undefined
  const idioma = perfil?.idioma ?? idiomaDoEndereco ?? 'es'
  if (perfil) {
    const { count: reenvios } = await db.from('whatsapp_outbox').select('id', { count: 'exact', head: true }).eq('phone', r.de).eq('kind', KIND_REENVIO).gte('created_at', new Date(Date.now() - 2 * 3_600_000).toISOString())
    perfil.reenvioRecente = (reenvios ?? 0) > 0
  }
  const de = r.para.find((t) => /@riseme\.app$/.test(t) && !/^acesso@/.test(t)) ?? enderecoSuporte(idioma)
  const assunto = /^re:/i.test(r.assunto) ? r.assunto : `Re: ${r.assunto || ASSUNTO_PADRAO[idioma] || ASSUNTO_PADRAO.en}`
  const conversa = await conversaDoEndereco(r.de)
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
  if (decisao.tipo === 'responder') {
    // Reembolso da Stripe: automático, já no 1º pedido (Bruno 09/11 e 12/11; zero chargeback).
    const pis = (decisao.reembolsoTransacoes ?? []).filter((t) => t.startsWith('pi_'))
    if (pis.length) {
      const res = await Promise.all(pis.map((pi) => reembolsarStripe({ paymentIntent: pi, origem: 'aluna-whatsapp' }).catch((err) => ({ ok: false as const, erro: String(err) }))))
      const falhas = res.map((x, i) => (x.ok ? null : `${pis[i]}: ${'erro' in x ? x.erro : '?'}`)).filter(Boolean)
      resposta = textoReembolsoStripe(idioma, perfil?.nome, falhas.length === 0)
      notas.push(`reembolso Stripe ${pis.join(', ')}${falhas.length ? ` FALHOU (${falhas.join('; ')})` : ' pedido'}`)
      if (falhas.length) await avisarEquipe(`REEMBOLSO STRIPE falhou (${r.de})`, [falhas.join('; '), 'Conferir no painel da Stripe.'])
    }
    const outros = (decisao.reembolsoTransacoes ?? []).filter((t) => !t.startsWith('pi_'))
    if (outros.length) await avisarEquipe(`reembolso para aprovar (${r.de})`, [`Transações: ${outros.join(', ')}`, `Motivo: ${decisao.reembolsoMotivo ?? '-'}`, '', 'O bot já respondeu a ela. Aprovar no chat do bot.', '', 'Mensagem dela:', texto.slice(0, 1500)])
    if (decisao.novoEmail) await avisarEquipe(`troca de e-mail pedida (${r.de})`, [`Novo e-mail: ${decisao.novoEmail}`, 'Por e-mail a troca não é automática: fazer pelo chat do bot.'])
    // Acesso de novo: senha nova + e-mail de acesso separado, sempre para o e-mail da conta.
    if (decisao.reenviarAcesso && userId && !perfil?.reenvioRecente) {
      const code = generateAccessCode()
      const { error } = await db.auth.admin.updateUserById(userId, { password: code })
      const envio = error ? { ok: false as const, erro: error.message } : await sendAccessEmail({ email: emailConta, code, link: buildAccessLink(APP_URL(), idioma, emailConta, code), locale: idioma })
      notas.push(envio.ok ? `acesso reenviado para ${emailConta}` : `REENVIO DO ACESSO FALHOU: ${envio.erro}`)
      if (envio.ok) await gravar(r.de, KIND_REENVIO, { email: r.de })
      else await avisarEquipe(`o bot prometeu acesso novo a ${r.de} e o envio falhou`, [envio.erro])
    }
  } else {
    await avisarEquipe(`${perfil?.nome ?? r.nome ?? 'aluna'} <${r.de}> precisa de você`, [`Motivo: ${decisao.motivo}`, decisao.consulta?.resumo ?? '', decisao.consulta?.opcaoA ? `A) ${decisao.consulta.opcaoA}` : '', decisao.consulta?.opcaoB ? `B) ${decisao.consulta.opcaoB}` : '', '', 'O bot respondeu a ela:', resposta, '', 'Mensagem dela:', texto.slice(0, 2000), '', 'Para responder: diga no chat do bot "responde por e-mail a <endereço>: …".'])
    notas.push(`transferido: ${decisao.motivo}`)
  }
  if (!resposta.trim()) return `sem resposta (${r.de}; ${notas.join('; ')})`
  const envio = await enviarEmailSuporte({ para: r.de, assunto, texto: resposta, idioma, de, emRespostaA: r.messageId, auto: true })
  if (!envio.ok) await avisarEquipe(`a resposta a ${r.de} NÃO saiu`, [envio.erro, '', resposta])
  return `${envio.ok ? 'respondido' : 'RESPOSTA FALHOU'} (${r.de}; ${idioma}${notas.length ? `; ${notas.join('; ')}` : ''})`
}
