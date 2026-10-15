// Ficha de desafio — v1 (2026-10-15). Um arquivo JSON por desafio novo (do 6 em diante):
// criar desafio no app = criar a ficha + uma linha em FICHAS abaixo, sem mexer em tela nem em
// messages/. Motivo: a esteira semanal de desafios do Drive (pedido do Bruno, 15/10/2026).
//
//   id         próximo número da sequência (o mesmo vai em HOTMART/PERFECTPAY_CHALLENGE_MAP e
//              em lib/hls-lessons.json[id][dia]); nunca reaproveitar
//   modulo     pasta de origem no Drive (rastreio: de onde veio o desafio)
//   emoji      ícone do card
//   gratis     true = aberto para todas
//   idiomas    locales do app onde o desafio APARECE (precisa ter áudio nesses idiomas)
//   titulo, categoria   um texto por idioma de `idiomas`
//   dias       { idioma: [título da aula 1, aula 2, …] } — o total de aulas sai daqui
//
// Os desafios 1–5 são anteriores à ficha: metadados em lib/mock-challenges.ts e textos em
// messages/*.json. Migram para ficha quando o feat/locale-cs entrar na main (ele também mexe
// nesses textos).

import prePart from './06-pre-parto.json'
import posPart from './07-pos-parto.json'

export interface FichaDesafio {
  id: string
  modulo: string
  emoji: string
  gratis: boolean
  idiomas: string[]
  titulo: Record<string, string>
  categoria: Record<string, string>
  dias: Record<string, string[]>
}

export const FICHAS: FichaDesafio[] = [prePart, posPart]

// Ficha quebrada derruba o build em vez de chegar torta para a aluna.
for (const f of FICHAS) {
  const total = f.dias[f.idiomas[0]]?.length ?? 0
  if (!total) throw new Error(`Ficha ${f.id}: sem aulas em ${f.idiomas[0]}`)
  for (const loc of f.idiomas) {
    if (!f.titulo[loc] || !f.categoria[loc]) throw new Error(`Ficha ${f.id}: falta título/categoria em ${loc}`)
    if (f.dias[loc]?.length !== total) throw new Error(`Ficha ${f.id}: ${loc} não tem ${total} aulas`)
  }
}
if (new Set(FICHAS.map((f) => f.id)).size !== FICHAS.length) throw new Error('Fichas com id repetido')

export const diasDaFicha = (f: FichaDesafio) => f.dias[f.idiomas[0]].length

// Textos das fichas no formato de messages/ (challengeData / challengeDays), para o
// i18n/request.ts juntar às mensagens do idioma. As telas leem por ali, como sempre.
export function mensagensDasFichas(locale: string) {
  const challengeData: Record<string, { title: string; category: string }> = {}
  const challengeDays: Record<string, string[]> = {}
  for (const f of FICHAS) {
    if (!f.idiomas.includes(locale)) continue
    challengeData[f.id] = { title: f.titulo[locale], category: f.categoria[locale] }
    challengeDays[f.id] = f.dias[locale]
  }
  return { challengeData, challengeDays }
}
