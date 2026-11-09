// Reembolsos pela Hotmart com aprovação do responsável no WhatsApp (decisão do Bruno, 05/11/2026):
// 1) um pedido de reembolso vira um comando 'reembolsar' aguardando (whatsapp_comandos);
// 2) a lista numerada vai pro WhatsApp do responsável (às 20h ou na hora, se estiver perto do dia 15);
// 3) ele responde "ok 1 2", "ok todos" ou "não 2"; o sistema reembolsa pela API, avisa a aluna no idioma dela
//    e fecha a consulta. Regra do prazo: a garantia da Hotmart é de 15 DIAS; pedido dentro deles nunca pode
//    passar do dia 15 (depois o reembolso é manual, por fora). Perfect Pay não tem API: entra na lista como "no painel".
// Depois de validado, a aprovação vira automática dentro de um teto (escada P5; ainda não).
import { admin, registrarMensagem } from './conversa'
import { reembolsarHotmart, comprasPorEmail } from '@/lib/hotmart-api'
import { sendZapiText, toZapiPhone } from '@/lib/zapi'
import { bandeira, nomeCurto, produtoCurto, valorBonito, pagamentoBonito, corta } from './formato-lista'

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

/** Linhas numeradas dos reembolsos aguardando (grava o número em cada pedido). Vazio = nenhum. */
export async function linhasReembolsos(): Promise<string[]> {
  const lista = await reembolsosPendentes()
  const linhas: string[] = []
  for (let i = 0; i < lista.length; i++) {
    const { id, params: p } = lista[i]
    const n = i + 1
    await admin().from('whatsapp_comandos').update({ params: { ...p, numero: n } }).eq('id', id)
    const d = dias(p.compradaEm)
    // 09/11/2026: a API do produtor aceitou reembolso no dia 20 (Gloria). O que fecha no dia 15 é só o link da aluna; a garantia da oferta é 30.
    const prazo = d >= 30 ? '\n⛔ *Passou dos 30 dias da garantia*' : d >= 27 ? `\n⚠️ *Garantia de 30 dias vence em ${30 - d} dia(s)*` : d >= 15 ? '\nℹ️ Passou do dia 15: pela API ainda sai (aceitou no dia 20 em 09/11)' : ''
    const painel = p.plataforma === 'perfectpay' ? '\n🖐 *Perfect Pay: fazer no painel*' : ''
    // Um pedido = um bloco curto: quem, o que, quanto, como pagou, há quanto tempo, e o porquê em itálico (Bruno 08/11/2026).
    linhas.push(
      `*${n} · ${nomeCurto(p.nome, p.email)}* ${bandeira(p.phone)}`.trim() +
        `\n${produtoCurto(p.produto)} · ${valorBonito(p.valor)} · ${pagamentoBonito(p.pagamento)} · comprou há ${d} dias` +
        prazo + painel +
        `\n_${corta(p.motivo, 170)}_`,
    )
  }
  return linhas
}

/** Manda a lista ao responsável agora (pedido urgente, perto do dia 15). Desde 05/11 é a lista unificada (lib/whatsapp-agent/lista-20h.ts). */
export async function enviarListaReembolsos(): Promise<string | null> {
  const { enviarListaDiaria } = await import('./lista-20h')
  return enviarListaDiaria()
}

// Artigo da central de ajuda da Hotmart para a COMPRADORA ("como solicitar o reembolso da minha compra"), indicado pelo Bruno 05/11/2026.
const LINK_HOTMART = 'https://help.hotmart.com/es/article/360061973392'
const LOCAL = /BILLET|MERCADO|PSE|PIX|OXXO|EFECTY|YAPE|BOLETO/i
const comoVolta = {
  es: (pag: string) => /PAYPAL/i.test(pag) ? 'El dinero vuelve a tu cuenta de PayPal.' : LOCAL.test(pag) ? 'Como pagaste por un medio local, Hotmart puede pedirte por correo los datos de tu cuenta para hacer la devolución; el dinero llega en hasta 7 días hábiles después de la aprobación.' : 'Como pagaste con tarjeta, el dinero vuelve al banco emisor y aparece en tu factura actual o en la siguiente (el plazo exacto lo define tu banco).',
  pl: (pag: string) => /PAYPAL/i.test(pag) ? 'Pieniądze wrócą na Twoje konto PayPal.' : 'Jeśli płaciłaś kartą, pieniądze wrócą do banku i pojawią się na bieżącym lub następnym wyciągu (dokładny termin zależy od banku).',
  en: (pag: string) => /PAYPAL/i.test(pag) ? 'The money goes back to your PayPal account.' : LOCAL.test(pag) ? 'Since you paid with a local method, Hotmart may email you for your bank details; the money arrives within 7 business days after approval.' : 'Since you paid by card, the money goes back to the issuing bank and shows on your current or next statement (the exact timing depends on your bank).',
}
// Depois do "ok" do responsável: o que vai acontecer e como ela recebe (Bruno, 05/11/2026: claro, educado e tranquilizador).
// Reembolso mantém o acesso ao produto comprado (promessa do vídeo; Bruno 09/11/2026). Pase é assinatura: não entra.
const ehPase = (produto: string) => /pase|pass/i.test(produto)
const ACESSO_FICA: Record<string, string> = {
  es: 'Y tu acceso al desafío sigue activo, como prometimos: puedes volver cuando quieras.',
  pl: 'A Twój dostęp do wyzwania zostaje aktywny, tak jak obiecaliśmy: możesz wrócić, kiedy zechcesz.',
  en: 'And your access to the challenge stays active, as promised: you can come back whenever you like.',
}
const acessoFica = (idioma: string, produto: string): string[] => (ehPase(produto) ? [] : [ACESSO_FICA[idioma] ?? ACESSO_FICA.es])

