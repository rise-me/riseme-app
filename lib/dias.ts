// Dia do calendário no fuso DA ALUNA (25/10/2026). O servidor da Vercel roda em UTC: depois das 19h na Colômbia
// (21h no México) o "HOJE" do Progresso pulava pro dia seguinte, o treino da noite caía no dia errado e a sequência
// zerava (Diana, Sandra, Yuly). O fuso vem do cookie `tz`, gravado pelo navegador (app/[locale]/(app)/layout.tsx).

import { cookies } from 'next/headers'

export const COOKIE_FUSO = 'tz'

// Sem cookie ainda (1º carregamento): fuso mais comum de cada idioma.
const FUSO_DO_IDIOMA: Record<string, string> = {
  es: 'America/Mexico_City',
  pl: 'Europe/Warsaw',
  cs: 'Europe/Prague',
  it: 'Europe/Rome',
  tr: 'Europe/Istanbul',
  'pt-BR': 'America/Sao_Paulo',
  en: 'America/New_York',
}

export async function fusoDaAluna(locale: string): Promise<string> {
  const bruto = (await cookies()).get(COOKIE_FUSO)?.value
  const tz = bruto ? decodeURIComponent(bruto) : null
  if (tz) {
    try {
      new Intl.DateTimeFormat('en-CA', { timeZone: tz })
      return tz
    } catch {
      // fuso inválido no cookie → cai no do idioma
    }
  }
  return FUSO_DO_IDIOMA[locale] ?? 'UTC'
}

/** 'AAAA-MM-DD' do instante `d` no fuso `tz`. */
export function diaNoFuso(d: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d)
}

/** Número do dia (dias desde 1970) de um 'AAAA-MM-DD' — para contar diferença entre dias. */
export function numeroDoDia(dia: string): number {
  return Math.round(Date.parse(`${dia}T00:00:00Z`) / 86_400_000)
}

/** Dias seguidos com treino até hoje (ou até ontem, se hoje ainda não treinou). */
export function sequenciaDeDias(concluidos: Date[], tz: string): number {
  const dias = new Set(concluidos.map((d) => numeroDoDia(diaNoFuso(d, tz))))
  if (dias.size === 0) return 0
  let cursor = numeroDoDia(diaNoFuso(new Date(), tz))
  if (!dias.has(cursor)) cursor-- // hoje ainda não treinou: a sequência de ontem continua valendo
  let seq = 0
  while (dias.has(cursor)) {
    seq++
    cursor--
  }
  return seq
}
