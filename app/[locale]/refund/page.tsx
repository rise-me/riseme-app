import type { Metadata } from 'next'
import { linkWhatsAppSuporte, linkEmailSuporte, emailSuporte, WHATSAPP_FORA_DO_AR } from '@/lib/suporte'

// Página pública de reembolso (sem login) — vendas pela Stripe, 1º caso CL-PL (Bruno 09/11/2026: zero chargeback;
// "tem que ficar claro para ela como pedir o reembolso caso ela deseje"). Linkada no e-mail de acesso, na página de
// obrigado do funil e pelo bot quando ela pede. Não fala de acesso mantido: isso só vai na confirmação final (regra 09/11).

type Texto = {
  titulo: string
  intro: string
  comoTitulo: string
  comoWhats: string
  botaoWhats: string
  msgWhats: string
  comoApp: string
  botaoApp: string
  depoisTitulo: string
  depois: string[]
  quandoTitulo: string
  quando: string[]
  extratoTitulo: string
  extrato: string
  /** WhatsApp fora do ar (lib/suporte.ts): o caminho principal vira a tela do app (lista cada compra) e o e-mail. */
  semWhats: { aviso: string; comoApp: string; comoEmail: (email: string) => string; botaoEmail: string; assunto: string; confirmacao: string }
}

