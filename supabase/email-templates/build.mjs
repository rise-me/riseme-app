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
  en: {
    fallback: 'If the button does not work, copy and paste this link into your browser:',
    signoff: 'With love,<br />The RiseMe team',
  },
  it: {
    fallback: "Se il pulsante non funziona, copia questo link e incollalo nel browser:",
    signoff: 'Con affetto,<br />Il team RiseMe',
  },
  hi: {
    fallback: 'अगर बटन काम न करे, तो यह लिंक कॉपी करके अपने ब्राउज़र में खोलें:',
    signoff: 'प्यार के साथ,<br />RiseMe टीम',
  },
  nl: {
    fallback: 'Werkt de knop niet? Kopieer deze link en plak hem in je browser:',
    signoff: 'Liefs,<br />Het RiseMe-team',
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
    en: {
      title: 'Welcome to RiseMe',
      h1: 'Welcome to RiseMe!',
      body: 'Your purchase is confirmed and your account is ready. Just one step left: set your password to get into the app.',
      button: 'Set my password',
      note: 'Any questions? Just reply to this e-mail and we will help.',
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
    hi: {
      title: 'RiseMe में आपका स्वागत है',
      h1: 'RiseMe में आपका स्वागत है!',
      body: 'आपकी खरीदारी कन्फ़र्म हो गई है और आपका अकाउंट तैयार है। बस एक कदम बाकी है: ऐप में आने के लिए अपना पासवर्ड बनाइए।',
      button: 'मेरा पासवर्ड बनाएँ',
      note: 'कोई सवाल है? इसी ईमेल का जवाब दें, हम मदद करेंगे।',
    },
    nl: {
      title: 'Welkom bij RiseMe',
      h1: 'Welkom bij RiseMe!',
      body: 'Je aankoop is bevestigd en je account staat klaar. Nog één stap: stel je wachtwoord in om de app te openen.',
      button: 'Mijn wachtwoord instellen',
      note: 'Heb je vragen? Beantwoord deze e-mail, dan helpen we je.',
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
    en: {
      subject: 'New password', // assunto curto: o completo estoura os 255 do Supabase
      title: 'Reset your password',
      h1: 'Reset your password',
      body: 'We received a request to reset your password. Tap the button below to create a new one.',
      button: 'Reset my password',
      note: 'If you did not ask for this, you can ignore this e-mail. Your current password will keep working.',
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
    hi: {
      title: 'अपना पासवर्ड बदलें',
      h1: 'अपना पासवर्ड बदलें',
      body: 'हमें आपका पासवर्ड बदलने का अनुरोध मिला है। नया पासवर्ड बनाने के लिए नीचे दिए बटन पर टैप करें।',
      button: 'पासवर्ड बदलें',
      note: 'अगर यह अनुरोध आपने नहीं किया, तो इस ईमेल को अनदेखा कर दें। आपका मौजूदा पासवर्ड चलता रहेगा।',
    },
    nl: {
      title: 'Herstel je wachtwoord',
      h1: 'Herstel je wachtwoord',
      body: 'We hebben een verzoek ontvangen om je wachtwoord opnieuw in te stellen. Klik op de knop hieronder om een nieuw wachtwoord te maken.',
      button: 'Wachtwoord opnieuw instellen',
      note: 'Heb jij dit niet aangevraagd? Dan kun je deze e-mail negeren. Je huidige wachtwoord blijft gewoon werken.',
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
    en: {
      subject: 'Confirm', // curto: os 255 do Supabase
      title: 'Confirm your account',
      h1: 'Confirm your account',
      body: 'Welcome to RiseMe! Confirm your e-mail address by tapping the button below and start your first challenge.',
      button: 'Confirm my account',
      note: 'If you did not create this account, you can ignore this e-mail.',
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
    hi: {
      title: 'अपना अकाउंट कन्फ़र्म करें',
      h1: 'अपना अकाउंट कन्फ़र्म करें',
      body: 'RiseMe में आपका स्वागत है! नीचे दिए बटन पर टैप करके अपना ईमेल कन्फ़र्म करें और अपना पहला चैलेंज शुरू करें।',
      button: 'मेरा अकाउंट कन्फ़र्म करें',
      note: 'अगर यह अकाउंट आपने नहीं बनाया, तो इस ईमेल को अनदेखा कर दें।',
    },
    nl: {
      title: 'Bevestig je account',
      h1: 'Bevestig je account',
      body: 'Welkom bij RiseMe! Bevestig je e-mailadres met de knop hieronder en begin aan je eerste challenge.',
      button: 'Mijn account bevestigen',
      note: 'Heb je dit account niet aangemaakt? Dan kun je deze e-mail negeren.',
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
    en: {
      title: 'Confirm your new e-mail',
      h1: 'Confirm your new e-mail address',
      body: `You asked to change your account e-mail to ${NEW_EMAIL}. Confirm this change by tapping the button below.`,
      button: 'Confirm new e-mail',
      note: 'If you did not ask for this change, ignore this e-mail and consider changing your password.',
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
    hi: {
      title: 'अपना नया ईमेल कन्फ़र्म करें',
      h1: 'अपना नया ईमेल कन्फ़र्म करें',
      body: `आपने अपने अकाउंट का ईमेल ${NEW_EMAIL} में बदलने को कहा है। नीचे दिए बटन पर टैप करके यह बदलाव कन्फ़र्म करें।`,
      button: 'नया ईमेल कन्फ़र्म करें',
      note: 'अगर यह बदलाव आपने नहीं माँगा, तो इस ईमेल को अनदेखा करें और अपना पासवर्ड बदलने के बारे में सोचें।',
    },
    nl: {
      title: 'Bevestig je nieuwe e-mailadres',
      h1: 'Bevestig je nieuwe e-mailadres',
      body: `Je hebt gevraagd om het e-mailadres van je account te wijzigen in ${NEW_EMAIL}. Bevestig deze wijziging met de knop hieronder.`,
      button: 'Nieuw e-mailadres bevestigen',
      note: 'Heb jij dit niet aangevraagd? Negeer dan deze e-mail en overweeg je wachtwoord te wijzigen.',
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
// pular = idiomas que caem no padrão (usado no assunto quando o idioma não cabe nos 255 do Supabase).
function byLocale(render, pular = []) {
  const others = Object.keys(COMMON).filter((l) => l !== DEFAULT_LOCALE && !pular.includes(l))
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
// Assunto curto em inglês (com contexto) para os idiomas fora de ASSUNTO_NATIVO (Bruno 27/11).
const ASSUNTO_CURTO = { invite: 'RiseMe: your invitation', recovery: 'RiseMe: your password', confirmation: 'RiseMe: confirm your account', 'email-change': 'RiseMe: your new e-mail' }
const ASSUNTO_NATIVO = ['pl', 'it']
const EMOJI_ASSUNTO = { invite: ' 💛', recovery: ' 🙌', confirmation: ' 🖤', 'email-change': ' ✨' }

const dir = dirname(fileURLToPath(import.meta.url))
// Gera os 4 corpos SEMPRE e lista TODOS os assuntos que estouram no fim (antes parava no 1º): com o nl (6º idioma,
// 11/11/2026) recovery, confirmation e email-change passam de 255 — a saída para isso é decisão do Bruno.
const estouros = []
for (const [name, spec] of Object.entries(TEXT)) {
  for (const l of Object.keys(COMMON)) {
    if (!spec[l]) throw new Error(`${name}: falta o texto em '${l}'`)
  }
  writeFileSync(join(dir, `${name}.html`), renderTemplate(spec))
  // O assunto é um campo à parte no painel ("Subject heading") — mesma lógica, numa linha
  // Limite do Supabase: assunto <= 255 caracteres (o "it" estourou o email-change em 25/10/2026) → `subject` curto
  // por idioma quando precisar, e as tags sem espaço interno ({{if …}} vale igual a {{ if … }}).
  // Assunto (Bruno 27/11): 255 caracteres não cabem 9 idiomas. Os idiomas de ASSUNTO_NATIVO têm assunto próprio; o espanhol
  // é o padrão (else); os demais recebem um assunto curto em inglês COM contexto ("RiseMe: your password"). O corpo segue
  // no idioma de cada uma. Idioma novo NÃO entra no assunto: entra só no corpo (COMMON/TEXT).
  const nativos = [...ASSUNTO_NATIVO, DEFAULT_LOCALE]
  const subject = nativos.map((l, k) => `{{${k ? 'else if' : 'if'} eq $l "${l}"}}${spec[l].subject ?? spec[l].title}`).join('') + `{{else}}${ASSUNTO_CURTO[name]}{{end}}`
  const assunto = `{{$l := or .Data.locale "${DEFAULT_LOCALE}"}}${subject}${EMOJI_ASSUNTO[name] ?? ''}`
  const tamanho = [...assunto].length
  if (tamanho > 255) estouros.push(`${name}: assunto com ${tamanho} caracteres (> 255 do Supabase)`)
  console.log(`${tamanho > 255 ? 'ESTOURA' : 'ok'} ${name}.html (${tamanho}/255)\n   assunto: ${assunto}`)
}
if (estouros.length) {
  console.error(`\n${estouros.length} assunto(s) passam do limite do Supabase — NÃO colar esses assuntos:\n  ${estouros.join('\n  ')}`)
  process.exitCode = 1
}
