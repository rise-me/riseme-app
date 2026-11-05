// Gera docs/catalogo-ofertas.md a partir de lib/catalogo.ts (fonte única), para o Bruno validar.
// Uso: npx tsx scripts/catalogo-md.ts
import { writeFileSync } from 'fs'
import { CATALOGO, blocoCatalogo } from '@/lib/catalogo'

const linhas: string[] = [
  '# Catálogo de ofertas — gerado de `lib/catalogo.ts` (não editar aqui; editar o .ts e rodar `npx tsx scripts/catalogo-md.ts`)',
  '',
  `Gerado em ${new Date().toISOString().slice(0, 10)}. Fonte: API da Hotmart (vendas por oferta), CL-ES/config.js, dash, código. "?" = o Bruno preenche.`,
  '',
  '| Produto | Plataforma | Oferta | Preço | Status | Países | Link | Nota |',
  '|---|---|---|---|---|---|---|---|',
]
for (const p of CATALOGO) {
  if (!p.ofertas.length) linhas.push(`| ${p.nome} (${p.idioma}) | ${p.plataforma} | — | — | só pelo Pase | — | — | ${p.oQueE} |`)
  for (const o of p.ofertas) linhas.push(`| ${p.nome} (${p.idioma}) | ${p.plataforma}${p.hotmartId ? ` ${p.hotmartId}` : ''} | \`${o.codigo}\` | ${o.preco} | ${o.status}${o.ate ? ` até ${o.ate}` : ''} | ${o.paises?.join(', ') ?? 'todos'} | ${o.link ? `<${o.link}>` : '—'} | ${o.nota ?? ''} |`)
}
linhas.push('', '## O que o bot de atendimento lê (bloco gerado, idioma es)', '', '```', blocoCatalogo('es'), '```', '')
writeFileSync('docs/catalogo-ofertas.md', linhas.join('\n'))
console.log('docs/catalogo-ofertas.md gerado')
