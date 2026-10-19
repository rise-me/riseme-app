// Indicação com presente (Bruno, 19/10/2026): amiga comprou o desafio pelo link que a aluna repassou →
// a aluna ganha 1 MÊS DO PASE COMPLETO grátis (todos os desafios). Começa manual: a aluna manda ao agente o
// email com que a amiga comprou; aqui se confere e se libera. Se der volume, vira afiliação da Hotmart.
// DADOS DO CASO: link e prazos abaixo.

import { admin } from '@/lib/whatsapp-agent/conversa'

export const LINK_INDICACAO =
  'https://pay.hotmart.com/H101419289G?off=j3m3v9m3&checkoutMode=10&hideBillet=1&hideMultipleCards=1&src=indicacao'
const DIAS_PRESENTE = 30
const COMPRA_RECENTE_DIAS = 30 // indicação = compra nova; compradora antiga não conta
const DESAFIOS_DO_PASE = ['2', '3', '4', '5'] // mesmo conjunto que a Hotmart libera no Pase (app/api/hotmart)
const DIA = 86_400_000

export type ResultadoIndicacao = 'ok' | 'sem-compra' | 'ja-contada' | 'propria'

export async function creditarIndicacao(alunaId: string, emailAmiga: string): Promise<ResultadoIndicacao> {
  const db = admin()
  const { data: amigas } = await db.from('users').select('id').ilike('email', emailAmiga.trim()).limit(1)
  const amiga = amigas?.[0]
  if (!amiga) return 'sem-compra'
  if (amiga.id === alunaId) return 'propria'
  const { data: compra } = await db
    .from('user_challenges')
    .select('granted_at')
    .eq('user_id', amiga.id)
    .eq('access_type', 'lifetime')
    .gte('granted_at', new Date(Date.now() - COMPRA_RECENTE_DIAS * DIA).toISOString())
    .limit(1)
  if (!compra?.length) return 'sem-compra'

  const codigo = `indicacao-${amiga.id}` // 1 crédito por amiga, para quem indicar primeiro
  const { data: ja } = await db.from('subscriptions').select('id').eq('stripe_sub_id', codigo).limit(1)
  if (ja?.length) return 'ja-contada'

  // Soma ao Pase que ela já tiver (presente não "come" dias pagos).
  const { data: subs } = await db.from('subscriptions').select('current_period_end').eq('user_id', alunaId).in('status', ['active', 'canceled'])
  const base = Math.max(Date.now(), ...(subs ?? []).map((s) => new Date(s.current_period_end).getTime()))
  const { error } = await db.from('subscriptions').insert({
    user_id: alunaId,
    stripe_sub_id: codigo,
    status: 'canceled', // não renova; vale até current_period_end (lib/user-access-server)
    plan_type: 'monthly',
    current_period_end: new Date(base + DIAS_PRESENTE * DIA).toISOString(),
  })
  if (error) throw error
  await db.from('user_challenges').upsert(
    DESAFIOS_DO_PASE.map((cid) => ({ user_id: alunaId, challenge_id: cid, access_type: 'subscription' as const })),
    { onConflict: 'user_id,challenge_id', ignoreDuplicates: true },
  )
  return 'ok'
}

// Resposta quando NÃO deu para creditar (a do agente já assume que deu certo).
export function textoIndicacaoFalhou(r: Exclude<ResultadoIndicacao, 'ok'> | 'sem-conta', idioma: string): string {
  const es: Record<typeof r, string> = {
    'sem-compra': 'No encontré una compra reciente con ese correo 🤔 ¿Me confirmas el email exacto con el que compró tu amiga? A veces tarda unos minutos en aparecer después del pago.',
    'ja-contada': 'Esa compra ya fue contada como indicación 💛 ¡Gracias igual por recomendarnos!',
    propria: 'Ese es el correo de tu propia cuenta 😊 Para el regalo necesito el email con el que compró tu amiga.',
    'sem-conta': 'Para liberarte el regalo necesito encontrar tu cuenta: ¿me escribes el email que usaste en TU compra?',
  }
  const pl: Record<typeof r, string> = {
    'sem-compra': 'Nie znalazłam niedawnego zakupu z tym e-mailem 🤔 Możesz potwierdzić dokładny e-mail, którego użyła Twoja znajoma? Czasem zakup pojawia się po kilku minutach.',
    'ja-contada': 'Ten zakup został już policzony jako polecenie 💛 Dziękujemy, że nas polecasz!',
    propria: 'To e-mail Twojego konta 😊 Do prezentu potrzebuję e-maila, którego użyła Twoja znajoma.',
    'sem-conta': 'Żeby odblokować prezent, muszę znaleźć Twoje konto: napisz e-mail, którego użyłaś przy SWOIM zakupie.',
  }
  return (idioma === 'pl' ? pl : es)[r]
}
