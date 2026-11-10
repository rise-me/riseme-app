// Gera o mapa tela → pergunta → opções de um quiz (copy.<idioma>.json do funil) para o app ler as respostas
// (lib/quiz-contexto.ts). Genérico: serve a qualquer funil no formato do motor de quiz da casa.
// Uso: npx tsx scripts/gerar-mapa-quiz.mts <copy.json> <saida.json>
import { readFileSync, writeFileSync } from 'node:fs'
type Passo = { n: number; tipo: string; key?: string; titulo?: string; opciones?: { id: string; label: string }[]; campos?: unknown }
const [entrada, saida] = process.argv.slice(2)
if (!entrada || !saida) throw new Error('uso: gerar-mapa-quiz.mts <copy.json> <saida.json>')
const limpa = (s = '') => s.replace(/<[^>]+>/g, '').replace(/^[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}️‍\s]+/u, '').replace(/\s+/g, ' ').trim()
const copy = JSON.parse(readFileSync(entrada, 'utf8')) as { steps: Passo[] }
const mapa: Record<string, { key: string; pergunta: string; opcoes: Record<string, string> }> = {}
for (const p of copy.steps) {
  if (!p.key || p.tipo === 'info') continue
  const opcoes = Object.fromEntries((p.opciones ?? []).map((o) => [o.id, limpa(o.label)]))
  if (!Object.keys(opcoes).length && !/input|texto|numero|number|altura|peso|edad|nombre/i.test(`${p.tipo} ${p.key}`)) continue
  mapa[String(p.n)] = { key: p.key, pergunta: limpa(p.titulo), opcoes }
}
writeFileSync(saida, JSON.stringify(mapa, null, 1) + '\n')
console.log(`${Object.keys(mapa).length} telas →`, saida)
