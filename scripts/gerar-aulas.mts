// Gera lib/whatsapp-agent/aulas-calistenia.json a partir das transcrições Whisper (inglês) das 28 aulas da Calistenia
// (~/Ferramentas/fabrica-dublagem/trabalho/aula-NN.json). Bruno 05/11/2026: "transcrever as aulas para o bot responder
// com precisão qualquer coisa dentro das aulas" (caso Sandra #148: "o que trabalha a prancha lateral do dia 14").
// Uso: npx tsx scripts/gerar-aulas.mts
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { homedir } from 'os'
const base = `${homedir()}/Ferramentas/fabrica-dublagem/trabalho`
const out: Record<string, { texto: string; exercicios: string[]; duracaoMin: number }> = {}
for (let d = 1; d <= 28; d++) {
  const f = `${base}/aula-${String(d).padStart(2, '0')}.json`
  if (!existsSync(f)) continue
  const j = JSON.parse(readFileSync(f, 'utf8').replace(/:\s*NaN/g, ': null')) as { text: string; segments: { start: number; end: number; text: string }[] }
  const segs = j.segments ?? []
  // nome de exercício = segmento curto (≤ 6 palavras) que não é instrução ("keep", "start", "push"…), vindo depois de uma pausa > 3 s
  const exercicios: string[] = []
  for (let i = 0; i < segs.length; i++) {
    const t = segs[i].text.trim().replace(/[.!]+$/, '')
    const pausa = i === 0 || segs[i].start - segs[i - 1].end > 2.5
    if (pausa && t.split(/\s+/).length <= 6 && !/^(keep|start|push|move|hold|lower|lift|bring|squeeze|breathe|now|go|and|let|don|make|try|slowly|return|repeat|switch|good|great|nice)/i.test(t) && /[a-z]/i.test(t)) {
      if (!exercicios.includes(t)) exercicios.push(t)
    }
  }
  out[String(d)] = { texto: j.text.replace(/\s+/g, ' ').trim(), exercicios, duracaoMin: Math.round((segs.at(-1)?.end ?? 0) / 60) }
}
// As aulas em ESPANHOL são outros vídeos (Bruno 05/11): este arquivo guarda as versões por idioma; esta rotina preenche 'en'.
const arq = 'lib/whatsapp-agent/aulas-calistenia.json'
const atual = existsSync(arq) ? (JSON.parse(readFileSync(arq, 'utf8')) as Record<string, unknown>) : {}
writeFileSync(arq, JSON.stringify({ ...atual, en: out }))
console.log(`${Object.keys(out).length} aulas · ${Math.round(Object.values(out).reduce((n, a) => n + a.texto.length, 0) / 3.6)} tokens no total`)
for (const [d, a] of Object.entries(out).slice(0, 28)) console.log(`dia ${d} · ${a.duracaoMin} min · ${a.exercicios.slice(0, 8).join(' | ')}`)
