// Depoimento em VÍDEO (Bruno, 21/10/2026): quem completa 7 dias de treino recebe no WhatsApp o convite para gravar
// um vídeo curto contando a experiência; mandou o vídeo → 3 MESES do Pase Completo de presente. O vídeo é copiado
// para o storage (o link da Z-API é temporário) e o responsável recebe o link para baixar. Uso em anúncio só com
// a autorização dela por escrito na conversa (o agente pede).
// DADOS DO CASO: textos e prazos abaixo.

import { admin, variantesTelefone } from '@/lib/whatsapp-agent/conversa'
import { enfileirar, estaComProblema, pediuParaParar } from '@/lib/whatsapp-outbox'
import { darPaseGratis } from '@/lib/whatsapp-agent/indicacao'

const DIAS_MINIMOS = 7
const MESES_PRESENTE_DIAS = 90
const POR_HORA = 8 // convites por rodada (1x/hora): base atual (~290) entra aos poucos, sem rajada no chip
const BUCKET = 'depoimentos'
export const KIND_CONVITE = 'video-convite'
const HORA_INICIO = 9 // convite só de dia NO FUSO DELA (25/10: saíam de madrugada, 8/h a noite toda)
const HORA_FIM = 21

// Fuso pelo DDI do telefone; país fora da lista → México (maior base).
const FUSO_DDI: [string, string][] = [
  ['593', 'America/Guayaquil'], ['591', 'America/La_Paz'], ['595', 'America/Asuncion'], ['598', 'America/Montevideo'],
  ['502', 'America/Guatemala'], ['503', 'America/El_Salvador'], ['504', 'America/Tegucigalpa'], ['505', 'America/Managua'],
  ['506', 'America/Costa_Rica'], ['507', 'America/Panama'], ['52', 'America/Mexico_City'], ['57', 'America/Bogota'],
  ['51', 'America/Lima'], ['56', 'America/Santiago'], ['54', 'America/Argentina/Buenos_Aires'], ['58', 'America/Caracas'],
  ['34', 'Europe/Madrid'], ['48', 'Europe/Warsaw'], ['1', 'America/New_York'],
]

function horaLocal(tel: string): number {
  const tz = FUSO_DDI.find(([ddi]) => tel.startsWith(ddi))?.[1] ?? 'America/Mexico_City'
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(new Date()))
}

const CONVITE: Record<string, (nome: string, dias: number) => string> = {
  es: (nome, dias) =>
    [
      `¡Hola${nome ? ', ' + nome : ''}! 💛 Vimos que ya llevas ${dias} días de entrenamiento, ¡qué orgullo!`,
      '',
      '¿Te animas a grabar un video cortito (30 a 60 segundos, con el celular en vertical) contando tu experiencia? Puedes responder:',
      '• cómo estabas antes de empezar',
      '• qué cambió en estos días',
      '• cómo te sientes ahora',
      '',
      'Y di el nombre *RiseMe* en el video (por ejemplo: «Llevo 7 días entrenando con RiseMe y…»): así otras mujeres saben qué es lo que te está ayudando.',
      '',
      '🎁 Como agradecimiento, te regalamos *3 meses del Pase Completo* con todos los desafíos.',
      '',
      'Mándamelo por aquí y dime si nos autorizas a compartirlo en nuestras redes y anuncios.',
    ].join('\n'),
  pl: (nome, dias) =>
    [
      `Cześć${nome ? ', ' + nome : ''}! 💛 Widzimy, że masz już za sobą ${dias} dni treningów — gratulacje!`,
      '',
      'Nagrasz krótki filmik (30–60 sekund, telefon pionowo) o swoich wrażeniach? Możesz opowiedzieć:',
      '• jak było przed startem',
      '• co się zmieniło przez te dni',
      '• jak się teraz czujesz',
      '',
      'I wypowiedz w filmiku nazwę *RiseMe* (np. «Trenuję z RiseMe od 7 dni i…»): dzięki temu inne kobiety wiedzą, co Ci pomaga.',
      '',
      '🎁 W podziękowaniu dostaniesz w prezencie *3 miesiące Pase Completo* ze wszystkimi wyzwaniami.',
      '',
      'Wyślij go tutaj i napisz, czy możemy go udostępnić w naszych mediach społecznościowych i reklamach.',
    ].join('\n'),
}

