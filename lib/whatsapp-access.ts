// Entrega do acesso por WhatsApp na compra — escolhe o canal pela env
// WHATSAPP_PROVIDER:
//   "zapi"  → envia direto pela Z-API, com o texto abaixo (no idioma da oferta)
//   vazio / "voxuy" → fluxo antigo: Voxuy dispara a mensagem montada lá (lib/voxuy.ts)
// A chave existe pra voltar à Voxuy em minutos se o número tiver problema na Z-API
// (trocar a env + redeploy), sem mexer em código. Best-effort como antes: a criação
// da conta NUNCA depende disso — o email (lib/email.ts) sai sempre, em paralelo.
//
// SEQUÊNCIA (herdada da Voxuy, texto que rodava desde o início — 04/10/2026):
//   1) ACESSO, ~15 min após a compra (fim da VSL do upsell): email + senha + link de um
//      toque + como entrar outro dia + instalar o app
//   2) APOIO, ~45 s depois da 1ª: "se ainda não conseguiu, me escreve" + playlist das aulas
//      no YouTube (só nos idiomas com playlist em PLAYLIST)
// A 3ª mensagem da Voxuy (grupo de WhatsApp das alunas) foi REMOVIDA de propósito:
// grupo com 150–200 entradas/dia virou moderação/spam; dúvida agora é no privado (agente).

import { sendVoxuyAccess } from '@/lib/voxuy'
import { isZapiConfigured } from '@/lib/zapi'
import { enfileirar } from '@/lib/whatsapp-outbox'

type AccessCopy = (p: { email: string; code: string; link: string; homeUrl: string }) => string
type SupportCopy = (p: { playlist?: string }) => string

// Atraso do acesso: tempo da VSL do upsell (~15 min). Ajustável sem deploy de código.
const ATRASO_ACESSO_MIN = Number(process.env.WHATSAPP_ACCESS_DELAY_MIN ?? 15)
const ESPERA_MSG2_MS = 45_000

// Playlist (não listada) das aulas por idioma — reserva pra ela não perder o dia
// se o app der problema. Idioma sem playlist → a msg 2 sai sem esse trecho.
const PLAYLIST: Record<string, string> = {
  es: 'https://youtube.com/playlist?list=PLl-uPesvOUpY3Hf09FcVm6yW6269j_81d',
}

