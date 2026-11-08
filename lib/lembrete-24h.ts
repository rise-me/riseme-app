// Lembrete de 24 h para quem recebeu o acesso por WhatsApp e nunca entrou (c1 do mapa; Bruno 08/11/2026: "faz sentido").
// Roda 1x/hora (minuto 23) dentro do cron da fila (app/api/whatsapp/outbox). Regras do chip: uma vez por aluna, só de dia no
// fuso dela, poucas por rodada, com 90 s entre uma e outra. Quem pediu para parar, está com problema aberto ou falando com
// uma pessoa fica de fora. Não leva senha nem link novo: aponta para a mensagem de acesso que ela já tem e convida a responder
// (aí o bot reenvia o acesso pelo caminho normal). "Tu día 1 está aquí" (48 h, c2) só depois de este rodar (Bruno 08/11).
import { admin, variantesTelefone } from './whatsapp-agent/conversa'
import { enfileirar, jaEnfileirou, pediuParaParar, estaComProblema } from './whatsapp-outbox'
import { horaLocal } from './video-depoimento'

export const KIND_LEMBRETE = 'lembrete-24h'
const MINUTO = 23
const POR_HORA = 10
const HORA_INICIO = 10
const HORA_FIM = 20
const JANELA_H: [number, number] = [24, 48] // acesso enviado entre 24 e 48 h atrás

const TEXTO: Record<string, (nome: string) => string> = {
  es: (n) =>
    `¡Hola${n ? ', ' + n : ''}! 💛 Ayer te llegó tu acceso y vi que todavía no entraste.\n\n` +
    'Tu correo y tu contraseña están en el mensaje de arriba 👆 El día 1 son unos 15 minutos y lo puedes hacer hoy mismo.\n\n' +
    '¿No encuentras el acceso o no consigues entrar? Responde aquí y te lo mando de nuevo.',
  pl: (n) =>
    `Cześć${n ? ', ' + n : ''}! 💛 Wczoraj dotarł do Ciebie dostęp, a widzę, że jeszcze nie weszłaś.\n\n` +
    'Twój e-mail i hasło są w wiadomości powyżej 👆 Dzień 1 to około 15 minut i możesz go zrobić już dziś.\n\n' +
    'Nie możesz znaleźć dostępu albo zalogować się? Odpisz tutaj, a wyślę go jeszcze raz.',
  en: (n) =>
    `Hi${n ? ', ' + n : ''}! 💛 Your access arrived yesterday and I see you haven't logged in yet.\n\n` +
    'Your email and password are in the message above 👆 Day 1 takes about 15 minutes and you can do it today.\n\n' +
    "Can't find the access or can't log in? Reply here and I'll send it again.",
  it: (n) =>
    `Ciao${n ? ', ' + n : ''}! 💛 Ieri ti è arrivato l'accesso e vedo che non sei ancora entrata.\n\n` +
    'La tua email e la password sono nel messaggio qui sopra 👆 Il giorno 1 dura circa 15 minuti e puoi farlo oggi stesso.\n\n' +
    'Non trovi l’accesso o non riesci a entrare? Rispondi qui e te lo rimando.',
  cs: (n) =>
    `Ahoj${n ? ', ' + n : ''}! 💛 Včera ti přišel přístup a vidím, že ses ještě nepřihlásila.\n\n` +
    'Tvůj e-mail a heslo jsou ve zprávě výše 👆 Den 1 zabere asi 15 minut a můžeš ho zvládnout ještě dnes.\n\n' +
    'Nemůžeš přístup najít nebo se přihlásit? Odepiš sem a pošlu ti ho znovu.',
  ro: (n) =>
    `Bună${n ? ', ' + n : ''}! 💛 Ieri ți-a ajuns accesul și văd că încă nu ai intrat.\n\n` +
    'E-mailul și parola ta sunt în mesajul de mai sus 👆 Ziua 1 durează cam 15 minute și o poți face chiar azi.\n\n' +
    'Nu găsești accesul sau nu reușești să intri? Răspunde aici și ți-l trimit din nou.',
  tr: (n) =>
    `Merhaba${n ? ' ' + n : ''}! 💛 Erişimin dün ulaştı ve henüz giriş yapmadığını görüyorum.\n\n` +
    'E-postan ve şifren yukarıdaki mesajda 👆 1. gün yaklaşık 15 dakika sürüyor ve bugün yapabilirsin.\n\n' +
    'Erişimi bulamıyor ya da giriş yapamıyor musun? Buradan yaz, tekrar göndereyim.',
}

async function contaDoTelefone(tel: string): Promise<{ id: string; nome: string } | null> {
  const candidatos = variantesTelefone(tel).flatMap((v) => [`+${v}`, v])
  const { data } = await admin().from('users').select('id, name').in('phone', candidatos).limit(1)
  return data?.[0] ? { id: data[0].id, nome: (data[0].name ?? '').trim().split(/\s+/)[0] ?? '' } : null
}

export async function lembrarQuemNaoEntrou(): Promise<number> {
  if (new Date().getMinutes() !== MINUTO) return 0
  const db = admin()
  const ate = new Date(Date.now() - JANELA_H[0] * 3600_000).toISOString()
  const desde = new Date(Date.now() - JANELA_H[1] * 3600_000).toISOString()
  const { data: acessos } = await db.from('whatsapp_outbox').select('phone, sent_at').eq('kind', 'acesso').gte('sent_at', desde).lte('sent_at', ate).order('sent_at', { ascending: false })
  const vistos = new Set<string>()
  let n = 0
  let t = Date.now() + 60_000
  for (const a of acessos ?? []) {
    if (n >= POR_HORA) break
    const tel = String(a.phone).replace(/\D/g, '')
    if (tel.length < 8 || String(a.phone).includes('@lid')) continue
    const chave = tel.slice(-9)
    if (vistos.has(chave)) continue
    vistos.add(chave)
    const hora = horaLocal(tel)
    if (hora < HORA_INICIO || hora >= HORA_FIM) continue // de noite lá: fica para uma rodada de dia (a janela vai até 48 h)
    if (await jaEnfileirou(tel, KIND_LEMBRETE)) continue
    const conta = await contaDoTelefone(tel)
    if (!conta) continue
    const { data: au } = await db.auth.admin.getUserById(conta.id)
    if (!au?.user || au.user.last_sign_in_at) continue // já entrou
    const { data: chat } = await db.from('whatsapp_chats').select('mode').in('phone', variantesTelefone(tel)).limit(1)
    if (chat?.[0]?.mode === 'human') continue // pessoa atendendo
    if ((await pediuParaParar(tel)) || (await estaComProblema(tel))) continue
    const loc = au.user.user_metadata?.locale as string | undefined
    const idioma = loc && TEXTO[loc] ? loc : tel.startsWith('48') ? 'pl' : 'es'
    const nome = conta.nome ? conta.nome[0].toUpperCase() + conta.nome.slice(1).toLowerCase() : ''
    await enfileirar({ phone: tel, kind: KIND_LEMBRETE, body: TEXTO[idioma](nome), sendAfter: new Date(t) })
    t += 90_000
    n++
  }
  return n
}
