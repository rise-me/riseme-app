// Lembrete de 24 h POR E-MAIL para quem comprou e nunca entrou no app (Bruno 16/11/2026: "pode preparar o lembrete por
// e-mail"). Substitui o lembrete de WhatsApp (lib/lembrete-24h.ts), desligado desde a restrição da Meta de 14/11: e-mail
// não arrisca o número. Uma vez por compradora, sem senha no e-mail (aponta para o e-mail de acesso e para "esqueci a
// senha"), só de dia no fuso dela. Hoje cobre as vendas da Stripe (CL-PL), de onde vem o volume; Hotmart (ES) fica de fora.
// LIGADO 17/11/2026 (Bruno: 'faz isso aí do lembrete'). Desligar: LEMBRETE_EMAIL_ATIVO=0 na Vercel. Modo seco: scripts/tmp-lembrete-email.mts.
import { admin } from './whatsapp-agent/conversa'
import { horaLocal } from './video-depoimento'

export const KIND_LEMBRETE_EMAIL = 'lembrete-email'
const MINUTO = 27
const POR_HORA = 40
const HORA_INICIO = 9
const HORA_FIM = 20
const JANELA_H: [number, number] = [24, 48] // compra entre 24 e 48 h atrás

type Texto = { assunto: string; titulo: string; texto: (nome: string, email: string) => string; botao: string; link: string }
export const TEXTOS: Record<string, Texto> = {
  pl: {
    assunto: 'Twój dzień 1 czeka na Ciebie 💛',
    titulo: 'Twój dzień 1 czeka na Ciebie',
    texto: (n, e) =>
      `Cześć${n ? `, ${n}` : ''}! 💛\n\n` +
      'Wczoraj wysłaliśmy Ci dostęp do RiseMe, a widzimy, że jeszcze nie weszłaś do aplikacji. Dzień 1 to około 15 minut i możesz go zrobić już dziś.\n\n' +
      `*Jak wejść:* kliknij przycisk poniżej i zaloguj się e-mailem *${e}* oraz hasłem z wiadomości „Witaj w RiseMe! Oto Twój dostęp 💛”.\n\n` +
      'Nie pamiętasz hasła? Na ekranie logowania kliknij „Nie pamiętasz hasła?”, a wyślemy Ci nowe.\n\n' +
      'Masz problem z wejściem? Odpowiedz na tę wiadomość, a pomożemy.',
    botao: 'Wejdź do aplikacji',
    link: 'https://riseme.app/pl/login',
  },
  es: {
    assunto: 'Tu día 1 te está esperando 💛',
    titulo: 'Tu día 1 te está esperando',
    texto: (n, e) =>
      `¡Hola${n ? `, ${n}` : ''}! 💛\n\n` +
      'Ayer te enviamos tu acceso a RiseMe y vemos que todavía no entraste a la app. El día 1 son unos 15 minutos y lo puedes hacer hoy mismo.\n\n' +
      `*Cómo entrar:* toca el botón de abajo y entra con tu correo *${e}* y la contraseña del email "¡Estás dentro! Tu acceso a RiseMe 💛".\n\n` +
      '¿No recuerdas la contraseña? En la pantalla de entrada toca "¿Olvidaste tu contraseña?" y te enviamos una nueva.\n\n' +
      '¿Algún problema para entrar? Responde este email y te ayudamos.',
    botao: 'Entrar a la app',
    link: 'https://riseme.app/login',
  },
}

export interface Candidata { userId: string; email: string; nome: string; idioma: string; compra: string; phone: string }

/** Quem receberia agora (sem a regra da hora local). Usado pelo cron e pelo modo seco. */
export async function candidatasLembreteEmail(limite = Infinity, prazoMs = Infinity): Promise<Candidata[]> {
  const inicio = Date.now()
  const db = admin()
  const ate = new Date(Date.now() - JANELA_H[0] * 3600_000).toISOString()
  const desde = new Date(Date.now() - JANELA_H[1] * 3600_000).toISOString()
  const { data: vendas } = await db
    .from('stripe_vendas')
    .select('user_id, email, nome, locale, created_at, reembolso_id, phone')
    .gte('created_at', desde)
    .lte('created_at', ate)
    .not('user_id', 'is', null)
    .order('created_at')
    .limit(2000)
  const vistas = new Set<string>()
  const out: Candidata[] = []
  for (const v of vendas ?? []) {
    if (out.length >= limite || Date.now() - inicio > prazoMs) break // não segurar a fila do WhatsApp (mesmo cron)
    if (!v.user_id || vistas.has(v.user_id) || v.reembolso_id || !TEXTOS[v.locale]) continue
    vistas.add(v.user_id)
    // reembolso em qualquer compra dela = fora
    const { count: reemb } = await db.from('stripe_vendas').select('session_id', { count: 'exact', head: true }).eq('user_id', v.user_id).not('reembolso_id', 'is', null)
    if (reemb) continue
    const { count: ja } = await db.from('whatsapp_outbox').select('id', { count: 'exact', head: true }).eq('kind', KIND_LEMBRETE_EMAIL).eq('phone', v.user_id)
    if (ja) continue
    const { data: au } = await db.auth.admin.getUserById(v.user_id)
    if (!au?.user || au.user.last_sign_in_at) continue // já entrou
    const bruto = (v.nome ?? '').trim().split(/\s+/)[0] ?? ''
    const nome = bruto ? bruto[0].toUpperCase() + bruto.slice(1).toLowerCase() : ''
    out.push({ userId: v.user_id, email: au.user.email ?? v.email, nome, idioma: v.locale, compra: v.created_at, phone: String(v.phone ?? '') })
  }
  return out
}

/** Cron (minuto 27 de cada hora, dentro de app/api/whatsapp/outbox). Enfileira e-mails; a fila manda 15/min. */
export async function lembrarPorEmail(): Promise<number> {
  if (process.env.LEMBRETE_EMAIL_ATIVO === '0' || new Date().getMinutes() !== MINUTO) return 0
  const db = admin()
  let n = 0
  for (const c of await candidatasLembreteEmail(POR_HORA, 60_000)) {
    if (n >= POR_HORA) break
    const tel = c.phone.replace(/\D/g, '')
    const hora = tel ? horaLocal(tel) : 12
    if (hora < HORA_INICIO || hora >= HORA_FIM) continue
    const t = TEXTOS[c.idioma]
    const agora = new Date().toISOString()
    // marca (linha inerte, phone = user_id) + o e-mail em si (kind 'email-suporte', mandado pela fila)
    await db.from('whatsapp_outbox').insert({ phone: c.userId, kind: KIND_LEMBRETE_EMAIL, body: c.email, send_after: agora, sent_at: agora, attempts: 5 })
    await db.from('whatsapp_outbox').insert({
      phone: c.email,
      kind: 'email-suporte',
      body: JSON.stringify({ para: c.email, assunto: t.assunto, titulo: t.titulo, texto: t.texto(c.nome, c.email), idioma: c.idioma, botao: { rotulo: t.botao, link: t.link } }),
      send_after: agora,
    })
    n++
  }
  return n
}
