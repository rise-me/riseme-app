// Vendas pela Stripe (link de pagamento; 1º caso CL-PL, 09/11/2026). Tabela stripe_vendas (migration_013).
//
// Regras do Bruno para a Stripe (docs/stripe-checkout-plano.md §4b), porque chargeback lá pode fechar a conta e prender
// o saldo:
//   1) ACESSO SEM FALHA por WhatsApp E e-mail. A entrega usa o mesmo caminho das outras plataformas (sendWhatsAppAccess,
//      sendAccessEmail); a diferença é que aqui cada canal fica registrado e a conferência (a cada 15 min) reenvia o que
//      faltar e avisa o responsável no WhatsApp se não sair. Quem já tinha conta também recebe (senha nova).
//   2) REEMBOLSO SEM ATRITO quando a aluna pede (bot e app chamam reembolsarStripe, em lib/stripe-api.ts); no aviso
//      antecipado de fraude, devolução automática (fase de teste). A confirmação à aluna só sai quando a Stripe diz
//      'succeeded' (BLIK leva até 2 h e pode falhar; falha → responsável avisado).
// Disputa (chargeback) revoga o acesso, como nas outras plataformas; reembolso não revoga (regra de 09/11).
import 'server-only'
import type Stripe from 'stripe'
import { createServiceClient } from '@/lib/admin-server'
import { generateAccessCode, buildAccessLink } from '@/lib/access-code'
import { sendWhatsAppAccess, mensagensDeAcesso } from '@/lib/whatsapp-access'
import { enfileirar } from '@/lib/whatsapp-outbox'
import { sendAccessEmail, estadoEmail } from '@/lib/email'
import { toE164 } from '@/lib/phone'
import { sendZapiText, toZapiPhone } from '@/lib/zapi'
import { registrarMensagem } from '@/lib/whatsapp-agent/conversa'
import { deveRevogar, registrarCompra } from '@/lib/compras'
import { registrarCompraNaConta } from '@/lib/cartao-aluna'
import { textoPresente } from '@/lib/whatsapp-agent/reembolsos'
import { stripe, stripeConfigurada, reembolsarStripe } from '@/lib/stripe-api'

const APP_URL = () => (process.env.NEXT_PUBLIC_APP_URL ?? 'https://riseme.app').replace(/\/$/, '')
const MAX_WA = 2 // envios de WhatsApp por venda (o 1º + 1 reenvio); cada envio tem 5 tentativas na fila
const MAX_EMAIL = 3
const DIAS_CONFERE = 7
const MIN_RETOMAR_MS = 2 * 60_000 // linha sem entrega há 2 min = webhook morreu no meio → a conferência retoma

type Db = ReturnType<typeof createServiceClient>

export interface Venda {
  session_id: string
  payment_intent: string | null
  payment_link: string | null
  email: string
  nome: string | null
  phone: string | null
  pais: string | null
  locale: string
  challenge_id: string
  oferta: string | null
  valor_centavos: number | null
  moeda: string | null
  user_id: string | null
  conta_nova: boolean | null
  codigo: string | null
  email_id: string | null
  email_ok: boolean | null
  email_erro: string | null
  email_tentativas: number
  wa_outbox_id: number | null
  wa_ok: boolean | null
  wa_erro: string | null
  wa_tentativas: number
  entregue_em: string | null
  alerta_em: string | null
  reembolso_id: string | null
  reembolso_status: string | null
  reembolso_origem: string | null
  reembolso_avisado_em: string | null
  reembolso_alerta_em: string | null
  created_at: string
}

// ── Textos para a aluna (pl primeiro; en de reserva). Página explicativa: app/[locale]/refund. ──────────────────────
export const urlPaginaReembolso = (locale: string) => `${APP_URL()}${locale === 'es' ? '' : `/${locale}`}/refund` // es sem prefixo (as-needed)

