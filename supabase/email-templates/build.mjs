// Gera os 4 templates de email do Supabase Auth (invite, recovery, confirmation,
// email-change) a partir de UM esqueleto + a tabela de textos abaixo.
//
// Cada template sai com TODOS os idiomas dentro, mas a usuária só vê o dela: o
// Supabase preenche {{ .Data }} com o user_metadata da conta, e o webhook da compra
// grava ali o `locale` da oferta (ex.: CL-PL → 'pl'). Conta sem locale, ou com um
// idioma sem bloco aqui, recebe o espanhol.
//
// Idioma novo = adicionar uma chave em TEXT e rodar `node supabase/email-templates/build.mjs`.
// Depois colar cada .html gerado no painel: Supabase → Authentication → Email Templates.
// (O painel NÃO lê estes arquivos — o deploy do app não atualiza os emails.)

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_LOCALE = 'es'

// Partes iguais em todos os tipos de email
const COMMON = {
  es: {
    fallback: 'Si el botón no funciona, copia y pega este enlace en tu navegador:',
    signoff: 'Con cariño,<br />El equipo RiseMe',
  },
  tr: {
    fallback: 'Buton çalışmıyorsa, bu bağlantıyı kopyalayıp tarayıcına yapıştır:',
    signoff: 'Sevgiyle,<br />RiseMe Ekibi',
  },
  pl: {
    fallback: 'Jeśli przycisk nie działa, skopiuj ten link i wklej go w przeglądarce:',
    signoff: 'Serdecznie,<br />Zespół RiseMe',
  },
  cs: {
    fallback: 'Pokud tlačítko nefunguje, zkopíruj tento odkaz a vlož ho do prohlížeče:',
    signoff: 'S láskou,<br />Tým RiseMe',
  },
  it: {
    fallback: "Se il pulsante non funziona, copia questo link e incollalo nel browser:",
    signoff: 'Con affetto,<br />Il team RiseMe',
  },
}

const NEW_EMAIL = '<strong style="color:#171717;">{{ .NewEmail }}</strong>'

