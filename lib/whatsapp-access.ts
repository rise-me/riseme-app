// Entrega do acesso por WhatsApp na compra — escolhe o canal pela env
// WHATSAPP_PROVIDER:
//   "zapi"  → envia direto pela Z-API, com o texto abaixo (no idioma da oferta)
//   vazio / "voxuy" → fluxo antigo: Voxuy dispara a mensagem montada lá (lib/voxuy.ts)
// A chave existe pra voltar à Voxuy em minutos se o número tiver problema na Z-API
// (trocar a env + redeploy), sem mexer em código. Best-effort como antes: a criação
// da conta NUNCA depende disso — o email (lib/email.ts) sai sempre, em paralelo.

import { sendVoxuyAccess } from '@/lib/voxuy'
import { isZapiConfigured, sendZapiText } from '@/lib/zapi'

type AccessCopy = (p: { firstName: string; email: string; code: string; link: string }) => string

// MESMO conteúdo do email de acesso (lib/email.ts), em formato de conversa.
// O convite pra responder no fim abre a conversa (e é por onde o agente vai entrar).
const COPY: Record<string, AccessCopy> = {
  es: ({ firstName, email, code, link }) =>
    [
      `¡Hola${firstName ? `, ${firstName}` : ''}! 💛 Bienvenida a RiseMe.`,
      '',
      'Tu cuenta ya está lista. Este es tu acceso:',
      `📧 Email: ${email}`,
      `🔑 Contraseña: *${code}*`,
      '',
      `Entra con un toque aquí 👉 ${link}`,
      '',
      'Guarda este mensaje — es tu acceso de siempre. Si tienes cualquier duda, respóndeme aquí mismo.',
    ].join('\n'),
  tr: ({ firstName, email, code, link }) =>
    [
      `Merhaba${firstName ? ` ${firstName}` : ''}! 💛 RiseMe'ye hoş geldin.`,
      '',
      'Hesabın hazır. İşte erişim bilgilerin:',
      `📧 E-posta: ${email}`,
      `🔑 Şifre: *${code}*`,
      '',
      `Tek dokunuşla buradan gir 👉 ${link}`,
      '',
      'Bu mesajı sakla — her zaman bu bilgilerle girersin. Herhangi bir sorun olursa buradan bana yaz.',
    ].join('\n'),
  'pt-BR': ({ firstName, email, code, link }) =>
    [
      `Oi${firstName ? `, ${firstName}` : ''}! 💛 Bem-vinda ao RiseMe.`,
      '',
      'Sua conta já está pronta. Este é o seu acesso:',
      `📧 Email: ${email}`,
      `🔑 Senha: *${code}*`,
      '',
      `Entre com um toque aqui 👉 ${link}`,
      '',
      'Guarde esta mensagem — é o seu acesso de sempre. Qualquer dúvida, é só me responder aqui.',
    ].join('\n'),
  en: ({ firstName, email, code, link }) =>
    [
      `Hi${firstName ? ` ${firstName}` : ''}! 💛 Welcome to RiseMe.`,
      '',
      'Your account is ready. Here is your access:',
      `📧 Email: ${email}`,
      `🔑 Password: *${code}*`,
      '',
      `Enter with one tap here 👉 ${link}`,
      '',
      'Keep this message — it is your access for good. Any question, just reply here.',
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

  if (!isZapiConfigured() || !params.phone) {
    console.warn(
      `[whatsapp] pulando Z-API — ${!params.phone ? 'sem telefone' : 'env ausente'} (venda ${params.transactionId}). Backup: email`
    )
    return
  }

  const copy = COPY[params.locale] ?? COPY.es
  const firstName = params.name?.trim().split(/\s+/)[0] ?? ''
  const result = await sendZapiText({
    phone: params.phone,
    message: copy({ firstName, email: params.email, code: params.code, link: params.link }),
    delayTyping: 3,
  })
  if (!result.ok) {
    console.error(`[whatsapp] Z-API falhou (venda ${params.transactionId}):`, result.error)
  }
}