// Linha no fim do e-mail de acesso: como pedir reembolso (Bruno 09/11: tem que ficar claro para ela, caso deseje).
const NOTA_EMAIL: Record<string, (url: string) => string> = {
  pl: (url) => `Gwarancja: jeśli z jakiegokolwiek powodu zechcesz zwrotu pieniędzy, napisz do nas na WhatsAppie albo wejdź na ${url}. Zlecamy zwrot od razu, bez zbędnych pytań.`,
  en: (url) => `Guarantee: if for any reason you want your money back, message us on WhatsApp or go to ${url}. We start the refund right away, no questions asked.`,
}

// Confirmação final (só com o reembolso 'succeeded'). Termina no presente do acesso (regra do Bruno de 09/11: só é dito
// aqui, na mensagem final, e a mensagem termina nisso).
const CONFIRMA_REEMBOLSO: Record<string, (p: { nome: string | null; valor: string }) => string> = {
  pl: ({ nome, valor }) => [
    `Gotowe${nome ? `, ${nome.split(' ')[0]}` : ''}. Zwrot ${valor} został zrealizowany. Nie musisz nic więcej robić.`,
    'Pieniądze wracają tą samą drogą, którą płaciłaś: jeśli BLIK-iem, na Twoje konto bankowe, a jeśli kartą, na kartę. Dokładny termin zależy od banku.',
    textoPresente('pl'),
  ].join('\n\n'),
  en: ({ nome, valor }) => [
    `Done${nome ? `, ${nome.split(' ')[0]}` : ''}. Your refund of ${valor} has been completed. Nothing else to do on your side.`,
    'The money goes back the same way you paid: with BLIK to your bank account, with a card to your card. The exact timing depends on your bank.',
    textoPresente('en'),
  ].join('\n\n'),
}

const valorBonito = (centavos: number | null, moeda: string | null) =>
  centavos == null ? '' : `${(centavos / 100).toFixed(2).replace('.', ',')} ${(moeda ?? '').toLowerCase() === 'pln' ? 'zł' : (moeda ?? '').toUpperCase()}`

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── Mapa link/oferta → desafio ──────────────────────────────────────────────────────────────────────────────────
// STRIPE_CHALLENGE_MAP="plink_…:1:pl,CL-PL:1:pl" — chave = id do link de pagamento OU metadata.oferta do link.
export function desafioDaSessao(s: Pick<Stripe.Checkout.Session, 'payment_link' | 'metadata'>): { chave: string; challengeId: string; locale: string } | null {
  const link = typeof s.payment_link === 'string' ? s.payment_link : s.payment_link?.id
  const chaves = [link, s.metadata?.oferta].filter(Boolean) as string[]
  for (const entrada of (process.env.STRIPE_CHALLENGE_MAP ?? '').split(',')) {
    const [codigo, challengeId, locale] = entrada.split(':').map((x) => x?.trim())
    if (codigo && challengeId && chaves.includes(codigo)) return { chave: codigo, challengeId, locale: locale || 'en' }
  }
  return null
}

// ── Aviso ao responsável (WhatsApp) ─────────────────────────────────────────────────────────────────────────────
export async function avisarResponsavel(texto: string): Promise<boolean> {
  const destino = (process.env.WHATSAPP_HANDOFF_PHONE ?? '').replace(/\D/g, '')
  if (!destino) {
    console.error('[stripe] sem WHATSAPP_HANDOFF_PHONE; aviso não saiu:', texto)
    return false
  }
  const r = await sendZapiText({ phone: destino, message: texto, delayTyping: 1 })
  if (!r.ok) console.error('[stripe] aviso ao responsável falhou:', r.error, texto)
  return r.ok
}

const quem = (v: Pick<Venda, 'nome' | 'email' | 'phone'>) => `${v.nome || 'sem nome'} · ${v.email}${v.phone ? ` · ${v.phone}` : ''}`

