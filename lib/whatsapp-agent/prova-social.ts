// Prova social e presente do depoimento (Bruno, 26/10/2026).
// 1) Quem manda prova (foto de resultado, vídeo, texto contando como foi) ganha a etiqueta "⭐ Enviou prova social"
//    no WhatsApp do suporte + uma linha inerte na fila, para achar todas depois.
// 2) Convite às alunas da área de membros Hotmart: mandou o depoimento e escolheu o desafio → libera NA HORA.
//    Aluna antiga quase nunca tem conta no app: cria pela compra dela na Hotmart (mesmo caminho do webhook, que
//    também manda o acesso por aqui) e libera o desafio escolhido, vitalício.

import { admin, variantesTelefone } from '@/lib/whatsapp-agent/conversa'
import { marcarNaFila } from '@/lib/whatsapp-outbox'
import { etiquetar, garantirEtiqueta } from '@/lib/zapi'

export const ETIQUETA_PROVA = '⭐ Enviou prova social'
export const ETIQUETA_POST = '💬 Depoimento no post' // print do comentário (brinde do cardápio); separada da prova forte (Bruno, 27/10)
export const KIND_PROVA = 'prova-social' // linha inerte: body = o que ela mandou (resumo)
export const KIND_DADOS_HOTMART = 'depo-hotmart-dados' // linha inerte por aluna: JSON {email, nome, produtoId, transacao, pais}
const DESAFIOS = ['1', '2', '3', '4', '5', '6', '7']

/** Etiqueta a conversa e registra a prova (1 linha por conversa). */
export async function marcarProvaSocial(phone: string, resumo: string): Promise<void> {
  const formas = variantesTelefone(phone).flatMap((v) => [v, `+${v}`])
  const { count } = await admin().from('whatsapp_outbox').select('id', { count: 'exact', head: true }).in('phone', formas).eq('kind', KIND_PROVA)
  if (!count) await marcarNaFila(phone, KIND_PROVA, resumo.slice(0, 300))
  const tag = await garantirEtiqueta(ETIQUETA_PROVA)
  if (tag) await etiquetar(phone, tag)
}

/** Print do comentário no post/anúncio: só a etiqueta (o registro já é a linha 'brinde-depoimento'). */
export async function marcarDepoimentoNoPost(phone: string): Promise<void> {
  const tag = await garantirEtiqueta(ETIQUETA_POST)
  if (tag) await etiquetar(phone, tag)
}

export type ResultadoPresente = 'liberado' | 'ja-tinha' | 'futuro' | 'sem-dados' | 'erro'

async function contaPorEmail(email: string): Promise<string | null> {
  const { data } = await admin().from('users').select('id').ilike('email', email).maybeSingle()
  return data?.id ?? null
}

/** Cria a conta pela compra Hotmart dela (o webhook manda o acesso por WhatsApp e email). */
async function criarContaPelaCompra(phone: string): Promise<string | null> {
  const formas = variantesTelefone(phone).flatMap((v) => [v, `+${v}`])
  const { data } = await admin().from('whatsapp_outbox').select('body').in('phone', formas).eq('kind', KIND_DADOS_HOTMART).limit(1).maybeSingle()
  if (!data) return null
  const d = JSON.parse(data.body) as { email: string; nome: string; produtoId: number | null; transacao: string; pais: string | null }
  const existente = await contaPorEmail(d.email)
  if (existente || !d.produtoId) return existente
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://riseme.app'
  const res = await fetch(`${base}/api/hotmart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-hotmart-hottok': process.env.HOTMART_WEBHOOK_TOKEN ?? '' },
    body: JSON.stringify({
      event: 'PURCHASE_APPROVED',
      data: {
        product: { id: d.produtoId },
        buyer: { email: d.email, name: d.nome, checkout_phone: phone.replace(/\D/g, ''), address: { country_iso: d.pais } },
        purchase: { transaction: d.transacao || 'DEPO-HOTMART', status: 'APPROVED' },
      },
    }),
  }).catch(() => null)
  if (!res?.ok) return null
  return contaPorEmail(d.email)
}

/** Convidada do convite Hotmart sem conta no app: cria pela compra (null = não é convidada ou falhou). */
export async function contaDaConvidadaHotmart(phone: string): Promise<string | null> {
  return criarContaPelaCompra(phone).catch(() => null)
}

/** Libera o desafio escolhido ('1'–'7'); 'futuro' só registra a escolha para quando lançar. */
export async function liberarPresenteHotmart(p: { phone: string; userId: string | null; desafio: string }): Promise<ResultadoPresente> {
  try {
    if (p.desafio === 'futuro') {
      await marcarNaFila(p.phone, 'presente-futuro', 'escolheu um desafio que ainda vamos lançar')
      return 'futuro'
    }
    if (!DESAFIOS.includes(p.desafio)) return 'erro'
    const userId = p.userId ?? (await criarContaPelaCompra(p.phone))
    if (!userId) return 'sem-dados'
    const db = admin()
    const { data: ja } = await db.from('user_challenges').select('id').eq('user_id', userId).eq('challenge_id', p.desafio).maybeSingle()
    if (ja) return 'ja-tinha'
    const { error } = await db.from('user_challenges').insert({ user_id: userId, challenge_id: p.desafio, access_type: 'lifetime' })
    if (error) throw error
    await marcarNaFila(p.phone, 'presente-depoimento', `desafio ${p.desafio}`)
    return 'liberado'
  } catch (err) {
    console.error(`[presente-hotmart] falhou (${p.phone}):`, err)
    return 'erro'
  }
}