// type = valor do ?type= que o /auth/confirm espera
const TEXT = {
  invite: {
    type: 'invite',
    es: {
      title: 'Bienvenida a RiseMe',
      h1: '¡Bienvenida a RiseMe!',
      body: 'Tu compra fue confirmada y tu cuenta ya está lista. Solo falta un paso: definir tu contraseña para entrar al app.',
      button: 'Definir mi contraseña',
      note: '¿Tienes dudas? Responde este correo y te ayudamos.',
    },
    tr: {
      title: "RiseMe'ye hoş geldin",
      h1: "RiseMe'ye hoş geldin!",
      body: 'Satın alman onaylandı ve hesabın hazır. Tek bir adım kaldı: uygulamaya girmek için şifreni belirle.',
      button: 'Şifremi belirle',
      note: 'Soruların mı var? Bu e-postayı yanıtla, sana yardımcı olalım.',
    },
    pl: {
      title: 'Witaj w RiseMe',
      h1: 'Witaj w RiseMe!',
      body: 'Twój zakup został potwierdzony, a konto jest już gotowe. Został tylko jeden krok: ustaw hasło, aby wejść do aplikacji.',
      button: 'Ustaw moje hasło',
      note: 'Masz pytania? Odpowiedz na tę wiadomość, a chętnie pomożemy.',
    },
    cs: {
      title: 'Vítej v RiseMe',
      h1: 'Vítej v RiseMe!',
      body: 'Tvůj nákup byl potvrzen a účet je připravený. Zbývá jen jeden krok: nastav si heslo, abys mohla vstoupit do aplikace.',
      button: 'Nastavit heslo',
      note: 'Máš otázky? Odpověz na tento e-mail a rády ti pomůžeme.',
    },
    it: {
      title: 'Benvenuta in RiseMe',
      h1: 'Benvenuta in RiseMe!',
      body: "Il tuo acquisto è stato confermato e il tuo account è pronto. Manca solo un passaggio: imposta la tua password per entrare nell'app.",
      button: 'Imposta la mia password',
      note: 'Hai dubbi? Rispondi a questa e-mail e ti aiutiamo.',
    },
  },
  recovery: {
    type: 'recovery',
    es: {
      title: 'Recupera tu contraseña',
      h1: 'Recupera tu contraseña',
      body: 'Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón de abajo para crear una nueva.',
      button: 'Restablecer contraseña',
      note: 'Si no fuiste tú quien solicitó este cambio, puedes ignorar este correo. Tu contraseña actual seguirá funcionando.',
    },
    tr: {
      title: 'Şifreni sıfırla',
      h1: 'Şifreni sıfırla',
      body: 'Şifreni sıfırlamak için bir talep aldık. Yeni bir şifre oluşturmak için aşağıdaki butona tıkla.',
      button: 'Şifremi sıfırla',
      note: 'Bu talebi sen yapmadıysan bu e-postayı görmezden gelebilirsin. Mevcut şifren çalışmaya devam edecek.',
    },
    pl: {
      title: 'Zresetuj hasło',
      h1: 'Zresetuj hasło',
      body: 'Otrzymałyśmy prośbę o zresetowanie Twojego hasła. Kliknij przycisk poniżej, aby utworzyć nowe.',
      button: 'Zresetuj hasło',
      note: 'Jeśli to nie Ty wysłałaś tę prośbę, możesz zignorować tę wiadomość. Twoje obecne hasło nadal będzie działać.',
    },
    cs: {
      title: 'Obnov si heslo',
      h1: 'Obnov si heslo',
      body: 'Dostaly jsme žádost o obnovení tvého hesla. Klikni na tlačítko níže a vytvoř si nové.',
      button: 'Obnovit heslo',
      note: 'Pokud jsi o změnu nežádala ty, tento e-mail můžeš ignorovat. Tvoje současné heslo bude dál fungovat.',
    },
    it: {
      title: 'Reimposta la tua password',
      h1: 'Reimposta la tua password',
      body: 'Abbiamo ricevuto una richiesta per reimpostare la tua password. Clicca sul pulsante qui sotto per crearne una nuova.',
      button: 'Reimposta la password',
      note: 'Se non sei stata tu a fare questa richiesta, puoi ignorare questa e-mail. La tua password attuale continuerà a funzionare.',
    },
  },
  confirmation: {
    type: 'signup',
    es: {
      title: 'Confirma tu cuenta',
      h1: 'Confirma tu cuenta',
      body: '¡Bienvenida a RiseMe! Confirma tu correo haciendo clic en el botón de abajo y empieza tu primer reto.',
      button: 'Confirmar mi cuenta',
      note: 'Si no creaste esta cuenta, puedes ignorar este correo.',
    },
    tr: {
      title: 'Hesabını onayla',
      h1: 'Hesabını onayla',
      body: "RiseMe'ye hoş geldin! Aşağıdaki butona tıklayarak e-postanı onayla ve ilk meydan okumana başla.",
      button: 'Hesabımı onayla',
      note: 'Bu hesabı sen oluşturmadıysan bu e-postayı görmezden gelebilirsin.',
    },
    pl: {
      title: 'Potwierdź swoje konto',
      h1: 'Potwierdź swoje konto',
      body: 'Witaj w RiseMe! Potwierdź swój adres e-mail, klikając przycisk poniżej, i zacznij swoje pierwsze wyzwanie.',
      button: 'Potwierdź moje konto',
      note: 'Jeśli nie zakładałaś tego konta, możesz zignorować tę wiadomość.',
    },
    cs: {
      title: 'Potvrď svůj účet',
      h1: 'Potvrď svůj účet',
      body: 'Vítej v RiseMe! Potvrď svou e-mailovou adresu kliknutím na tlačítko níže a pusť se do své první výzvy.',
      button: 'Potvrdit účet',
      note: 'Pokud sis tento účet nezakládala, tento e-mail můžeš ignorovat.',
    },
    it: {
      title: 'Conferma il tuo account',
      h1: 'Conferma il tuo account',
      body: 'Benvenuta in RiseMe! Conferma la tua e-mail cliccando sul pulsante qui sotto e inizia la tua prima sfida.',
      button: 'Conferma il mio account',
      note: 'Se non hai creato tu questo account, puoi ignorare questa e-mail.',
    },
  },
  'email-change': {
    type: 'email_change',
    es: {
      title: 'Confirma tu nuevo correo',
      h1: 'Confirma tu nuevo correo',
      body: `Solicitaste cambiar el correo de tu cuenta a ${NEW_EMAIL}. Confirma este cambio haciendo clic en el botón de abajo.`,
      button: 'Confirmar nuevo correo',
      note: 'Si no fuiste tú quien solicitó este cambio, ignora este correo y considera cambiar tu contraseña.',
    },
    tr: {
      title: 'Yeni e-postanı onayla',
      h1: 'Yeni e-postanı onayla',
      body: `Hesabının e-postasını ${NEW_EMAIL} olarak değiştirmek istedin. Aşağıdaki butona tıklayarak bu değişikliği onayla.`,
      button: 'Yeni e-postayı onayla',
      note: 'Bu değişikliği sen istemediysen bu e-postayı görmezden gel ve şifreni değiştirmeyi düşün.',
    },
    pl: {
      title: 'Potwierdź nowy adres e-mail',
      h1: 'Potwierdź nowy adres e-mail',
      body: `Poprosiłaś o zmianę adresu e-mail konta na ${NEW_EMAIL}. Potwierdź tę zmianę, klikając przycisk poniżej.`,
      button: 'Potwierdź nowy e-mail',
      note: 'Jeśli to nie Ty prosiłaś o tę zmianę, zignoruj tę wiadomość i rozważ zmianę hasła.',
    },
    cs: {
      title: 'Potvrď novou e-mailovou adresu',
      h1: 'Potvrď novou e-mailovou adresu',
      body: `Požádala jsi o změnu e-mailu svého účtu na ${NEW_EMAIL}. Potvrď tuto změnu kliknutím na tlačítko níže.`,
      button: 'Potvrdit nový e-mail',
      note: 'Pokud jsi o tuto změnu nežádala ty, tento e-mail ignoruj a zvaž změnu hesla.',
    },
    it: {
      title: 'Conferma il tuo nuovo indirizzo e-mail',
      subject: 'Conferma la nuova email', // assunto curto: o Supabase recusa assunto > 255 caracteres (25/10/2026)
      h1: 'Conferma il tuo nuovo indirizzo e-mail',
      body: `Hai chiesto di cambiare l'e-mail del tuo account in ${NEW_EMAIL}. Conferma la modifica cliccando sul pulsante qui sotto.`,
      button: 'Conferma il nuovo indirizzo',
      note: 'Se non sei stata tu a chiedere questa modifica, ignora questa e-mail e valuta di cambiare la password.',
    },
  },
}