// ── Venda paga → linha + entrega ────────────────────────────────────────────────────────────────────────────────
/**
 * Registra a sessão paga e entrega o acesso. Idempotente: a Stripe reenvia e pode mandar 2x ao mesmo tempo; só quem
 * criar a linha entrega (o outro sai), e uma linha que ficou no meio é retomada pela conferência.
 */
export async function processarSessaoPaga(s: Stripe.Checkout.Session): Promise<{ ok: boolean; motivo: string }> {
  if (s.payment_status !== 'paid') return { ok: true, motivo: `payment_status ${s.payment_status}` }
  const email = s.customer_details?.email?.trim().toLowerCase()
  const mapa = desafioDaSessao(s)
  if (!mapa) {
    const msg = `⚠️ Stripe: venda PAGA sem desafio no mapa (STRIPE_CHALLENGE_MAP). Ninguém recebeu acesso.\nSessão ${s.id} · link ${String(s.payment_link)} · ${email ?? 'sem e-mail'}\nAdicionar ao mapa na Vercel, republicar e reenviar o evento no painel da Stripe.`
    console.error('[stripe]', msg)
    await avisarResponsavel(msg)
    return { ok: false, motivo: 'sem mapa' }
  }
  if (!email) {
    await avisarResponsavel(`⚠️ Stripe: venda PAGA sem e-mail (sessão ${s.id}). Conferir no painel da Stripe.`)
    return { ok: false, motivo: 'sem e-mail' }
  }

  const pais = s.customer_details?.address?.country ?? null
  // A Stripe garante E.164 no campo de telefone, MENOS com Apple/Google Pay (vem o que a carteira mandar): toE164 com o país.
  const { phone } = toE164(s.customer_details?.phone ?? undefined, { countryIso: pais ?? undefined, locale: mapa.locale })
  const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id ?? null

  const db = createServiceClient()
  const { data: criada, error: erroLinha } = await db.from('stripe_vendas').upsert({
    session_id: s.id,
    payment_intent: pi,
    payment_link: typeof s.payment_link === 'string' ? s.payment_link : s.payment_link?.id ?? null,
    email,
    nome: s.customer_details?.name?.trim() || null,
    phone: phone ?? null,
    pais,
    locale: mapa.locale,
    challenge_id: mapa.challengeId,
    oferta: s.metadata?.oferta ?? mapa.chave,
    valor_centavos: s.amount_total ?? null,
    moeda: s.currency ?? null,
    rastreio: s.client_reference_id ?? null,
  }, { onConflict: 'session_id', ignoreDuplicates: true }).select('*')
  // Duas chamadas ao mesmo tempo: a 2ª pode bater na chave única do payment_intent antes da do session_id (23505).
  // É a mesma venda já sendo entregue → segue como duplicada. Qualquer outro erro: sem a linha não há entrega nem
  // conferência, então lança para a Stripe reenviar (nunca tratar como "duplicada").
  if (erroLinha && erroLinha.code !== '23505') throw new Error(`stripe_vendas indisponível (${s.id}): ${erroLinha.message}`)

  if (!criada?.length) {
    // Já existia: entregue ou em entrega por outra chamada. Só retoma se ficou parada no meio.
    const { data: atual } = await db.from('stripe_vendas').select('*').eq('session_id', s.id).single()
    const v = atual as Venda | null
    if (v && !v.entregue_em && Date.now() - new Date(v.created_at).getTime() > MIN_RETOMAR_MS) {
      await entregar(db, v)
      return { ok: true, motivo: 'retomada' }
    }
    return { ok: true, motivo: 'duplicada' }
  }
  await entregar(db, criada[0] as Venda)
  return { ok: true, motivo: 'entregue' }
}

