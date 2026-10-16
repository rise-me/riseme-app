// Convite de depoimento para compradoras ANTIGAS (que compraram antes do convite automático de 14/10).
// Em lotes pequenos para medir antes de volumizar (pedido do Bruno). Mesmo texto/links/regras do
// convite automático: lib/whatsapp-agent/depoimentos.ts; na hora de enviar, a fila pula quem pediu
// para parar, já recebeu, está com pessoa atendendo ou tem consulta aberta (lib/whatsapp-outbox.ts).
//
// Simula por padrão. Uso:
//   npx tsx --env-file=.env.local scripts/convidar-depoimento.ts --limit 30 [--idioma pl]
//   npx tsx --env-file=.env.local scripts/convidar-depoimento.ts --limit 30 --inicio 2026-10-15T13:00:00Z --intervalo 4 --go
// Escolhe as compras mais recentes primeiro (quem acabou de entrar lembra melhor da compra).

import { admin } from '@/lib/whatsapp-agent/conversa'
import { conviteDepoimento } from '@/lib/whatsapp-agent/depoimentos'
import { enfileirar, pediuParaParar } from '@/lib/whatsapp-outbox'
import { toZapiPhone } from '@/lib/zapi'

function arg(nome: string, padrao?: string) {
  const i = process.argv.indexOf(`--${nome}`)
  return i >= 0 ? process.argv[i + 1] : padrao
}

async function main() {
  const go = process.argv.includes('--go')
  const limit = Number(arg('limit', '30'))
  const intervaloMin = Number(arg('intervalo', '4'))
  const inicio = new Date(arg('inicio') ?? Date.now() + 5 * 60_000)
  const soIdioma = arg('idioma') // ex.: pl — só as compradoras desse idioma
  const db = admin()

  const { data: acessos } = await db
    .from('whatsapp_outbox')
    .select('phone, body, sent_at')
    .eq('kind', 'acesso')
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(2000)
  const { data: ja } = await db.from('whatsapp_outbox').select('phone').eq('kind', 'depoimento')
  const jaTem = new Set((ja ?? []).map((r) => toZapiPhone(r.phone)))

  const alvos: { phone: string; convite: string; quando: string }[] = []
  const vistos = new Set<string>()
  for (const a of acessos ?? []) {
    const phone = toZapiPhone(a.phone)
    if (vistos.has(phone) || jaTem.has(phone)) continue
    vistos.add(phone)
    // Idioma pela mensagem de acesso (só idiomas com link recebem convite).
    const idioma = /¡Bienvenida/.test(a.body) ? 'es' : /Witaj/.test(a.body) ? 'pl' : /hoş geldin/.test(a.body) ? 'tr' : 'es'
    if (soIdioma && idioma !== soIdioma) continue
    const convite = conviteDepoimento(idioma, phone)
    if (!convite || (await pediuParaParar(phone))) continue
    alvos.push({ phone, convite, quando: a.sent_at })
    if (alvos.length >= limit) break
  }

  const fim = new Date(inicio.getTime() + Math.max(alvos.length - 1, 0) * intervaloMin * 60_000)
  console.log(`Vão receber: ${alvos.length} · 1 a cada ${intervaloMin} min · ${inicio.toISOString()} → ${fim.toISOString()}`)
  for (const a of alvos) console.log(`  acesso em ${a.quando.slice(0, 16)}  ${a.phone}`)
  if (!go) return console.log('\n(simulação — nada enfileirado. Use --go.)')

  for (const [i, a] of alvos.entries()) {
    await enfileirar({ phone: a.phone, kind: 'depoimento', body: a.convite, sendAfter: new Date(inicio.getTime() + i * intervaloMin * 60_000) })
  }
  console.log(`\n✓ ${alvos.length} convites na fila.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