/** Cron (1x por hora): convida quem chegou a 7+ dias de treino e ainda não foi convidada. */
export async function convidarParaVideo(): Promise<number> {
  if (new Date().getMinutes() !== 7) return 0
  const db = admin()
  const prog: { user_id: string; completed_at: string }[] = []
  for (let f = 0; ; f += 1000) {
    const { data } = await db.from('user_progress').select('user_id, completed_at').range(f, f + 999)
    prog.push(...(data ?? []))
    if ((data ?? []).length < 1000) break
  }
  const dias = new Map<string, number>()
  const ultimo = new Map<string, string>()
  for (const p of prog) {
    dias.set(p.user_id, (dias.get(p.user_id) ?? 0) + 1)
    if ((ultimo.get(p.user_id) ?? '') < p.completed_at) ultimo.set(p.user_id, p.completed_at)
  }
  // Mais recentes primeiro: quem acabou de chegar ao dia 7 está mais animada.
  const candidatas = [...dias].filter(([, n]) => n >= DIAS_MINIMOS).map(([u]) => u).sort((a, b) => (ultimo.get(b)! > ultimo.get(a)! ? 1 : -1))

  const { data: ja } = await db.from('whatsapp_outbox').select('phone').eq('kind', KIND_CONVITE)
  const convidadas = new Set((ja ?? []).map((r) => r.phone.replace(/\D/g, '').slice(-9)))
  let n = 0
  let t = Date.now() + 60_000
  for (const id of candidatas) {
    if (n >= POR_HORA) break
    const { data: u } = await db.from('users').select('phone, name').eq('id', id).maybeSingle()
    const tel = (u?.phone ?? '').replace(/\D/g, '')
    if (!tel || convidadas.has(tel.slice(-9))) continue
    const idioma = tel.startsWith('48') ? 'pl' : tel.startsWith('90') || tel.startsWith('420') || tel.startsWith('39') ? null : 'es'
    if (!idioma) continue
    const hora = horaLocal(tel)
    if (hora < HORA_INICIO || hora >= HORA_FIM) continue // de noite lá: fica pra uma rodada de dia
    if ((await pediuParaParar(tel)) || (await estaComProblema(tel))) continue
    const nome = (u?.name ?? '').trim().split(/\s+/)[0] ?? ''
    const nomeBonito = nome ? nome[0].toUpperCase() + nome.slice(1).toLowerCase() : ''
    await enfileirar({ phone: tel, kind: KIND_CONVITE, body: CONVITE[idioma](nomeBonito, dias.get(id)!), sendAfter: new Date(t) })
    convidadas.add(tel.slice(-9))
    t += 90_000
    n++
  }
  return n
}

export type ResultadoVideo = 'presente-liberado' | 'presente-ja-dado' | 'sem-conta' | 'erro-ao-salvar'

/** Ela mandou um vídeo: guarda no storage e, se tem conta, dá os 3 meses do Pase (1x). */
export async function receberVideo(p: { phone: string; userId: string | null; url: string; darPresente: boolean }): Promise<{ resultado: ResultadoVideo | 'sem-convite'; link: string | null }> {
  const db = admin()
  let link: string | null = null
  try {
    const res = await fetch(p.url)
    if (!res.ok) throw new Error(`download ${res.status}`)
    const tipo = res.headers.get('content-type') ?? 'video/mp4'
    const ext = tipo.includes('quicktime') ? 'mov' : 'mp4'
    const caminho = `${new Date().toISOString().slice(0, 10)}/${p.userId ?? p.phone}-${Date.now()}.${ext}`
    await db.storage.createBucket(BUCKET, { public: false }).catch(() => null) // já existe → ignora
    const up = await db.storage.from(BUCKET).upload(caminho, Buffer.from(await res.arrayBuffer()), { contentType: tipo })
    if (up.error) throw up.error
    const { data: s } = await db.storage.from(BUCKET).createSignedUrl(caminho, 30 * 86_400)
    link = s?.signedUrl ?? null
  } catch (err) {
    console.error(`[video-depoimento] não salvou o vídeo (${p.phone}):`, err)
    return { resultado: 'erro-ao-salvar', link: null }
  }
  if (!p.userId) return { resultado: 'sem-conta', link }
  if (!p.darPresente) return { resultado: 'sem-convite', link }
  const novo = await darPaseGratis(p.userId, `video-${p.userId}`, MESES_PRESENTE_DIAS)
  return { resultado: novo ? 'presente-liberado' : 'presente-ja-dado', link }
}

/**
 * Ela já foi convidada para o vídeo? (só então o presente de 3 meses vale). O convite vai pro telefone da CONTA; a
 * conversa pode chegar por LID ou noutra forma do número, então confere também o telefone da conta (26/10: a Erika
 * mandou o vídeo por LID e ficou sem o presente).
 */
export async function foiConvidadaParaVideo(phone: string, userId?: string | null): Promise<boolean> {
  const telefones = [phone]
  if (userId) {
    const { data: u } = await admin().from('users').select('phone').eq('id', userId).maybeSingle()
    if (u?.phone) telefones.push(u.phone.replace(/\D/g, ''))
  }
  const formas = telefones.flatMap((t) => variantesTelefone(t)).flatMap((v) => [v, `+${v}`])
  const { count } = await admin().from('whatsapp_outbox').select('id', { count: 'exact', head: true }).in('phone', formas).eq('kind', KIND_CONVITE).not('sent_at', 'is', null)
  return Boolean(count)
}