const COPY: Record<string, AccessCopy> = {
  es: ({ email, code, link, homeUrl }) =>
    [
      '¡Bienvenida al Desafío de Calistenia RiseMe™️! 🎉',
      '',
      '¡Felicitaciones por esta excelente decisión! Estoy segura de que esta experiencia será transformadora para ti. 😍',
      '',
      'Tu acceso a la aplicación está listo — aquí está tu información 👇',
      '',
      `📧 Correo electrónico: ${email}`,
      `🔑 Contraseña: ${code}`,
      '',
      'Guarda esta contraseña — ingresarás a la aplicación con ella. 🔒',
      '',
      `Toca aquí para entrar ahora: 👉 ${link}`,
      '',
      '(Cuando toques, la aplicación se abrirá automáticamente, ni siquiera necesitas escribir la contraseña — ¡tu desafío ya está listo!) 💪',
      '',
      '📌 ¿Cómo ingresar otro día?',
      `👉 Ve a ${homeUrl}, inicia sesión con tu correo electrónico y la contraseña anterior.`,
      'Si lo deseas, puedes cambiar tu contraseña por una que elijas dentro de la aplicación.',
      '¿Olvidaste tu contraseña? Usa el enlace "¿Olvidaste tu contraseña?" en la pantalla de inicio de sesión.',
      '',
      '📱 Opcional: descarga la aplicación en tu teléfono',
      'RiseMe™️ funciona como una verdadera aplicación en tu teléfono 👇',
      '',
      `📲 iPhone: abre ${homeUrl} en SAFARI → botón compartir → "Añadir a la pantalla de inicio" → "Añadir"`,
      '⚠️ La opción correcta es "Añadir a la pantalla de inicio" (NO "Añadir a favoritos")',
      '',
      `📲 Android: abre ${homeUrl} en CHROME → menú de tres puntos → "Instalar aplicación" → "Instalar"`,
      '',
      '✅ El icono de RiseMe aparecerá en tu pantalla de inicio. ¿No lo ves? Desliza hacia las últimas pantallas de tu teléfono — a veces queda al final. 😉',
      '',
      '¡De esta manera tendrás acceso a tu desafío con un solo toque! 🚀',
      '(Si no puedes hacerlo, no hay problema: la aplicación funciona perfectamente desde el navegador también.)',
      '',
      'Si necesitas ayuda, no dudes en escribirme. Estoy aquí para que tengas la mejor experiencia. 😄 ❤️',
    ].join('\n'),
  tr: ({ email, code, link, homeUrl }) =>
    [
      'RiseMe™️ Kalistenik Meydan Okumasına hoş geldin! 🎉',
      '',
      'Bu harika karar için tebrikler! Bu deneyimin senin için dönüştürücü olacağından eminim. 😍',
      '',
      'Uygulamaya erişimin hazır — bilgilerin burada 👇',
      '',
      `📧 E-posta: ${email}`,
      `🔑 Şifre: ${code}`,
      '',
      'Bu şifreyi sakla — uygulamaya onunla gireceksin. 🔒',
      '',
      `Hemen girmek için buraya dokun: 👉 ${link}`,
      '',
      '(Dokunduğunda uygulama kendiliğinden açılır, şifreyi yazmana bile gerek yok — meydan okuman hazır!) 💪',
      '',
      '📌 Başka bir gün nasıl girersin?',
      `👉 ${homeUrl} adresine git, e-postan ve yukarıdaki şifreyle giriş yap.`,
      'İstersen uygulamanın içinden şifreni kendi seçtiğin bir şifreyle değiştirebilirsin.',
      'Şifreni mi unuttun? Giriş ekranındaki "Şifreni mi unuttun?" bağlantısını kullan.',
      '',
      '📱 İsteğe bağlı: uygulamayı telefonuna indir',
      'RiseMe™️ telefonunda gerçek bir uygulama gibi çalışır 👇',
      '',
      `📲 iPhone: ${homeUrl} adresini SAFARI'de aç → paylaş düğmesi → "Ana Ekrana Ekle" → "Ekle"`,
      '⚠️ Doğru seçenek "Ana Ekrana Ekle" (Favorilere Ekle DEĞİL)',
      '',
      `📲 Android: ${homeUrl} adresini CHROME'da aç → üç nokta menüsü → "Uygulamayı yükle" → "Yükle"`,
      '',
      '✅ RiseMe simgesi ana ekranında görünecek. Göremiyor musun? Telefonunun son ekranlarına kaydır — bazen en sonda kalır. 😉',
      '',
      'Böylece meydan okumana tek dokunuşla ulaşırsın! 🚀',
      '(Yapamazsan sorun değil: uygulama tarayıcıdan da sorunsuz çalışır.)',
      '',
      'Yardıma ihtiyacın olursa bana yazmaktan çekinme. En iyi deneyimi yaşaman için buradayım. 😄 ❤️',
    ].join('\n'),
  'pt-BR': ({ email, code, link, homeUrl }) =>
    [
      'Bem-vinda ao Desafio de Calistenia RiseMe™️! 🎉',
      '',
      'Parabéns por essa excelente decisão! Tenho certeza de que essa experiência vai ser transformadora pra você. 😍',
      '',
      'Seu acesso ao aplicativo está pronto — aqui estão suas informações 👇',
      '',
      `📧 Email: ${email}`,
      `🔑 Senha: ${code}`,
      '',
      'Guarde esta senha — é com ela que você entra no aplicativo. 🔒',
      '',
      `Toque aqui para entrar agora: 👉 ${link}`,
      '',
      '(Ao tocar, o aplicativo abre sozinho, nem precisa digitar a senha — seu desafio já está pronto!) 💪',
      '',
      '📌 Como entrar em outro dia?',
      `👉 Vá em ${homeUrl}, entre com seu email e a senha acima.`,
      'Se quiser, você pode trocar a senha por uma de sua escolha dentro do aplicativo.',
      'Esqueceu a senha? Use o link "Esqueceu sua senha?" na tela de login.',
      '',
      '📱 Opcional: baixe o aplicativo no seu celular',
      'O RiseMe™️ funciona como um aplicativo de verdade no seu celular 👇',
      '',
      `📲 iPhone: abra ${homeUrl} no SAFARI → botão compartilhar → "Adicionar à Tela de Início" → "Adicionar"`,
      '⚠️ A opção certa é "Adicionar à Tela de Início" (NÃO "Adicionar aos Favoritos")',
      '',
      `📲 Android: abra ${homeUrl} no CHROME → menu de três pontinhos → "Instalar app" → "Instalar"`,
      '',
      '✅ O ícone do RiseMe vai aparecer na sua tela inicial. Não está vendo? Deslize até as últimas telas do celular — às vezes ele fica no final. 😉',
      '',
      'Assim você acessa seu desafio com um toque só! 🚀',
      '(Se não conseguir, sem problema: o aplicativo funciona perfeitamente pelo navegador também.)',
      '',
      'Se precisar de ajuda, é só me escrever. Estou aqui pra você ter a melhor experiência. 😄 ❤️',
    ].join('\n'),
  en: ({ email, code, link, homeUrl }) =>
    [
      'Welcome to the RiseMe™️ Calisthenics Challenge! 🎉',
      '',
      'Congratulations on this great decision! I am sure this experience will be transformative for you. 😍',
      '',
      'Your access to the app is ready — here is your information 👇',
      '',
      `📧 Email: ${email}`,
      `🔑 Password: ${code}`,
      '',
      'Keep this password — it is how you log in to the app. 🔒',
      '',
      `Tap here to enter now: 👉 ${link}`,
      '',
      '(When you tap, the app opens automatically, you do not even need to type the password — your challenge is ready!) 💪',
      '',
      '📌 How to log in another day?',
      `👉 Go to ${homeUrl}, log in with your email and the password above.`,
      'If you like, you can change it to a password of your choice inside the app.',
      'Forgot your password? Use the "Forgot your password?" link on the login screen.',
      '',
      '📱 Optional: get the app on your phone',
      'RiseMe™️ works like a real app on your phone 👇',
      '',
      `📲 iPhone: open ${homeUrl} in SAFARI → share button → "Add to Home Screen" → "Add"`,
      '⚠️ The right option is "Add to Home Screen" (NOT "Add to Favorites")',
      '',
      `📲 Android: open ${homeUrl} in CHROME → three-dot menu → "Install app" → "Install"`,
      '',
      '✅ The RiseMe icon will appear on your home screen. Can not see it? Swipe to the last screens of your phone — sometimes it ends up there. 😉',
      '',
      'This way your challenge is one tap away! 🚀',
      '(If you can not do it, no problem: the app works perfectly in the browser too.)',
      '',
      'If you need help, just write to me. I am here so you have the best experience. 😄 ❤️',
    ].join('\n'),
}