/** Conta (cria ou senha nova), desafio, compra registrada, WhatsApp e e-mail. Cada passo grava o estado na linha. */
async function entregar(db: Db, v: Venda): Promise<void> {
  const agora = () => new Date().toISOString()
  let { user_id: userId, codigo } = v

  if (!userId) {
    codigo = generateAccessCode()
    const { data: existente } = await db.from('users').select('id, phone').eq('email', v.email).limit(1)
    let contaNova = false
    if (existente?.length) {
      // Já tinha conta (ex.: comprou antes por outra plataforma): senha nova, para ela receber um acesso que funciona.
      // Se outra venda Stripe dela ainda está em entrega (compra repetida), reaproveita a MESMA senha: senão o 1º
      // WhatsApp, ainda na fila, chegaria com uma senha que já não vale.
      userId = existente[0].id as string
      const { data: emEntrega } = await db.from('stripe_vendas').select('codigo').eq('user_id', userId).neq('session_id', v.session_id)
        .not('codigo', 'is', null).gte('created_at', new Date(Date.now() - DIAS_CONFERE * 86_400_000).toISOString()).order('created_at', { ascending: false }).limit(1)
      const reaproveitada = (emEntrega?.[0]?.codigo as string | undefined) ?? null
      if (reaproveitada) codigo = reaproveitada
      else {
        const { error } = await db.auth.admin.updateUserById(userId, { password: codigo })
        if (error) throw new Error(`senha nova falhou (${v.email}): ${error.message}`)
      }
      if (!existente[0].phone && v.phone) await db.from('users').update({ phone: v.phone }).eq('id', userId)
    } else {
      const { data: novo, error } = await db.auth.admin.createUser({
        email: v.email,
        password: codigo,
        email_confirm: true,
        user_metadata: { name: v.nome ?? undefined, locale: v.locale },
      })
      if (error || !novo.user) throw new Error(`conta não criada (${v.email}): ${error?.message}`)
      userId = novo.user.id
      contaNova = true
      if (v.phone) await db.from('users').update({ phone: v.phone }).eq('id', userId)
    }
    await db.from('stripe_vendas').update({ user_id: userId, codigo, conta_nova: contaNova, updated_at: agora() }).eq('session_id', v.session_id)
  }

  await db.from('user_challenges').upsert(
    { user_id: userId, challenge_id: v.challenge_id, access_type: 'lifetime' },
    { onConflict: 'user_id,challenge_id', ignoreDuplicates: true },
  )
  const produto = v.payment_link ?? v.oferta ?? 'stripe'
  await registrarCompra(db, { userId: userId!, produto, venda: `st:${v.session_id}`, valorCentavos: v.valor_centavos ?? undefined })
  try {
    await registrarCompraNaConta(db, userId!, {
      plataforma: 'stripe',
      transacao: v.payment_intent ?? v.session_id,
      produto: v.oferta ?? produto,
      oferta: v.payment_link,
      valor: v.valor_centavos == null ? null : v.valor_centavos / 100,
      moeda: v.moeda?.toUpperCase() ?? null,
      pais: v.pais,
      em: v.created_at,
    })
  } catch (err) {
    console.error('[stripe] compra não guardada no cartão:', err)
  }

  if (codigo) {
    if (!v.wa_outbox_id) await enviarWhatsApp(db, { ...v, user_id: userId, codigo }, true)
    if (!v.email_id && !v.email_ok) await enviarEmail(db, { ...v, user_id: userId, codigo })
  }
  await db.from('stripe_vendas').update({ entregue_em: agora(), updated_at: agora() }).eq('session_id', v.session_id)
}

