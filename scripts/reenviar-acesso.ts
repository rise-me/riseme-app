// Reenvia o acesso por WhatsApp para quem comprou ANTES do WhatsApp automático
// (Z-API, 04/10/2026 ~15h UTC) e NUNCA entrou no app. A senha original não fica
// guardada (só o hash), então cada uma ganha uma SENHA NOVA — seguro porque ela
// nunca usou a antiga. Mesmo texto/fila da compra (lib/whatsapp-access.ts,
// lib/whatsapp-outbox.ts), com uma linha de abertura de "reenvio".
//
// Simula por padrão. Uso:
//   npx tsx --env-file=.env.local scripts/reenviar-acesso.ts                # lista + prévia
//   npx tsx --env-file=.env.local scripts/reenviar-acesso.ts --go           # valendo
// Opções: --desde 2026-09-01  --inicio 2026-10-05T14:00:00Z  --intervalo 2 (min)  --limit N
//
// Ritmo: 1 compradora a cada --intervalo minutos (fila), pra não parecer disparo em massa.
// Fica de fora: quem já entrou, quem não tem telefone, quem não tem mais acesso
// (reembolso) e quem já tem mensagem na fila/histórico.

import { generateAccessCode, buildAccessLink } from '@/lib/access-code'
import { mensagensDeAcesso } from '@/lib/whatsapp-access'
import { enfileirar } from '@/lib/whatsapp-outbox'
import { admin } from '@/lib/whatsapp-agent/conversa'
import { toZapiPhone } from '@/lib/zapi'

const APP_URL = 'https://riseme.app'
const WHATSAPP_NO_AR = '2026-10-04T15:00:00Z'

// Sem a palavra "anterior": a msg de acesso diz "la contraseña anterior" no sentido de "a de cima".
const ABERTURA: Record<string, string> = {
  es: '¡Hola! 💛 Te reenviamos por aquí tu acceso a RiseMe. Tu contraseña fue renovada: usa la que aparece en este mensaje.',
  pl: 'Cześć! 💛 Przesyłamy Ci tutaj dostęp do RiseMe. Twoje hasło zostało odnowione: użyj tego z tej wiadomości.',
  tr: 'Merhaba! 💛 RiseMe erişimini buradan tekrar gönderiyoruz. Şifren yenilendi: bu mesajdaki şifreyi kullan.',
  en: 'Hi! 💛 We are resending your RiseMe access here. Your password was renewed: use the one in this message.',
  'pt-BR': 'Oi! 💛 Estamos reenviando por aqui seu acesso ao RiseMe. Sua senha foi renovada: use a que está nesta mensagem.',
}

// Número mal formado (DDI duplicado, dígito sobrando) não pode receber senha: pergunta à Z-API.
async function temWhatsApp(phone: string): Promise<boolean> {
  const r = await fetch(
    `https://api.z-api.io/instances/${process.env.ZAPI_INSTANCE_ID}/token/${process.env.ZAPI_TOKEN}/phone-exists/${toZapiPhone(phone)}`,
    { headers: process.env.ZAPI_CLIENT_TOKEN ? { 'Client-Token': process.env.ZAPI_CLIENT_TOKEN } : {} }
  )
  if (!r.ok) throw new Error(`phone-exists ${r.status}`)
  return Boolean(((await r.json()) as { exists?: boolean }).exists)
}