const SUPPORT: Record<string, SupportCopy> = {
  es: ({ playlist }) =>
    [
      '💛 Un último mensaje importante:',
      '',
      'Si completaste todos los pasos y aún tienes dificultades para acceder a la aplicación, escríbeme — nuestro equipo de soporte te ayudará a resolverlo. 😉',
      ...(playlist
        ? [
            '',
            'Mientras tanto, para que no te pierdas ni un solo día del desafío, puedes ver las lecciones desde esta lista especial de reproducción de YouTube:',
            '',
            `👉 ${playlist}`,
            '',
            '🙏 Este enlace es exclusivamente tuyo y solo es para nuestras estudiantes.',
          ]
        : []),
      '',
      '¡Nos vemos en el desafío! 💪',
    ].join('\n'),
  tr: ({ playlist }) =>
    [
      '💛 Son bir önemli mesaj:',
      '',
      'Tüm adımları tamamladın ve uygulamaya girmekte hâlâ zorlanıyorsan bana yaz — destek ekibimiz çözmene yardım edecek. 😉',
      ...(playlist
        ? [
            '',
            'Bu arada meydan okumanın tek bir gününü bile kaçırmaman için dersleri bu özel YouTube oynatma listesinden izleyebilirsin:',
            '',
            `👉 ${playlist}`,
            '',
            '🙏 Bu bağlantı sadece sana ve öğrencilerimize özeldir.',
          ]
        : []),
      '',
      'Meydan okumada görüşürüz! 💪',
    ].join('\n'),
  'pt-BR': ({ playlist }) =>
    [
      '💛 Uma última mensagem importante:',
      '',
      'Se você fez todos os passos e ainda está com dificuldade para entrar no aplicativo, me escreve — nossa equipe de suporte vai te ajudar a resolver. 😉',
      ...(playlist
        ? [
            '',
            'Enquanto isso, para você não perder nenhum dia do desafio, dá pra assistir às aulas nesta playlist especial do YouTube:',
            '',
            `👉 ${playlist}`,
            '',
            '🙏 Este link é exclusivo seu e só para as nossas alunas.',
          ]
        : []),
      '',
      'Nos vemos no desafio! 💪',
    ].join('\n'),
  en: ({ playlist }) =>
    [
      '💛 One last important message:',
      '',
      'If you followed all the steps and still have trouble getting into the app, write to me — our support team will help you sort it out. 😉',
      ...(playlist
        ? [
            '',
            'Meanwhile, so you do not miss a single day of the challenge, you can watch the lessons in this special YouTube playlist:',
            '',
            `👉 ${playlist}`,
            '',
            '🙏 This link is exclusively yours and only for our students.',
          ]
        : []),
      '',
      'See you in the challenge! 💪',
    ].join('\n'),
}