/** 1º envio: a sequência completa (acesso + apoio + convite). Reenvio: só a mensagem de acesso. Grava o id da fila. */
async function enviarWhatsApp(db: Db, v: Venda, primeiro: boolean): Promise<void> {
  if (!v.phone) {
    await db.from('stripe_vendas').update({ wa_ok: false, wa_erro: 'sem telefone', updated_at: new Date().toISOString() }).eq('session_id', v.session_id)
    return
  }
  const link = buildAccessLink(APP_URL(), v.locale, v.email, v.codigo!)
  let id: number | null = null
  if (primeiro) {
    await sendWhatsAppAccess({
      challengeId: v.challenge_id,
      productCode: v.payment_link ?? 'stripe',
      transactionId: v.session_id,
      name: v.nome ?? undefined,
      email: v.email,
      phone: v.phone,
      code: v.codigo!,
      link,
      locale: v.locale,
      comoReembolsar: true, // linha "como pedir reembolso" na 2ª mensagem (Bruno 09/11: claro para ela, caso deseje)
    })
    // A fila guarda a senha em `mask` até enviar: acha a linha 'acesso' recém-criada por ela.
    const { data } = await db.from('whatsapp_outbox').select('id').eq('kind', 'acesso').eq('mask', v.codigo!).order('id', { ascending: false }).limit(1)
    id = (data?.[0]?.id as number | undefined) ?? null
  } else {
    const [acesso] = mensagensDeAcesso({ locale: v.locale, email: v.email, code: v.codigo!, link, challengeId: v.challenge_id })
    id = await enfileirar({ phone: v.phone, kind: 'acesso', body: acesso, mask: v.codigo!, sendAfter: new Date() })
  }
  await db.from('stripe_vendas').update({
    wa_outbox_id: id,
    wa_tentativas: v.wa_tentativas + 1,
    wa_erro: id ? null : 'não entrou na fila do WhatsApp',
    updated_at: new Date().toISOString(),
  }).eq('session_id', v.session_id)
}

async function enviarEmail(db: Db, v: Venda): Promise<void> {
  const link = buildAccessLink(APP_URL(), v.locale, v.email, v.codigo!)
  const nota = (NOTA_EMAIL[v.locale] ?? NOTA_EMAIL.en)(urlPaginaReembolso(v.locale))
  const url = urlPaginaReembolso(v.locale)
  const r = await sendAccessEmail({
    email: v.email,
    code: v.codigo!,
    link,
    locale: v.locale,
    notaTexto: nota,
    notaHtml: escapeHtml(nota).replace(escapeHtml(url), `<a href="${url}" style="color:#1a1a1a;">${escapeHtml(url)}</a>`),
  })
  await db.from('stripe_vendas').update({
    email_id: r.ok ? r.id : null,
    email_ok: r.ok && !r.id ? true : null, // aceito sem id = sem como conferir depois: vale o aceite
    email_erro: r.ok ? null : r.erro,
    email_tentativas: v.email_tentativas + 1,
    updated_at: new Date().toISOString(),
  }).eq('session_id', v.session_id)
}

// ── Conferência (cron a cada 15 min) ────────────────────────────────────────────────────────────────────────────
/**
 * 1) Venda paga na Stripe sem linha aqui (webhook não chegou) → entrega agora.
 * 2) Linha parada no meio → retoma. 3) Canal que falhou → reenvia (WhatsApp 2x, e-mail 3x).
 * 4) Canal que não saiu mesmo assim → aviso ao responsável (1x por venda). 5) Os dois ok → apaga a senha guardada.
 */
export async function conferirVendas(): Promise<{ recuperadas: number; conferidas: number; avisos: number }> {
  const db = createServiceClient()
  let recuperadas = 0
  let avisos = 0

  if (stripeConfigurada()) {
    try {
      const desde = Math.floor(Date.now() / 1000) - 2 * 86_400
      const sessoes = await stripe().checkout.sessions.list({ created: { gte: desde }, status: 'complete', limit: 100 })
      const pagas = sessoes.data.filter((s) => s.payment_status === 'paid' && desafioDaSessao(s))
      if (pagas.length) {
        const { data: ja } = await db.from('stripe_vendas').select('session_id').in('session_id', pagas.map((s) => s.id))
        const tem = new Set((ja ?? []).map((r) => r.session_id as string))
        for (const s of pagas.filter((x) => !tem.has(x.id))) {
          console.warn(`[stripe] sessão paga sem webhook: ${s.id} → entregando pela conferência`)
          await processarSessaoPaga(s).catch((err) => console.error('[stripe] recuperação falhou:', s.id, err))
          recuperadas++
        }
      }
    } catch (err) {
      console.error('[stripe] conferência não leu as sessões na Stripe:', err)
    }
  }

  const desde = new Date(Date.now() - DIAS_CONFERE * 86_400_000).toISOString()
  const { data } = await db.from('stripe_vendas').select('*').gte('created_at', desde).or('email_ok.is.null,wa_ok.is.null,email_ok.eq.false,wa_ok.eq.false')
  const lista = (data ?? []) as Venda[]
  for (const venda of lista) {
    try {
      avisos += await conferirUma(db, venda)
    } catch (err) {
      console.error('[stripe] conferência falhou em', venda.session_id, err)
    }
  }
  // Senha guardada não passa de 7 dias.
  await db.from('stripe_vendas').update({ codigo: null }).lt('created_at', desde).not('codigo', 'is', null)
  return { recuperadas, conferidas: lista.length, avisos }
}