const TEXTO: Record<string, Texto> = {
  pl: {
    titulo: 'Zwrot pieniędzy',
    intro: 'Jeśli z jakiegokolwiek powodu chcesz odzyskać pieniądze, zrobimy to szybko i bez zbędnych pytań.',
    comoTitulo: 'Jak poprosić o zwrot',
    comoWhats: 'Napisz do nas na WhatsAppie, że chcesz zwrot. To wystarczy.',
    botaoWhats: 'Napisz na WhatsAppie',
    msgWhats: 'Cześć! Chcę zwrot pieniędzy.',
    comoApp: 'Albo w aplikacji: Więcej → Zwrot pieniędzy.',
    botaoApp: 'Otwórz w aplikacji',
    depoisTitulo: 'Co dzieje się potem',
    depois: [
      'Zlecamy zwrot od razu, gdy tylko o niego poprosisz.',
      'Gdy zwrot zostanie zrealizowany, wyślemy Ci potwierdzenie na WhatsAppie.',
      'Nie musisz nic załatwiać w banku — wszystko robimy po naszej stronie.',
    ],
    quandoTitulo: 'Kiedy pieniądze wrócą',
    quando: [
      'BLIK: pieniądze wracają na konto bankowe, z którego płaciłaś. Zwykle trwa to od kilku godzin do kilku dni, zależnie od banku.',
      'Karta: pieniądze wracają na kartę, zwykle w ciągu 5–10 dni roboczych, zależnie od banku.',
    ],
    extratoTitulo: 'Jak zakup wygląda na wyciągu',
    extrato: 'Na wyciągu bankowym zakup widnieje jako RISEME.',
    semWhats: {
      aviso: 'Nasz WhatsApp chwilowo nie działa. Na wszystkie wiadomości odpowiadamy e-mailem.',
      comoApp: 'Najprościej w aplikacji: Więcej → Zwrot pieniędzy. Zobaczysz tam każdy swój zakup osobno i sama wybierzesz, za który chcesz zwrot.',
      comoEmail: (email) => `Albo napisz do nas e-mailem na ${email}, że chcesz zwrot. To wystarczy.`,
      botaoEmail: 'Napisz e-mailem',
      assunto: 'Chcę zwrot pieniędzy',
      confirmacao: 'Gdy zwrot zostanie zrealizowany, wyślemy Ci potwierdzenie e-mailem.',
    },
  },
  // CL-NL (Stripe, 19 €): iDEAL (quando ligado), Bancontact e cartão/Apple Pay/Google Pay.
  nl: {
    titulo: 'Terugbetaling',
    intro: 'Wil je om welke reden dan ook je geld terug? Dan regelen we dat snel en zonder lastige vragen.',
    comoTitulo: 'Zo vraag je je geld terug',
    comoWhats: 'Stuur ons een WhatsApp-bericht dat je je geld terug wilt. Meer hoeft niet.',
    botaoWhats: 'Stuur een WhatsApp-bericht',
    msgWhats: 'Hoi! Ik wil graag mijn geld terug.',
    comoApp: 'Of in de app: Meer → Terugbetaling.',
    botaoApp: 'Openen in de app',
    depoisTitulo: 'Wat er daarna gebeurt',
    depois: [
      'We zetten de terugbetaling meteen in gang zodra je erom vraagt.',
      'Zodra de terugbetaling is afgerond, sturen we je een bevestiging via WhatsApp.',
      'Je hoeft niets met je bank te regelen — wij doen alles aan onze kant.',
    ],
    quandoTitulo: 'Wanneer je het geld terugkrijgt',
    quando: [
      'iDEAL of Bancontact: het geld gaat terug naar de bankrekening waarmee je hebt betaald. Meestal duurt dat een paar werkdagen, afhankelijk van je bank.',
      'Kaart (ook Apple Pay en Google Pay): het geld gaat terug naar je kaart, meestal binnen 5–10 werkdagen, afhankelijk van je bank.',
    ],
    extratoTitulo: 'Zo staat de aankoop op je afschrift',
    extrato: 'Op je bankafschrift (in België: rekeninguittreksel) staat de betaling als RISEME.',
    semWhats: {
      aviso: 'Onze WhatsApp is tijdelijk niet bereikbaar. We beantwoorden elk bericht per e-mail.',
      comoApp: 'Het makkelijkst gaat het in de app: Meer → Terugbetaling. Daar zie je elke aankoop apart en kies je welke je terug wilt.',
      comoEmail: (email) => `Of mail ons op ${email} dat je je geld terug wilt. Meer hoeft niet.`,
      botaoEmail: 'Stuur een e-mail',
      assunto: 'Ik wil graag mijn geld terug',
      confirmacao: 'Zodra de terugbetaling is afgerond, sturen we je een bevestiging per e-mail.',
    },
  },
  hi: {
    titulo: 'रिफ़ंड',
    intro: 'अगर किसी भी वजह से आपको पैसे वापस चाहिए, तो हम बिना फ़ालतू सवालों के जल्दी कर देते हैं।',
    comoTitulo: 'रिफ़ंड कैसे माँगें',
    comoWhats: 'हमें WhatsApp पर लिखें कि आपको पैसे वापस चाहिए। बस इतना ही।',
    botaoWhats: 'WhatsApp पर लिखें',
    msgWhats: 'नमस्ते! मुझे रिफ़ंड चाहिए।',
    comoApp: 'या ऐप में: और → रिफ़ंड।',
    botaoApp: 'ऐप में खोलें',
    depoisTitulo: 'उसके बाद क्या होता है',
    depois: [
      'आपके माँगते ही हम रिफ़ंड शुरू कर देते हैं।',
      'रिफ़ंड पूरा होने पर हम WhatsApp पर पुष्टि भेजते हैं।',
      'आपको बैंक से कुछ नहीं करना है, सब हम अपनी तरफ़ से कर देते हैं।',
    ],
    quandoTitulo: 'पैसा कब वापस आता है',
    quando: [
      'UPI: पैसा आपके UPI ऐप से जुड़े बैंक खाते में वापस आता है, आमतौर पर 7 कामकाजी दिनों में, आपके बैंक के हिसाब से।',
      'कार्ड: पैसा आपके कार्ड पर वापस आता है, आमतौर पर 5–10 कामकाजी दिनों में, आपके बैंक के हिसाब से।',
    ],
    extratoTitulo: 'स्टेटमेंट में खरीदारी कैसे दिखती है',
    extrato: 'आपके बैंक स्टेटमेंट में यह पेमेंट RISEME नाम से दिखता है।',
    semWhats: {
      aviso: 'हमारा WhatsApp अभी कुछ समय के लिए बंद है। हम हर मैसेज का जवाब ईमेल पर देते हैं।',
      comoApp: 'सबसे आसान तरीका ऐप में है: और → रिफ़ंड। वहाँ हर खरीदारी अलग दिखती है और आप चुन सकती हैं कि किसका रिफ़ंड चाहिए।',
      comoEmail: (email) => `या ${email} पर ईमेल करें कि आपको पैसे वापस चाहिए। बस इतना ही।`,
      botaoEmail: 'ईमेल भेजें',
      assunto: 'मुझे रिफ़ंड चाहिए',
      confirmacao: 'रिफ़ंड पूरा होने पर हम ईमेल पर पुष्टि भेजते हैं।',
    },
  },
  en: {
    titulo: 'Refunds',
    intro: 'If for any reason you want your money back, we will do it quickly and with no unnecessary questions.',
    comoTitulo: 'How to ask for a refund',
    comoWhats: 'Message us on WhatsApp saying you want a refund. That is all.',
    botaoWhats: 'Message us on WhatsApp',
    msgWhats: 'Hi! I would like a refund.',
    comoApp: 'Or in the app: More → Refund.',
    botaoApp: 'Open in the app',
    depoisTitulo: 'What happens next',
    depois: [
      'We start the refund as soon as you ask.',
      'When the refund is completed, we send you a confirmation on WhatsApp.',
      'You do not need to do anything with your bank — we handle everything on our side.',
    ],
    quandoTitulo: 'When the money comes back',
    quando: [
      'UPI: the money goes back to the bank account linked to your UPI app, usually within 7 business days, depending on your bank.',
      'Card: the money goes back to your card, usually within 5–10 business days, depending on your bank.',
    ],
    extratoTitulo: 'How the purchase shows on your statement',
    extrato: 'On your bank statement the purchase shows as RISEME.',
    semWhats: {
      aviso: 'Our WhatsApp is temporarily unavailable. We answer every message by e-mail.',
      comoApp: 'The easiest way is in the app: More → Refund. You will see each purchase separately and choose which one to refund.',
      comoEmail: (email) => `Or e-mail us at ${email} saying you want a refund. That is all.`,
      botaoEmail: 'Send an e-mail',
      assunto: 'I would like a refund',
      confirmacao: 'When the refund is completed, we send you a confirmation by e-mail.',
    },
  },
}