function arg(nome: string, padrao?: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`)
  return i >= 0 ? process.argv[i + 1] : padrao
}

async function main() {
  const go = process.argv.includes('--go')
  const desde = arg('desde', '2026-09-01')!
  const intervaloMin = Number(arg('intervalo', '2'))
  const limit = Number(arg('limit', '0'))
  const inicio = new Date(arg('inicio') ?? Date.now() + 5 * 60_000)
  const db = admin()

  // Contas do período (perfil público tem telefone; auth tem login e idioma).
  const { data: perfis, error } = await db
    .from('users')
    .select('id, email, name, phone, created_at')
    .gte('created_at', desde)
    .lt('created_at', WHATSAPP_NO_AR)
    .order('created_at', { ascending: true })
  if (error) throw error

  const [{ data: naFila }, { data: noHistorico }] = await Promise.all([
    db.from('whatsapp_outbox').select('phone'),
    db.from('whatsapp_messages').select('phone').eq('author', 'system'),
  ])
  const jaContatado = new Set([...(naFila ?? []), ...(noHistorico ?? [])].map((r) => toZapiPhone(r.phone)))

  const alvos: { id: string; email: string; phone: string; locale: string; created: string }[] = []
  const pulos: Record<string, number> = {}
  const pular = (motivo: string) => (pulos[motivo] = (pulos[motivo] ?? 0) + 1)
  for (const p of perfis) {
    if (!p.phone) { pular('sem telefone'); continue }
    if (jaContatado.has(toZapiPhone(p.phone))) { pular('já contatada pelo WhatsApp novo'); continue }
    const { count } = await db.from('user_challenges').select('id', { count: 'exact', head: true }).eq('user_id', p.id)
    if (!count) { pular('sem acesso (reembolso?)'); continue }
    const { data: auth } = await db.auth.admin.getUserById(p.id)
    if (auth?.user?.last_sign_in_at) { pular('já entrou no app'); continue }
    if (!(await temWhatsApp(p.phone))) { pular('número sem WhatsApp (mal formado?)'); continue }
    alvos.push({
      id: p.id,
      email: p.email,
      phone: p.phone,
      locale: (auth?.user?.user_metadata?.locale as string) ?? 'es',
      created: p.created_at.slice(0, 10),
    })
  }
  const lote = limit ? alvos.slice(0, limit) : alvos

  console.log(`Período: ${desde} → ${WHATSAPP_NO_AR} · contas: ${perfis.length}`)
  console.log('Fora da lista:', pulos)
  console.log(`Vão receber: ${lote.length} (de ${alvos.length})`)
  const fim = new Date(inicio.getTime() + Math.max(lote.length - 1, 0) * intervaloMin * 60_000)
  console.log(`Ritmo: 1 a cada ${intervaloMin} min · de ${inicio.toISOString()} até ${fim.toISOString()}\n`)
  for (const a of lote) console.log(`  ${a.created} ${a.locale.padEnd(5)} ${a.phone.padEnd(16)} ${a.email.slice(0, 3)}…`)

  const exemplo = lote[0]
  if (exemplo) {
    const [m1, m2] = mensagensDeAcesso({
      locale: exemplo.locale,
      email: exemplo.email,
      code: 'xxxxxxxx',
      link: buildAccessLink(APP_URL, exemplo.locale, exemplo.email, 'xxxxxxxx'),
    })
    console.log('\n──── prévia (1ª da lista) ────\n' + (ABERTURA[exemplo.locale] ?? ABERTURA.es) + '\n\n' + m1 + '\n\n──── 2ª mensagem ────\n' + m2)
  }

  if (!go) {
    console.log('\n(simulação — nada foi alterado. Rode com --go para valer.)')
    return
  }

  let ok = 0
  for (const [i, a] of lote.entries()) {
    const code = generateAccessCode()
    const { error: e } = await db.auth.admin.updateUserById(a.id, { password: code })
    if (e) { console.error(`  ✗ ${a.email}: senha não trocada (${e.message}) — pulada`); continue }
    const link = buildAccessLink(APP_URL, a.locale, a.email, code)
    const [m1, m2] = mensagensDeAcesso({ locale: a.locale, email: a.email, code, link })
    const sendAt = new Date(inicio.getTime() + i * intervaloMin * 60_000)
    const corpo = (ABERTURA[a.locale] ?? ABERTURA.es) + '\n\n' + m1
    const idAcesso = await enfileirar({ phone: a.phone, kind: 'acesso-retro', body: corpo, mask: code, sendAfter: sendAt })
    if (!idAcesso) { console.error(`  ✗ ${a.email}: não entrou na fila`); continue }
    await enfileirar({ phone: a.phone, kind: 'apoio', body: m2, sendAfter: new Date(sendAt.getTime() + 45_000), dependsOn: idAcesso })
    ok++
  }
  console.log(`\n✓ ${ok} na fila. O cron envia no horário marcado; acompanhe em whatsapp_outbox.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