async function conferirUma(db: Db, v0: Venda): Promise<number> {
  let v = v0
  const reler = async () => ((await db.from('stripe_vendas').select('*').eq('session_id', v.session_id).single()).data as Venda)

  if (!v.entregue_em) {
    if (Date.now() - new Date(v.created_at).getTime() < MIN_RETOMAR_MS) return 0
    await entregar(db, v)
    v = await reler()
  }

  const muda: Partial<Venda> = {}

  // WhatsApp
  if (v.wa_ok == null) {
    if (!v.phone) {
      muda.wa_ok = false
      muda.wa_erro = 'sem telefone'
    } else if (v.wa_outbox_id) {
      const { data: fila } = await db.from('whatsapp_outbox').select('sent_at, attempts, last_error').eq('id', v.wa_outbox_id).maybeSingle()
      if (fila?.sent_at) muda.wa_ok = true
      else if (!fila || (fila.attempts as number) >= 5) {
        const erro = (fila?.last_error as string | null) ?? 'linha da fila sumiu'
        if (v.wa_tentativas < MAX_WA && v.codigo) {
          await enviarWhatsApp(db, { ...v, wa_erro: erro }, false)
          v = await reler()
        } else {
          muda.wa_ok = false
          muda.wa_erro = erro
        }
      }
    } else if (v.codigo && v.wa_tentativas < MAX_WA) {
      await enviarWhatsApp(db, v, v.wa_tentativas === 0)
      v = await reler()
    } else {
      muda.wa_ok = false
      muda.wa_erro = v.wa_erro ?? 'não enfileirou'
    }
  }

  // E-mail
  if (v.email_ok == null) {
    if (v.email_id) {
      const estado = await estadoEmail(v.email_id)
      if (estado === 'entregue' || estado === null) muda.email_ok = true
      else if (estado === 'falhou') {
        if (v.email_tentativas < MAX_EMAIL && v.codigo) {
          await enviarEmail(db, v)
          v = await reler()
        } else {
          muda.email_ok = false
          muda.email_erro = 'devolvido pelo provedor (e-mail errado ou caixa cheia)'
        }
      } else if (Date.now() - new Date(v.created_at).getTime() > 6 * 3_600_000) muda.email_ok = true // aceito e sem retorno em 6 h
    } else if (v.email_tentativas < MAX_EMAIL && v.codigo) {
      await enviarEmail(db, v)
      v = await reler()
    } else {
      muda.email_ok = false
      muda.email_erro = v.email_erro ?? 'não saiu'
    }
  }

  const waOk = muda.wa_ok ?? v.wa_ok
  const emailOk = muda.email_ok ?? v.email_ok
  if (waOk && emailOk) muda.codigo = null

  // Avisa 1x, com o quadro fechado: espera o outro canal se resolver (senão um "saiu só por um canal" chegaria antes de o
  // outro também falhar, e o alerta de "SEM ACESSO" nunca sairia). Teto: 2 h esperando o outro canal.
  const algumFalhou = waOk === false || emailOk === false
  const quadroFechado = (waOk != null && emailOk != null) || Date.now() - new Date(v.created_at).getTime() > 2 * 3_600_000
  let avisou = 0
  if (algumFalhou && quadroFechado && !v.alerta_em) {
    const linhas = [
      waOk === false && emailOk === false ? '🚨 Stripe: compradora SEM ACESSO (WhatsApp e e-mail falharam)' : '⚠️ Stripe: acesso saiu só por um canal',
      quem(v),
      waOk === false ? `WhatsApp: ❌ ${muda.wa_erro ?? v.wa_erro ?? '?'}` : `WhatsApp: ${waOk ? '✅' : '⏳'}`,
      emailOk === false ? `E-mail: ❌ ${muda.email_erro ?? v.email_erro ?? '?'}` : `E-mail: ${emailOk ? '✅' : '⏳'}`,
      `Compra ${valorBonito(v.valor_centavos, v.moeda)} · sessão ${v.session_id}`,
      waOk === false && emailOk === false ? 'Falar com ela por outro meio (o telefone/e-mail do checkout está acima).' : 'Ela tem o acesso pelo outro canal; conferir se o dado do canal que falhou está certo.',
    ]
    if (await avisarResponsavel(linhas.join('\n'))) {
      muda.alerta_em = new Date().toISOString()
      avisou = 1
    }
  }

  if (Object.keys(muda).length) {
    await db.from('stripe_vendas').update({ ...muda, updated_at: new Date().toISOString() }).eq('session_id', v.session_id)
  }
  return avisou
}

