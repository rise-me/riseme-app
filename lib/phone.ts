// Normaliza telefone pro padrão internacional E.164 (+<DDI><número>) antes de
// mandar pra Voxuy. MOTIVO (comprovado com suporte Voxuy + doc Perfect Pay,
// 2026-07-07): a Perfect Pay manda o número SEM código de país (só phone_area_code
// + phone_number, formato BR) e o país num campo separado `country`. Sem o "+DDI",
// a Voxuy assume Brasil (+55) → número turco vira inválido → WhatsApp não sai.
//
// Estratégia: DDI vem do ISO do país do comprador (payload.country) quando existe;
// senão de um DDI padrão do produto (localeDdi) — pros produtos de país único, como
// o turco (CL-TR), isso garante o +90 mesmo se o `country` faltar.

// ISO-2 do país → código de discagem (DDI). Só os países que a operação toca.
const COUNTRY_TO_DDI: Record<string, string> = {
  TR: '90',
  BR: '55',
  MX: '52', AR: '54', CO: '57', CL: '56', PE: '51', EC: '593',
  PY: '595', UY: '598', BO: '591', VE: '58', ES: '34', US: '1',
  GT: '502', CR: '506', PA: '507', DO: '1',
}

// Locales de país ÚNICO → DDI (fallback quando o payload não traz `country`).
// 'es' fica de fora de propósito: espanhol cobre vários países (DDI ambíguo).
const LOCALE_TO_DDI: Record<string, string> = {
  tr: '90',
  'pt-BR': '55',
}

function resolveDdi(opts: { countryIso?: string; locale?: string }): string | undefined {
  const iso = opts.countryIso?.trim().toUpperCase()
  if (iso && COUNTRY_TO_DDI[iso]) return COUNTRY_TO_DDI[iso]
  if (opts.locale && LOCALE_TO_DDI[opts.locale]) return LOCALE_TO_DDI[opts.locale]
  return undefined
}

// Retorna "+<ddi><digitos>" quando dá pra determinar o país; senão devolve só os
// dígitos (comportamento antigo) e sinaliza via `hadCountry:false` pra quem chamar logar.
export function toE164(
  raw: string | undefined,
  opts: { countryIso?: string; locale?: string } = {}
): { phone?: string; hadCountry: boolean } {
  if (!raw) return { phone: undefined, hadCountry: false }
  const trimmed = String(raw).trim()

  // Já veio internacional (começa com +): só limpa e mantém.
  if (trimmed.startsWith('+')) {
    const d = trimmed.replace(/\D/g, '')
    return { phone: d ? `+${d}` : undefined, hadCountry: true }
  }

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return { phone: undefined, hadCountry: false }

  const ddi = resolveDdi(opts)
  if (!ddi) return { phone: digits, hadCountry: false } // sem país → não arrisca prefixo errado
  // Evita duplicar o DDI se o número já vier com ele.
  const withDdi = digits.startsWith(ddi) ? digits : `${ddi}${digits}`
  return { phone: `+${withDdi}`, hadCountry: true }
}
