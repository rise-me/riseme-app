// CONTINGÊNCIA de acesso por email — MESMO conteúdo do WhatsApp (Voxuy): email +
// código/senha + link de um toque. Disparado junto no webhook pra ninguém ficar
// sem acesso se o WhatsApp não chegar (número errado/truncado, sem WhatsApp, Voxuy
// fora). O email NÃO depende de telefone — é a rede de segurança da entrega.
//
// Envio pela API REST do Resend (sem dependência nova; só fetch). Best-effort:
// se faltar RESEND_API_KEY, apenas loga e segue — a criação da conta NUNCA
// depende disso. Domínio riseme.app já verificado no Resend (mesmo do SMTP).

interface Copy {
  subject: string
  preview: string
  greeting: string
  intro: string
  emailLabel: string
  passwordLabel: string
  keepNote: string
  cta: string
  changeNote: string
  footer: string
}

const COPY: Record<string, Copy> = {
  es: {
    subject: '¡Estás dentro! Tu acceso a RiseMe 💛',
    preview: 'Tu email y tu contraseña de acceso están aquí.',
    greeting: '¡Bienvenida a RiseMe! 💛',
    intro: 'Tu cuenta ya está lista. Este es tu acceso:',
    emailLabel: 'Email',
    passwordLabel: 'Contraseña',
    keepNote: 'Guarda esta contraseña — es con la que entras siempre.',
    cta: 'Entrar ahora',
    changeNote: 'Después, si quieres, puedes cambiarla por una contraseña tuya dentro de la app.',
    footer: 'Si no reconoces esta compra, ignora este mensaje.',
  },
  tr: {
    subject: 'İçerdesin! RiseMe erişimin 💛',
    preview: 'E-postan ve erişim şifren burada.',
    greeting: "RiseMe'ye hoş geldin! 💛",
    intro: 'Hesabın hazır. İşte erişim bilgilerin:',
    emailLabel: 'E-posta',
    passwordLabel: 'Şifre',
    keepNote: 'Bu şifreyi sakla — her zaman onunla girersin.',
    cta: 'Şimdi gir',
    changeNote: 'İstersen sonra uygulama içinden kendi şifrenle değiştirebilirsin.',
    footer: 'Bu satın alımı sen yapmadıysan bu mesajı yok say.',
  },
  'pt-BR': {
    subject: 'Você está dentro! Seu acesso ao RiseMe 💛',
    preview: 'Seu email e sua senha de acesso estão aqui.',
    greeting: 'Bem-vinda ao RiseMe! 💛',
    intro: 'Sua conta já está pronta. Este é o seu acesso:',
    emailLabel: 'Email',
    passwordLabel: 'Senha',
    keepNote: 'Guarde esta senha — é com ela que você entra sempre.',
    cta: 'Entrar agora',
    changeNote: 'Depois, se quiser, dá pra trocar por uma senha sua dentro do app.',
    footer: 'Se você não reconhece esta compra, ignore este e-mail.',
  },
  en: {
    subject: "You're in! Your RiseMe access 💛",
    preview: 'Your email and access password are here.',
    greeting: 'Welcome to RiseMe! 💛',
    intro: 'Your account is ready. Here is your access:',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    keepNote: 'Keep this password — it is how you always log in.',
    cta: 'Enter now',
    changeNote: 'Later, if you want, you can change it to your own password inside the app.',
    footer: "If you don't recognize this purchase, ignore this email.",
  },
}

function renderHtml(c: Copy, params: { email: string; code: string; link: string }): string {
  const { email, code, link } = params
  return `<!doctype html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${c.preview}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
        <tr><td style="background:#1a1a1a;padding:28px 32px;">
          <div style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">RiseMe</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;line-height:1.25;">${c.greeting}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.5;color:#555;">${c.intro}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;border-radius:16px;padding:4px;">
            <tr><td style="padding:16px 18px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#999;font-weight:700;">${c.emailLabel}</div>
              <div style="font-size:16px;font-weight:600;margin-top:2px;word-break:break-all;">${email}</div>
            </td></tr>
            <tr><td style="padding:0 18px 16px;">
              <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#999;font-weight:700;">${c.passwordLabel}</div>
              <div style="font-size:22px;font-weight:800;margin-top:2px;letter-spacing:2px;font-family:'SF Mono',Menlo,Consolas,monospace;">${code}</div>
            </td></tr>
          </table>

          <p style="margin:16px 0 24px;font-size:13px;line-height:1.5;color:#777;">${c.keepNote}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center">
              <a href="${link}" style="display:block;background:#1a1a1a;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px;border-radius:16px;text-align:center;">${c.cta}</a>
            </td></tr>
          </table>

          <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#999;">${c.changeNote}</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #eee;">
          <p style="margin:0;font-size:12px;line-height:1.5;color:#bbb;">${c.footer}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function renderText(c: Copy, params: { email: string; code: string; link: string }): string {
  return [
    c.greeting,
    '',
    c.intro,
    `${c.emailLabel}: ${params.email}`,
    `${c.passwordLabel}: ${params.code}`,
    '',
    c.keepNote,
    '',
    `${c.cta}: ${params.link}`,
    '',
    c.changeNote,
  ].join('\n')
}

export async function sendAccessEmail(params: {
  email: string
  code: string
  link: string
  locale?: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] pulando email de acesso — RESEND_API_KEY ausente. Backup: WhatsApp/Voxuy')
    return
  }
  const from = process.env.RESEND_FROM ?? 'RiseMe <acesso@riseme.app>'
  const c = COPY[params.locale ?? 'es'] ?? COPY.es

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [params.email],
        subject: c.subject,
        html: renderHtml(c, params),
        text: renderText(c, params),
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[email] envio falhou:', res.status, body.slice(0, 200))
    }
  } catch (err) {
    console.error('[email] erro no envio:', err)
  }
}
