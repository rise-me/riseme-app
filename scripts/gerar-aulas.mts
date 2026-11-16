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

// ── Versão 'es' (16/11/2026): as aulas em espanhol são OUTROS vídeos (YouTube). Transcrição Whisper em
// ~/Movies/Claude/aulas-es/aula-NN.es.json; títulos = messages/es.json challengeDays["1"] (revisados pelo [Melhoria de
// Produto] em 16/11 pelo que cada vídeo ES trabalha, docs/titulos-calistenia-es.md); salto só nos dias 25 e 27; dias 6 e 20 = mesmo vídeo.
const baseEs = `${homedir()}/Movies/Claude/aulas-es`
const titulosEs = (JSON.parse(readFileSync('messages/es.json', 'utf8')) as { challengeDays: Record<string, string[]> }).challengeDays['1']
const SALTO_ES = new Set([25, 27])
const outEs: Record<string, { texto: string; exercicios: string[]; duracaoMin: number; titulo: string; salto: boolean; obs?: string }> = {}
for (let d = 1; d <= 28; d++) {
  const f = `${baseEs}/aula-${String(d).padStart(2, '0')}.es.json`
  if (!existsSync(f)) continue
  const j = JSON.parse(readFileSync(f, 'utf8').replace(/:\s*NaN/g, ': null')) as { text: string; segments: { start: number; end: number; text: string }[] }
  const segs = j.segments ?? []
  const exercicios: string[] = []
  for (let i = 0; i < segs.length; i++) {
    const t = segs[i].text.trim().replace(/[.!]+$/, '')
    const pausa = i === 0 || segs[i].start - segs[i - 1].end > 2.5
    const lixo = /gracias por ver|suscr[ií]bete|siguiente ejercicio|[^\u0000-\u024F¡¿\s]|(\b\w+\b)(\s+\1){1,}|^\w{1,3}$|otra vez|reci[eé]n comenzado/i.test(t) || t.length > 60
    if (!lixo && pausa && t.split(/\s+/).length <= 6 && !/^(mant[eé]n|empieza|comienza|empuja|mueve|sost[eé]n|baja|levanta|lleva|aprieta|respira|ahora|vamos|y |no |intenta|despacio|vuelve|repite|cambia|bien|muy bien|genial|desde)/i.test(t) && /[a-záéíóúñ]/i.test(t)) {
      if (!exercicios.includes(t)) exercicios.push(t)
    }
  }
  outEs[String(d)] = {
    texto: j.text.replace(/¡?Gracias por ver el video!?/gi, ' ').replace(/[^\u0000-\u024F¡¿\s]+/g, ' ').replace(/(\b\w+\b)(\s+\1){2,}/gi, '$1').replace(/\s+/g, ' ').trim(), exercicios, duracaoMin: Math.round((segs.at(-1)?.end ?? 0) / 60),
    titulo: titulosEs[d - 1] ?? '', salto: SALTO_ES.has(d), ...(d === 6 || d === 20 ? { obs: 'dias 6 e 20 usam o MESMO vídeo (alongamento de quadril)' } : {}),
  }
}
const atual2 = JSON.parse(readFileSync(arq, 'utf8')) as Record<string, unknown>
writeFileSync(arq, JSON.stringify({ ...atual2, es: outEs }))
console.log(`es: ${Object.keys(outEs).length} aulas`)
for (const [d, a] of Object.entries(outEs)) console.log(`es dia ${d} · ${a.titulo} · ${a.duracaoMin} min${a.salto ? ' · SALTO' : ''} · ${a.exercicios.slice(0, 6).join(' | ')}`)