function block(t, c, link) {
  return `            <tr>
              <td style="padding:8px 40px 8px 40px;">
                <h1 style="margin:0; font-size:28px; line-height:1.2; font-weight:800; color:#171717;">${t.h1}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 40px 8px 40px;">
                <p style="margin:0; font-size:16px; line-height:1.6; color:#262626;">
                  ${t.body}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 8px 40px;">
                <a href="${link}" style="display:inline-block; background-color:#171717; color:#FFFFFF; text-decoration:none; font-weight:700; font-size:16px; padding:16px 32px; border-radius:999px;">
                  ${t.button}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 40px 24px 40px;">
                <p style="margin:0; font-size:13px; line-height:1.6; color:#7A7361;">
                  ${c.fallback}
                </p>
                <p style="margin:8px 0 0 0; font-size:12px; line-height:1.5; color:#171717; word-break:break-all;">
                  <a href="${link}" style="color:#171717; text-decoration:underline;">${link}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 40px 40px 40px; border-top:1px solid #E8E2D5;">
                <p style="margin:0; font-size:13px; line-height:1.6; color:#7A7361;">
                  ${t.note}
                </p>
                <p style="margin:16px 0 0 0; font-size:13px; line-height:1.6; color:#7A7361;">
                  ${c.signoff}
                </p>
              </td>
            </tr>`
}

// Encadeia {{ if eq $l "tr" }}…{{ else if eq $l "pl" }}…{{ else }}<default>{{ end }}.
// $l vem de `or .Data.locale "es"`: conta sem locale não quebra a comparação.
function byLocale(render) {
  const others = Object.keys(COMMON).filter((l) => l !== DEFAULT_LOCALE)
  let out = ''
  others.forEach((l, i) => {
    out += `{{ ${i === 0 ? 'if' : 'else if'} eq $l "${l}" }}\n${render(l)}\n`
  })
  return `${out}{{ else }}\n${render(DEFAULT_LOCALE)}\n{{ end }}`
}

function renderTemplate(spec) {
  const link = `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=${spec.type}`
  const titles = byLocale((l) => `    <title>${spec[l].title}</title>`)
  const body = byLocale((l) => block(spec[l], COMMON[l], link))
  return `{{ $l := or .Data.locale "${DEFAULT_LOCALE}" }}<!DOCTYPE html>
<!-- GERADO por build.mjs — edite os textos lá, não aqui. -->
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${titles}
  </head>
  <body style="margin:0; padding:0; background-color:#F5F0E8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; color:#262626;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F0E8; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; width:100%; background-color:#FAF7F2; border-radius:20px; overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 16px 40px;">
                <p style="margin:0; font-size:14px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#7A7361;">RiseMe</p>
              </td>
            </tr>
${body}
          </table>
          <p style="margin:24px 0 0 0; font-size:12px; color:#A39A88;">
            RiseMe · riseme.app
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`
}

// Emoji no fim do assunto — existia só no painel do Supabase (achado ao colar o tcheco, 17/10/2026).
// Fica aqui para quem colar de novo não apagar sem perceber.
const EMOJI_ASSUNTO = { invite: ' 💛', recovery: ' 🙌', confirmation: ' 🖤', 'email-change': ' ✨' }

const dir = dirname(fileURLToPath(import.meta.url))
for (const [name, spec] of Object.entries(TEXT)) {
  for (const l of Object.keys(COMMON)) {
    if (!spec[l]) throw new Error(`${name}: falta o texto em '${l}'`)
  }
  writeFileSync(join(dir, `${name}.html`), renderTemplate(spec))
  // O assunto é um campo à parte no painel ("Subject heading") — mesma lógica, numa linha
  // Limite do Supabase: assunto <= 255 caracteres (o "it" estourou o email-change em 25/10/2026) → `subject` curto
  // por idioma quando precisar, e as tags sem espaço interno ({{if …}} vale igual a {{ if … }}).
  const subject = byLocale((l) => spec[l].subject ?? spec[l].title).replace(/\n/g, '').replace(/\{\{ /g, '{{').replace(/ \}\}/g, '}}')
  const assunto = `{{$l := or .Data.locale "${DEFAULT_LOCALE}"}}${subject}${EMOJI_ASSUNTO[name] ?? ''}`
  if ([...assunto].length > 255) throw new Error(`${name}: assunto com ${[...assunto].length} caracteres (> 255 do Supabase)`)
  console.log(`ok ${name}.html\n   assunto: ${assunto}`)
}