const textoDe = (locale: string) => TEXTO[locale] ?? TEXTO.en

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return { title: `${textoDe(locale).titulo} · RiseMe`, robots: { index: false } }
}

export default async function RefundPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = textoDe(locale)
  const prefixo = locale === 'es' ? '' : `/${locale}`
  const semWhats = WHATSAPP_FORA_DO_AR

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto max-w-md px-4 pt-12 pb-16 space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-extrabold tracking-tight">RiseMe</p>
          <h1 className="text-2xl font-bold tracking-tight">{t.titulo}</h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">{t.intro}</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.comoTitulo}</h2>
          {semWhats ? (
            <>
              <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-900">{t.semWhats.aviso}</p>
              <p className="text-[15px] leading-relaxed">{t.semWhats.comoApp}</p>
              <a
                href={`${prefixo}/more/refund`}
                className="block w-full rounded-2xl bg-foreground py-4 text-center text-[15px] font-semibold text-background active:opacity-80"
              >
                {t.botaoApp}
              </a>
              <p className="pt-2 text-[15px] leading-relaxed">{t.semWhats.comoEmail(emailSuporte(locale))}</p>
              <a
                href={linkEmailSuporte(locale, t.semWhats.assunto)}
                className="block w-full rounded-2xl border border-border py-4 text-center text-[15px] font-semibold active:bg-secondary/50"
              >
                {t.semWhats.botaoEmail}
              </a>
            </>
          ) : (
            <>
              <p className="text-[15px] leading-relaxed">{t.comoWhats}</p>
              <a
                href={linkWhatsAppSuporte(t.msgWhats)}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-2xl bg-foreground py-4 text-center text-[15px] font-semibold text-background active:opacity-80"
              >
                {t.botaoWhats}
              </a>
              <p className="pt-2 text-[15px] leading-relaxed">{t.comoApp}</p>
              <a
                href={`${prefixo}/more/refund`}
                className="block w-full rounded-2xl border border-border py-4 text-center text-[15px] font-semibold active:bg-secondary/50"
              >
                {t.botaoApp}
              </a>
            </>
          )}
        </section>

        <Bloco titulo={t.depoisTitulo} itens={semWhats ? [t.depois[0], t.semWhats.confirmacao, ...t.depois.slice(2)] : t.depois} />
        <Bloco titulo={t.quandoTitulo} itens={t.quando} />
        <Bloco titulo={t.extratoTitulo} itens={[t.extrato]} />
      </div>
    </main>
  )
}

function Bloco({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{titulo}</h2>
      <ul className="space-y-2 rounded-2xl border border-border bg-card p-4">
        {itens.map((i) => (
          <li key={i} className="text-[15px] leading-relaxed">{i}</li>
        ))}
      </ul>
    </section>
  )
}