const CONFIRMA: Record<string, (p: PedidoReembolso) => string> = {
  es: (p) => [
    `Listo${p.nome ? ', ' + p.nome.split(' ')[0] : ''}. Ya abrimos tu reembolso de *${p.produto}* (${p.valor}) en Hotmart. No tienes que hacer nada más.`,
    'Qué pasa ahora: Hotmart lo aprueba en hasta 7 días y te manda un correo de confirmación al email de tu compra.',
    comoVolta.es(p.pagamento),
    'Así explica Hotmart el proceso, por si quieres leerlo:',
    LINK_HOTMART,
    ...acessoFica('es', p.produto),
    'Cualquier duda, me escribes por aquí. Gracias por darnos la oportunidad 💛',
  ].join('\n\n'),
  pl: (p) => [
    `Gotowe${p.nome ? ', ' + p.nome.split(' ')[0] : ''}. Zgłosiliśmy zwrot za *${p.produto}* (${p.valor}). Nie musisz nic więcej robić.`,
    'Co dalej: zatwierdzenie trwa do 7 dni i dostaniesz potwierdzenie e-mailem na adres z zakupu.',
    comoVolta.pl(p.pagamento),
    ...acessoFica('pl', p.produto),
    'W razie pytań pisz tutaj. Dziękujemy, że dałaś nam szansę 💛',
  ].join('\n\n'),
  en: (p) => [
    `Done${p.nome ? ', ' + p.nome.split(' ')[0] : ''}. We opened your refund for *${p.produto}* (${p.valor}) at Hotmart. Nothing else to do on your side.`,
    'What happens now: Hotmart approves it within 7 days and emails a confirmation to your purchase email.',
    comoVolta.en(p.pagamento),
    'This is how Hotmart explains the process:',
    LINK_HOTMART.replace('/es/', '/en/'),
    ...acessoFica('en', p.produto),
    'Any questions, just write here. Thank you for giving us a chance 💛',
  ].join('\n\n'),
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

export const DIAS_URGENTE = 27 // pedido com 27+ dias não espera as 20h: a lista vai na hora (garantia da oferta = 30; a API aceita depois do dia 15, fato de 09/11/2026)

/**
 * O bot decidiu reembolsar (reembolso_transacoes): confere cada transação na Hotmart pelo e-mail, cria o pedido e,
 * se algum estiver perto do dia 15, manda a lista ao responsável agora. Devolve o que criou.
 */
export async function criarPedidosDaDecisao(d: { phone: string; nome: string; idioma: string; email: string; transacoes: string[]; motivo: string; consultaId?: number | null }): Promise<{ criados: string[]; ignorados: string[]; urgente: boolean }> {
  const compras = (await comprasPorEmail(d.email)) ?? []
  const criados: string[] = []
  const ignorados: string[] = []
  let urgente = false
  for (const tx of d.transacoes) {
    const c = compras.find((x) => x.transacao === tx)
    if (!c || !['APPROVED', 'COMPLETE'].includes(c.status) || !c.pedidoEm) {
      ignorados.push(tx)
      continue
    }
    const id = await criarPedidoReembolso({
      phone: d.phone, nome: d.nome, email: d.email, idioma: d.idioma, plataforma: 'hotmart', transacao: tx,
      produto: c.produto, valor: `${c.valor ?? '?'} ${c.moeda ?? ''}`.trim(), pagamento: [c.pagamento, c.metodo].filter(Boolean).join('/'),
      compradaEm: c.pedidoEm, motivo: d.motivo || 'pedido de reembolso pela aluna', consultaId: d.consultaId ?? null,
    })
    if (id) criados.push(tx)
    if (dias(c.pedidoEm) >= DIAS_URGENTE) urgente = true
  }
  if (criados.length && urgente) await enviarListaReembolsos().catch((err) => console.error('[reembolsos] lista urgente falhou:', err))
  return { criados, ignorados, urgente }
}