// ── Reembolso, disputa e aviso de fraude (eventos do webhook) ───────────────────────────────────────────────────
/** charge.refunded / refund.updated / refund.failed: lê o reembolso na Stripe e age pelo estado real. */
export async function atualizarReembolso(pi: string): Promise<void> {
  if (!stripeConfigurada()) return
  const db = createServiceClient()
  const { data } = await db.from('stripe_vendas').select('*').eq('payment_intent', pi).maybeSingle()
  const v = data as Venda | null
  if (!v) {
    console.warn(`[stripe] reembolso de ${pi} sem venda registrada aqui (outro produto?)`)
    return
  }
  const { data: refunds } = await stripe().refunds.list({ payment_intent: pi, limit: 10 })
  const r = refunds[0] // mais recente
  if (!r) return
  const origem = (r.metadata?.origem as string | undefined) ?? v.reembolso_origem ?? 'painel'
  const muda: Partial<Venda> = { reembolso_id: r.id, reembolso_status: r.status ?? null, reembolso_origem: origem }

  if (r.status === 'succeeded' && !v.reembolso_avisado_em && origem !== 'aviso-fraude') {
    // Aviso de fraude: quem marcou "não reconheço" talvez nem seja a aluna. O responsável já foi avisado na hora.
    const texto = (CONFIRMA_REEMBOLSO[v.locale] ?? CONFIRMA_REEMBOLSO.en)({ nome: v.nome, valor: valorBonito(r.amount, r.currency) })
    if (await avisarAluna(v, texto)) muda.reembolso_avisado_em = new Date().toISOString()
  }
  if (r.status === 'failed' && !v.reembolso_alerta_em) {
    const ok = await avisarResponsavel([
      '🚨 Stripe: REEMBOLSO FALHOU (o valor voltou pro saldo da Stripe)',
      quem(v),
      `${valorBonito(r.amount, r.currency)} · ${r.id} · motivo: ${r.failure_reason ?? '?'}`,
      'Devolver por outro meio e avisar a aluna. Ela ainda não recebeu confirmação.',
    ].join('\n'))
    if (ok) muda.reembolso_alerta_em = new Date().toISOString()
  }
  await db.from('stripe_vendas').update({ ...muda, updated_at: new Date().toISOString() }).eq('session_id', v.session_id)
}

