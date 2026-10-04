#!/usr/bin/env node
// Renderiza um material (bônus/upsell) de HTML para PDF com o Chrome headless.
//
//   node scripts/render-material.mjs <id> <locale>      → materiais/_out/<id>-<locale>.pdf
//   node scripts/render-material.mjs --all [locale]      → todos os materiais (do idioma, se dado)
//
// Antes de imprimir, confere se alguma página estoura (texto maior que a folha ou
// encostando no rodapé) — tradução costuma ser mais longa que o original. Página
// estourada = erro e nada é gerado. Depois: scripts/publish-material.py sobe o PDF.
// Sem dependência nova: usa o Chrome instalado (CHROME_PATH para outro caminho).

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MATERIAIS = join(ROOT, 'materiais')
const OUT = join(MATERIAIS, '_out')
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

// Marca no <body> as páginas com problema, depois que as fontes carregam
const CHECK = `<script>
document.fonts.ready.then(() => {
  const bad = []
  document.querySelectorAll('.page').forEach((p, i) => {
    const foot = p.querySelector('.foot')
    const kids = [...p.children].filter((c) => c !== foot)
    const bottom = Math.max(...kids.map((c) => c.getBoundingClientRect().bottom))
    const limit = foot ? foot.getBoundingClientRect().top - 6 : p.getBoundingClientRect().bottom
    if (p.scrollHeight > p.clientHeight + 1 || bottom > limit) bad.push(i + 1 + ':' + Math.round(bottom - limit) + 'px')
  })
  document.body.setAttribute('data-overflow', bad.join(' ') || 'ok')
})
</script>`

function chrome(args) {
  return execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=15000', ...args], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 64 * 1024 * 1024,
  })
}

function render(id, locale) {
  const src = join(MATERIAIS, id, `${locale}.html`)
  if (!existsSync(src)) throw new Error(`não existe: ${src}`)

  const probe = join(MATERIAIS, id, `.${locale}.check.html`)
  writeFileSync(probe, readFileSync(src, 'utf8').replace('</body>', `${CHECK}</body>`))
  let overflow
  try {
    const dom = chrome(['--dump-dom', `file://${probe}`])
    overflow = dom.match(/data-overflow="([^"]*)"/)?.[1] ?? 'sem resposta (fontes não carregaram?)'
  } finally {
    rmSync(probe, { force: true })
  }
  if (overflow !== 'ok') {
    console.error(`✗ ${id}/${locale}: página(s) estourada(s) [página:excesso] → ${overflow}`)
    return false
  }

  mkdirSync(OUT, { recursive: true })
  const pdf = join(OUT, `${id}-${locale}.pdf`)
  chrome(['--no-pdf-header-footer', `--print-to-pdf=${pdf}`, `file://${src}`])
  console.log(`✓ ${id}/${locale} → ${pdf.replace(ROOT + '/', '')}`)
  return true
}

const [a, b] = process.argv.slice(2)
let ok = true
if (a === '--all') {
  for (const id of readdirSync(MATERIAIS).filter((d) => !d.startsWith('_') && !d.startsWith('.'))) {
    for (const f of readdirSync(join(MATERIAIS, id)).filter((f) => /^[a-zA-Z-]+\.html$/.test(f))) {
      const locale = f.replace('.html', '')
      if (!b || b === locale) ok = render(id, locale) && ok
    }
  }
} else if (a && b) {
  ok = render(a, b)
} else {
  console.error('uso: node scripts/render-material.mjs <id> <locale> | --all [locale]')
  process.exit(2)
}
process.exit(ok ? 0 : 1)
