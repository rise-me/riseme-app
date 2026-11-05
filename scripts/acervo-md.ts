// Gera docs/acervo-cientifico.md a partir de lib/whatsapp-agent/acervo.ts (fonte única), para o Bruno revisar.
// Uso: npx tsx scripts/acervo-md.ts
import { writeFileSync } from 'fs'
import { ACERVO } from '@/lib/whatsapp-agent/acervo'
const linhas = [
  '# Acervo científico do atendimento — gerado de `lib/whatsapp-agent/acervo.ts` (editar o .ts e rodar `npx tsx scripts/acervo-md.ts`)',
  '',
  `Gerado em ${new Date().toISOString().slice(0, 10)}. ${ACERVO.length} trechos. Regra (Bruno 05/11/2026): só fonte confiável e válida em qualquer região; resposta que a aluna possa aplicar com segurança. "Revisado" vazio = leva inicial, aguardando a leitura do Bruno.`,
  '',
]
let tema = ''
for (const t of ACERVO) {
  if (t.tema !== tema) { tema = t.tema; linhas.push(`## ${tema}`, '') }
  linhas.push(`### ${t.id} · ${t.titulo}${t.revisado ? ` · revisado ${t.revisado}` : ' · a revisar'}`, '', t.pontos, '')
  if (t.cuidado) linhas.push(`**Cuidado:** ${t.cuidado}`, '')
  linhas.push('Fontes:', ...t.fontes.map((f) => `- ${f.org} — *${f.titulo}* (${f.ano})${f.url ? ` — <${f.url}>` : ''}`), '', `Palavras que acionam: ${t.tags.join(', ')}`, '')
}
writeFileSync('docs/acervo-cientifico.md', linhas.join('\n'))
console.log('docs/acervo-cientifico.md gerado')
