// HOTMART_CHALLENGE_MAP="ID:challengeId[:locale],..." — locale opcional (default es), igual ao PERFECTPAY_CHALLENGE_MAP.
// Ex.: "4784921:2,<ID_HOTMART_CZ>:1:cs". Idioma que o app não tem (ex.: mapa trocado antes do deploy do idioma) cai em
// 'es' com erro no log — senão o link de acesso daria página não encontrada.
// Extraído de app/api/hotmart/route.ts em 05/11/2026: o autosserviço de acesso do bot (lib/whatsapp-agent/acesso.ts)
// precisa saber se uma compra da Hotmart é de produto que o app entrega antes de criar a conta.
import { routing } from '@/i18n/routing'
import { hasLocale } from 'next-intl'

export function getMappingForProduct(productId: string): { challengeId: string; locale: string } | null {
  const map = process.env.HOTMART_CHALLENGE_MAP ?? ''
  for (const entry of map.split(',')) {
    const [pid, cid, loc] = entry.split(':').map((x) => x?.trim())
    if (!pid || pid !== productId) continue
    let locale = loc || 'es'
    if (!hasLocale(routing.locales, locale)) {
      console.error(`[hotmart] HOTMART_CHALLENGE_MAP: idioma '${locale}' do produto ${productId} não existe no app — usando 'es'`)
      locale = 'es'
    }
    return { challengeId: cid ?? '', locale }
  }
  return null
}

export function getChallengeIdForProduct(productId: string): string | null {
  return getMappingForProduct(productId)?.challengeId || null
}