/** WhatsApp primeiro (fica no histórico do bot); sem telefone ou falhou → e-mail simples. */
async function avisarAluna(v: Venda, texto: string): Promise<boolean> {
  if (v.phone) {
    const destino = toZapiPhone(v.phone)
    const r = await sendZapiText({ phone: destino, message: texto, delayTyping: 2 })
    if (r.ok) {
      await registrarMensagem({ phone: destino, direction: 'out', author: 'system', body: texto, waMessageId: r.messageId })
      return true
    }
    console.error('[stripe] confirmação de reembolso no WhatsApp falhou:', v.email, r.error)
  }
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return false
  const assunto = v.locale === 'pl' ? 'Twój zwrot został zrealizowany 💛' : 'Your refund is complete 💛'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? 'RiseMe <acesso@riseme.app>',
      to: [v.email],
      subject: assunto,
      text: texto,
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:440px">${texto.split('\n\n').map((p) => `<p>${escapeHtml(p)}</p>`).join('')}</div>`,
    }),
  }).catch(() => null)
  return Boolean(res?.ok)
}

/** charge.dispute.created: tira o acesso (se não houver outra compra válida) e avisa o responsável na hora. */
export async function registrarDisputa(d: Stripe.Dispute): Promise<void> {
  const pi = typeof d.payment_intent === 'string' ? d.payment_intent : d.payment_intent?.id
  const db = createServiceClient()
  const { data } = pi ? await db.from('stripe_vendas').select('*').eq('payment_intent', pi).maybeSingle() : { data: null }
  const v = data as Venda | null
  const prazo = d.evidence_details?.due_by ? new Date(d.evidence_details.due_by * 1000).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '?'
  await avisarResponsavel([
    '🚨 Stripe: CHARGEBACK aberto',
    v ? quem(v) : `pagamento ${pi ?? '?'} (sem venda registrada aqui)`,
    `${valorBonito(d.amount, d.currency)} · motivo: ${d.reason} · responder até ${prazo}`,
    'Acesso tirado (regra: disputa revoga). Responder a disputa no painel da Stripe.',
  ].join('\n'))
  if (!v?.user_id) return
  await db.from('stripe_vendas').update({ disputa_em: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('session_id', v.session_id)
  const produto = v.payment_link ?? v.oferta ?? 'stripe'
  if (await deveRevogar(db, { userId: v.user_id, produto, venda: `st:${v.session_id}` })) {
    await db.from('user_challenges').delete().eq('user_id', v.user_id).eq('challenge_id', v.challenge_id).eq('access_type', 'lifetime')
  }
}

/** radar.early_fraud_warning.created: devolve sozinho (Bruno 09/11, fase de teste) e avisa o responsável. Acesso fica. */
export async function tratarAvisoDeFraude(w: Stripe.Radar.EarlyFraudWarning): Promise<void> {
  const pi = typeof w.payment_intent === 'string' ? w.payment_intent : w.payment_intent?.id
  const db = createServiceClient()
  const { data } = pi ? await db.from('stripe_vendas').select('*').eq('payment_intent', pi).maybeSingle() : { data: null }
  const v = data as Venda | null
  if (v) await db.from('stripe_vendas').update({ fraude_em: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('session_id', v.session_id)
  const r = w.actionable && pi ? await reembolsarStripe({ paymentIntent: pi, origem: 'aviso-fraude' }) : null
  await avisarResponsavel([
    '⚠️ Stripe: aviso antecipado de fraude (dona do cartão marcou "não reconheço")',
    v ? quem(v) : `pagamento ${pi ?? '?'}`,
    `Tipo: ${w.fraud_type}`,
    !w.actionable ? 'Já não dá pra agir (reembolsado ou em disputa).' : r?.ok ? `Reembolso pedido automaticamente (${r.refundId}). Acesso mantido.` : `❌ Reembolso automático FALHOU: ${r?.erro ?? 'sem payment_intent'}. Devolver no painel.`,
  ].join('\n'))
}
