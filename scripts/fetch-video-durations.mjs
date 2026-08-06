// Busca a duração REAL de cada vídeo do YouTube usado nos desafios e gera
// lib/video-durations.ts (mapa videoId → segundos). Motivo: a lista de aulas
// mostrava tempos inventados ([15,20,25,30] girando) e as alunas achavam que
// estavam na aula errada (ex.: card "20 min" pra um vídeo de 10:51).
//
// Fonte: scrape keyless do watch page ("lengthSeconds"). Sem chave de API.
// Rodar de novo sempre que trocar/adicionar vídeo em lib/mock-challenge-days.ts:
//   node scripts/fetch-video-durations.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(join(root, 'lib/mock-challenge-days.ts'), 'utf8')

// IDs do YouTube têm 11 chars [A-Za-z0-9_-]; extrai todos os literais de string
const ids = [...new Set([...source.matchAll(/'([A-Za-z0-9_-]{11})'/g)].map((m) => m[1]))]
console.log(`Vídeos únicos encontrados: ${ids.length}`)

async function fetchSeconds(id, attempt = 1) {
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${id}`, {
      headers: { 'accept-language': 'en' },
    })
    const html = await res.text()
    const m = html.match(/"lengthSeconds":"(\d+)"/)
    if (m) return Number(m[1])
    throw new Error('lengthSeconds não encontrado')
  } catch (err) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1500 * attempt))
      return fetchSeconds(id, attempt + 1)
    }
    console.error(`FALHOU ${id}: ${err.message}`)
    return null
  }
}

const results = {}
const failures = []
const POOL = 6
let cursor = 0
async function worker() {
  while (cursor < ids.length) {
    const id = ids[cursor++]
    const secs = await fetchSeconds(id)
    if (secs && secs > 0) {
      results[id] = secs
      process.stdout.write(`${Object.keys(results).length}/${ids.length}\r`)
    } else {
      failures.push(id)
    }
  }
}
await Promise.all(Array.from({ length: POOL }, worker))
console.log(`\nOK: ${Object.keys(results).length} · Falhas: ${failures.length}`)
if (failures.length) console.log('IDs sem duração (vão ficar sem tempo na lista):', failures.join(', '))

const sorted = Object.keys(results).sort()
const lines = sorted.map((id) => `  '${id}': ${results[id]},`)
const out = `// GERADO por scripts/fetch-video-durations.mjs — NÃO editar na mão.
// Duração real (segundos) de cada vídeo do YouTube dos desafios.
// Regenerar ao trocar/adicionar vídeo: node scripts/fetch-video-durations.mjs
export const VIDEO_DURATIONS_SECONDS: Record<string, number> = {
${lines.join('\n')}
}
`
writeFileSync(join(root, 'lib/video-durations.ts'), out)
console.log(`Gravado lib/video-durations.ts (${sorted.length} vídeos)`)
if (failures.length) process.exit(1)