export async function sendWhatsAppAccess(params: {
  productCode: string
  transactionId: string
  name?: string
  email: string
  phone?: string
  code: string
  link: string
  locale: string
}): Promise<void> {
  if (process.env.WHATSAPP_PROVIDER !== 'zapi') {
    await sendVoxuyAccess(params)
    return
  }

  const phone = params.phone
  if (!isZapiConfigured() || !phone) {
    console.warn(
      `[whatsapp] pulando Z-API — ${!phone ? 'sem telefone' : 'env ausente'} (venda ${params.transactionId}). Backup: email`
    )
    return
  }

  // NÃO envia na hora: a compradora está na VSL do upsell logo após pagar, e a
  // notificação do WhatsApp tira ela da página de venda. Enfileira com atraso; o cron
  // /api/whatsapp/outbox envia. O email (contingência) continua saindo na hora.
  const [acesso, apoio] = mensagensDeAcesso(params)
  const sendAt = new Date(Date.now() + ATRASO_ACESSO_MIN * 60_000)
  const idAcesso = await enfileirar({ phone, kind: 'acesso', body: acesso, mask: params.code, sendAfter: sendAt })
  if (!idAcesso) return
  await enfileirar({
    phone,
    kind: 'apoio',
    body: apoio,
    sendAfter: new Date(sendAt.getTime() + ESPERA_MSG2_MS),
    dependsOn: idAcesso,
  })
}

/** As 2 mensagens da sequência, prontas — exportado também pra pré-visualizar/testar o texto. */
export function mensagensDeAcesso(p: { locale: string; email: string; code: string; link: string }): [string, string] {
  const copy = COPY[p.locale] ?? COPY.es
  const support = SUPPORT[p.locale] ?? SUPPORT.es
  // Raiz do app no idioma dela (mesmo prefixo do link de acesso: /tr, /pl…; es sem prefixo).
  const homeUrl = p.link.split('/entrar')[0]
  return [
    copy({ email: p.email, code: p.code, link: p.link, homeUrl }),
    support({ playlist: PLAYLIST[p.locale] }),
  ]
}
