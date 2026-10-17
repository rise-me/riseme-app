// Oferta do teste grátis do Pase Completo no fechamento do suporte (14/10/2026, decisão do Bruno).
// DADOS DO CASO ficam aqui: link do checkout e texto por idioma.
//
// Regras:
// - Mesmo gatilho do pedido de depoimento: o agente marcou que a conversa terminou bem (nada pendente).
// - Uma vez por aluna (fila 'pase'), só para quem NÃO tem o Pase e só quando a conta foi achada pelo telefone
//   (achada pelo email pode não ser ela).
// - Nunca junto com o depoimento: se o depoimento sai agora, o Pase vai no dia seguinte.
// - O texto diz o que é cobrado de fato (grátis 7 dias, depois US$ 27 por ano, cancelar antes não cobra).

import { createClient } from '@supabase/supabase-js'

const CHECKOUT = 'https://pay.hotmart.com/K100401831L?off=v4lltj3v&checkoutMode=10' // checkoutMode=10 = página do banner
const SRC = 'pase-suporte'

const TEXTO: Record<string, (link: string) => string> = {
  es: (link) =>
    [
      'Ah, y una cosa más 💛',
      '',
      'Ya que estás con todo en tu desafío: puedes probar *todos los desafíos RiseMe™* (pilates, yoga y más) *gratis por 7 días*.',
      'Hoy no pagas nada. Si te quedas, desde el día 8 son US$27 por un año completo; si cancelas antes, no se cobra nada.',
      '',
      `👉 ${link}`,
    ].join('\n'),
  pl: (link) =>
    [
      'Aha, i jeszcze jedno 💛',
      '',
      'Skoro tak dobrze idzie Ci wyzwanie: możesz wypróbować *wszystkie wyzwania RiseMe™* (pilates, joga i więcej) *za darmo przez 7 dni*.',
      'Dziś nic nie płacisz. Jeśli zostaniesz, od 8. dnia to 27 USD za cały rok; jeśli anulujesz wcześniej, nic nie zostanie pobrane.',
      '',
      `👉 ${link}`,
    ].join('\n'),
  tr: (link) =>
    [
      'Bir şey daha 💛',
      '',
      'Meydan okuman bu kadar iyi giderken: *tüm RiseMe™ meydan okumalarını* (pilates, yoga ve daha fazlası) *7 gün ücretsiz* deneyebilirsin.',
      'Bugün hiçbir şey ödemezsin. Devam edersen 8. günden itibaren tam bir yıl için 27 USD; önce iptal edersen hiçbir ücret alınmaz.',
      '',
      `👉 ${link}`,
    ].join('\n'),
  'pt-BR': (link) =>
    [
      'Ah, e mais uma coisa 💛',
      '',
      'Já que você está firme no seu desafio: dá para testar *todos os desafios RiseMe™* (pilates, yoga e mais) *grátis por 7 dias*.',
      'Hoje você não paga nada. Se ficar, a partir do dia 8 são US$27 por um ano inteiro; se cancelar antes, nada é cobrado.',
      '',
      `👉 ${link}`,
    ].join('\n'),
  en: (link) =>
    [
      'Oh, and one more thing 💛',
      '',
      'Since you are doing so well in your challenge: you can try *every RiseMe™ challenge* (pilates, yoga and more) *free for 7 days*.',
      'You pay nothing today. If you stay, from day 8 it is US$27 for a full year; cancel before that and you are not charged.',
      '',
      `👉 ${link}`,
    ].join('\n'),
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Mensagem do Pase para esta aluna, ou null se ela já tem o Pase (mesma regra do getUserAccess). */
// DESLIGADA em 16/10/2026: 0 assinaturas em 32 ofertas, e a oferta foi para dentro do app (abrir a aula 2,
// fim da aula 1 com os desafios nomeados) — onde não pesa no chip. Religar = true.
const OFERTA_NO_WHATSAPP = false

export async function ofertaPase(userId: string, idioma: string): Promise<string | null> {
  if (!OFERTA_NO_WHATSAPP) return null
  const db = admin()
  const [{ data: subs }, { data: auth }] = await Promise.all([
    db.from('subscriptions').select('current_period_end').eq('user_id', userId).in('status', ['active', 'canceled']),
    db.auth.admin.getUserById(userId),
  ])
  const temPase = (subs ?? []).some((s) => new Date(s.current_period_end).getTime() > Date.now())
  if (temPase) return null
  const u = new URL(CHECKOUT)
  u.searchParams.set('src', SRC)
  // Email da conta no checkout: a Hotmart libera o Pase pelo email do comprador.
  if (auth?.user?.email) u.searchParams.set('email', auth.user.email)
  return (TEXTO[idioma] ?? TEXTO.es)(u.toString())
}
