import { randomInt } from 'crypto'

// Alfabeto sem caracteres ambíguos (0/o, 1/i/l) — a aluna lê e digita o código
// no WhatsApp sem confundir. Usado como senha inicial da conta na compra.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

export function generateAccessCode(length = 8): string {
  let out = ''
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)]
  }
  return out
}

// Link de um toque que abre o app já preenchendo email + código.
export function buildAccessLink(appUrl: string, locale: string, email: string, code: string): string {
  const base = appUrl.replace(/\/$/, '')
  const prefix = locale && locale !== 'es' ? `/${locale}` : '' // es é default (localePrefix as-needed)
  const params = new URLSearchParams({ e: email, k: code })
  return `${base}${prefix}/entrar?${params.toString()}`
}
