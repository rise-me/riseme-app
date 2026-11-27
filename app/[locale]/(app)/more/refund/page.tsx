import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/current-user-server'
import { vendasStripeDaConta } from '@/lib/stripe-api'
import { linkWhatsAppSuporte, linkEmailSuporte, emailSuporte, WHATSAPP_FORA_DO_AR } from '@/lib/suporte'
import { PedirReembolso, type TextosBotao } from './PedirReembolso'

// Más → Reembolso (só aparece no menu para quem comprou pela Stripe). Regras em lib/stripe-vendas.ts.
// 17/11/2026 (Bruno, teste CL-PL): o botão deixa de devolver direto e abre uma CONVERSA com o suporte (WhatsApp + e-mail,
// os dois visíveis; só e-mail com WHATSAPP_FORA_DO_AR), já com o código da compra; o suporte devolve no 2º pedido, sem
// discutir. Reembolso direto estava em 3,6% e metade saía em ~1 h, por susto. TRAVA: 1ª disputa/chargeback → voltar
// REEMBOLSO_DIRETO para true no mesmo dia.
const REEMBOLSO_DIRETO = false

type Texto = TextosBotao & {
  titulo: string
  intro: string
  compra: string
  status: Record<string, string>
  semCompra: string
  whats: string
  msgWhats: string
  saibaMais: string
  /** Nome do que foi comprado (quando há mais de uma compra, ela escolhe qual devolver). Chave = id do desafio/produto. */
  produto: Record<string, string>
  /** Modo conversa (REEMBOLSO_DIRETO=false). {produto} {kod} {email} */
  conversa: { intro: string; texto: string; msg: string; whats: string; email: string }
  /** WhatsApp fora do ar (lib/suporte.ts): estes textos entram no lugar dos que falam de WhatsApp. {email} = e-mail do suporte. */
  semWhats: { pedido: string; erro: string; semCompra: string; whats: string; msgWhats: string }
}

const TEXTO: Record<string, Texto> = {
  pl: {
    titulo: 'Zwrot pieniędzy',
    intro: 'Jeśli chcesz odzyskać pieniądze, wystarczy jedno kliknięcie. Bez zbędnych pytań.',
    compra: 'Zakup z {data}',
    pedir: 'Poproś o zwrot',
    confirmar: 'Na pewno? Zlecimy zwrot {valor} od razu.',
    confirmarSim: 'Tak, zwróć mi pieniądze',
    cancelar: 'Anuluj',
    pedido: 'Gotowe. Zwrot jest w trakcie realizacji. Gdy zostanie zrealizowany, wyślemy Ci potwierdzenie na WhatsAppie.',
    erro: 'Coś poszło nie tak. Spróbuj jeszcze raz albo napisz do nas na WhatsAppie — zajmiemy się tym od razu.',
    status: {
      pending: 'Zwrot w trakcie realizacji',
      requires_action: 'Zwrot w trakcie realizacji',
      succeeded: 'Zwrot zrealizowany',
      failed: 'Zwrot w trakcie wyjaśniania — skontaktujemy się z Tobą',
      canceled: 'Zwrot w trakcie wyjaśniania — skontaktujemy się z Tobą',
    },
    semCompra: 'Nie widzimy tu Twojego zakupu. Napisz do nas na WhatsAppie, że chcesz zwrot, a zajmiemy się tym od razu.',
    whats: 'Napisz na WhatsAppie',
    msgWhats: 'Cześć! Chcę zwrot pieniędzy.',
    saibaMais: 'Jak działa zwrot',
    produto: { 'protocolo-metabolico': 'Protokół Metaboliczny 28 Dni', padrao: 'Wyzwanie Kalisteniki' },
    conversa: {
      intro: 'Chcesz odzyskać pieniądze? Napisz do nas, a zajmiemy się tym od razu. Bez zbędnych pytań.',
      texto: 'Wiadomość ma już kod Twojego zakupu, wystarczy ją wysłać.',
      msg: 'Cześć! Chcę zwrot pieniędzy za: {produto}. Kod zakupu: {kod}',
      whats: 'Napisz na WhatsAppie',
      email: 'Napisz e-mailem ({email})',
    },
    semWhats: {
      pedido: 'Gotowe. Zwrot jest w trakcie realizacji. Gdy zostanie zrealizowany, wyślemy Ci potwierdzenie e-mailem.',
      erro: 'Coś poszło nie tak. Spróbuj jeszcze raz albo napisz do nas na {email} — zajmiemy się tym od razu.',
      semCompra: 'Nie widzimy tu Twojego zakupu. Nasz WhatsApp chwilowo nie działa, więc napisz do nas na {email}, że chcesz zwrot, a zajmiemy się tym od razu.',
      whats: 'Napisz e-mailem',
      msgWhats: 'Chcę zwrot pieniędzy',
    },
  },
  nl: {
    titulo: 'Terugbetaling',
    intro: 'Wil je je geld terug? Dat kan met één tik. Zonder lastige vragen.',
    compra: 'Aankoop van {data}',
    pedir: 'Terugbetaling aanvragen',
    confirmar: 'Weet je het zeker? We zetten de terugbetaling van {valor} meteen in gang.',
    confirmarSim: 'Ja, geef mijn geld terug',
    cancelar: 'Annuleren',
    pedido: 'Klaar. Je terugbetaling wordt verwerkt. Zodra die is afgerond, sturen we je een bevestiging via WhatsApp.',
    erro: 'Er ging iets mis. Probeer het nog eens of stuur ons een WhatsApp-bericht — dan regelen we het meteen.',
    status: {
      pending: 'Terugbetaling wordt verwerkt',
      requires_action: 'Terugbetaling wordt verwerkt',
      succeeded: 'Terugbetaling afgerond',
      failed: 'We zoeken je terugbetaling uit — we nemen contact met je op',
      canceled: 'We zoeken je terugbetaling uit — we nemen contact met je op',
    },
    semCompra: 'We zien je aankoop hier niet. Stuur ons een WhatsApp-bericht dat je je geld terug wilt, dan regelen we het meteen.',
    whats: 'Stuur een WhatsApp-bericht',
    msgWhats: 'Hoi! Ik wil graag mijn geld terug.',
    saibaMais: 'Zo werkt terugbetalen',
    produto: { 'protocolo-metabolico': '28-dagen Metabool Protocol', padrao: 'Calisthenics Challenge' },
    conversa: {
      intro: 'Wil je je geld terug? Stuur ons een bericht, dan regelen we het meteen. Zonder lastige vragen.',
      texto: 'De aankoopcode staat al in het bericht, je hoeft het alleen te versturen.',
      msg: 'Hoi! Ik wil graag mijn geld terug voor: {produto}. Aankoopcode: {kod}',
      whats: 'Stuur een WhatsApp-bericht',
      email: 'Stuur een e-mail ({email})',
    },
    semWhats: {
      pedido: 'Klaar. Je terugbetaling wordt verwerkt. Zodra die is afgerond, sturen we je een bevestiging per e-mail.',
      erro: 'Er ging iets mis. Probeer het nog eens of mail ons op {email} — dan regelen we het meteen.',
      semCompra: 'We zien je aankoop hier niet. Onze WhatsApp is tijdelijk niet bereikbaar, dus mail ons op {email} dat je je geld terug wilt, dan regelen we het meteen.',
      whats: 'Stuur een e-mail',
      msgWhats: 'Ik wil graag mijn geld terug',
    },
  },
  hi: {
    titulo: 'रिफ़ंड',
    intro: 'पैसे वापस चाहिए? बस एक टैप। कोई फ़ालतू सवाल नहीं।',
    compra: '{data} की खरीदारी',
    pedir: 'रिफ़ंड माँगें',
    confirmar: 'क्या आप पक्का चाहती हैं? हम {valor} का रिफ़ंड अभी शुरू कर देंगे।',
    confirmarSim: 'हाँ, मेरे पैसे वापस करें',
    cancelar: 'रद्द करें',
    pedido: 'हो गया। आपका रिफ़ंड प्रोसेस हो रहा है। पूरा होते ही हम WhatsApp पर पुष्टि भेज देंगे।',
    erro: 'कुछ गड़बड़ हो गई। फिर से कोशिश करें या हमें WhatsApp पर लिखें, हम तुरंत ठीक कर देंगे।',
    status: {
      pending: 'रिफ़ंड प्रोसेस हो रहा है',
      requires_action: 'रिफ़ंड प्रोसेस हो रहा है',
      succeeded: 'रिफ़ंड पूरा हो गया',
      failed: 'हम आपका रिफ़ंड देख रहे हैं, आपसे संपर्क करेंगे',
      canceled: 'हम आपका रिफ़ंड देख रहे हैं, आपसे संपर्क करेंगे',
    },
    semCompra: 'हमें यहाँ आपकी खरीदारी नहीं दिख रही। हमें WhatsApp पर लिखें कि आपको पैसे वापस चाहिए, हम तुरंत कर देंगे।',
    whats: 'WhatsApp पर लिखें',
    msgWhats: 'नमस्ते! मुझे रिफ़ंड चाहिए।',
    saibaMais: 'रिफ़ंड कैसे होता है',
    produto: { 'protocolo-metabolico': '28 दिन का मेटाबॉलिक प्रोटोकॉल', padrao: 'कैलिस्थेनिक्स चैलेंज' },
    conversa: {
      intro: 'पैसे वापस चाहिए? हमें मैसेज करें, हम तुरंत कर देंगे। कोई फ़ालतू सवाल नहीं।',
      texto: 'मैसेज में आपकी खरीदारी का कोड पहले से है, बस भेज दें।',
      msg: 'नमस्ते! मुझे इसका रिफ़ंड चाहिए: {produto}। खरीदारी कोड: {kod}',
      whats: 'WhatsApp पर लिखें',
      email: 'ईमेल भेजें ({email})',
    },
    semWhats: {
      pedido: 'हो गया। आपका रिफ़ंड प्रोसेस हो रहा है। पूरा होते ही हम ईमेल पर पुष्टि भेज देंगे।',
      erro: 'कुछ गड़बड़ हो गई। फिर से कोशिश करें या हमें {email} पर ईमेल करें, हम तुरंत ठीक कर देंगे।',
      semCompra: 'हमें यहाँ आपकी खरीदारी नहीं दिख रही। हमारा WhatsApp अभी कुछ समय के लिए बंद है, इसलिए {email} पर ईमेल करें कि आपको पैसे वापस चाहिए, हम तुरंत कर देंगे।',
      whats: 'ईमेल भेजें',
      msgWhats: 'मुझे रिफ़ंड चाहिए',
    },
  },
  en: {
    titulo: 'Refund',
    intro: 'If you want your money back, it takes one tap. No unnecessary questions.',
    compra: 'Purchase on {data}',
    pedir: 'Request a refund',
    confirmar: 'Are you sure? We will start the refund of {valor} right away.',
    confirmarSim: 'Yes, refund my money',
    cancelar: 'Cancel',
    pedido: 'Done. Your refund is being processed. When it is completed, we will send you a confirmation on WhatsApp.',
    erro: 'Something went wrong. Try again or message us on WhatsApp — we will handle it right away.',
    status: {
      pending: 'Refund being processed',
      requires_action: 'Refund being processed',
      succeeded: 'Refund completed',
      failed: 'Refund under review — we will contact you',
      canceled: 'Refund under review — we will contact you',
    },
    semCompra: 'We cannot see your purchase here. Message us on WhatsApp saying you want a refund and we will handle it right away.',
    whats: 'Message us on WhatsApp',
    msgWhats: 'Hi! I would like a refund.',
    saibaMais: 'How refunds work',
    produto: { 'protocolo-metabolico': '28-Day Metabolic Protocol', padrao: 'Calisthenics Challenge' },
    conversa: {
      intro: 'Want your money back? Message us and we will handle it right away. No unnecessary questions.',
      texto: 'The message already has your purchase code, just send it.',
      msg: 'Hi! I would like a refund for: {produto}. Purchase code: {kod}',
      whats: 'Message us on WhatsApp',
      email: 'Send an e-mail ({email})',
    },
    semWhats: {
      pedido: 'Done. Your refund is being processed. When it is completed, we will send you a confirmation by e-mail.',
      erro: 'Something went wrong. Try again or e-mail us at {email} — we will handle it right away.',
      semCompra: 'We cannot see your purchase here. Our WhatsApp is temporarily unavailable, so e-mail us at {email} saying you want a refund and we will handle it right away.',
      whats: 'Send an e-mail',
      msgWhats: 'I would like a refund',
    },
  },
}

const valorBonito = (centavos: number | null, moeda: string | null) =>
  centavos == null ? '' : `${(centavos / 100).toFixed(2).replace('.', ',')} ${(moeda ?? '').toLowerCase() === 'pln' ? 'zł' : (moeda ?? '').toUpperCase()}`

export default async function RefundInAppPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const base = TEXTO[locale] ?? TEXTO.en
  const comEmail = (s: string) => s.replace('{email}', emailSuporte(locale))
  const t: Texto = WHATSAPP_FORA_DO_AR
    ? { ...base, pedido: base.semWhats.pedido, erro: comEmail(base.semWhats.erro), semCompra: comEmail(base.semWhats.semCompra), whats: base.semWhats.whats, msgWhats: base.semWhats.msgWhats }
    : base
  const linkSuporte = WHATSAPP_FORA_DO_AR ? linkEmailSuporte(locale, t.msgWhats) : linkWhatsAppSuporte(t.msgWhats)
  const user = await getCurrentUser()
  const vendas = user ? await vendasStripeDaConta(user.id) : []
  const prefixo = locale === 'es' ? '' : `/${locale}`

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${locale}/more`} className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold">{t.titulo}</h1>
      </div>

      <p className="text-[15px] leading-relaxed text-muted-foreground">{REEMBOLSO_DIRETO ? t.intro : t.conversa.intro}</p>

      {vendas.length === 0 ? (
        <div className="space-y-3">
          <p className="text-[15px] leading-relaxed">{t.semCompra}</p>
          <a href={linkSuporte} target="_blank" rel="noopener noreferrer" className="block w-full rounded-2xl bg-foreground py-4 text-center text-[15px] font-semibold text-background">
            {t.whats}
          </a>
        </div>
      ) : (
        vendas.map((v) => {
          const valor = valorBonito(v.valorCentavos, v.moeda)
          const data = new Date(v.criadaEm).toLocaleDateString(locale)
          return (
            <div key={v.sessionId} className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <p className="text-[15px] font-semibold">{t.produto[v.challengeId] ?? t.produto.padrao}</p>
              <p className="text-sm text-muted-foreground">{t.compra.replace('{data}', data)} · {valor}</p>
              {v.reembolsoStatus ? (
                <p className="text-[15px] font-medium">{t.status[v.reembolsoStatus] ?? t.status.pending}</p>
              ) : REEMBOLSO_DIRETO ? (
                <PedirReembolso sessionId={v.sessionId} locale={locale} valor={valor} t={t} />
              ) : (
                <ConversaReembolso t={t} locale={locale} produto={t.produto[v.challengeId] ?? t.produto.padrao} kod={v.paymentIntent ?? v.sessionId} />
              )}
            </div>
          )
        })
      )}

      <a href={`${prefixo}/refund`} className="block text-center text-sm text-muted-foreground underline underline-offset-4">
        {t.saibaMais}
      </a>
    </div>
  )
}

/** Modo conversa: WhatsApp (principal) e e-mail (alternativa), mensagem pronta com o código da compra. */
function ConversaReembolso({ t, locale, produto, kod }: { t: Texto; locale: string; produto: string; kod: string }) {
  const email = emailSuporte(locale)
  const msg = t.conversa.msg.replace('{produto}', produto).replace('{kod}', kod)
  const mailto = `mailto:${email}?subject=${encodeURIComponent(`${t.titulo} · ${kod}`)}&body=${encodeURIComponent(msg)}`
  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted-foreground">{t.conversa.texto}</p>
      {!WHATSAPP_FORA_DO_AR && (
        <a href={linkWhatsAppSuporte(msg)} target="_blank" rel="noopener noreferrer" className="block w-full rounded-2xl bg-foreground py-4 text-center text-[15px] font-semibold text-background">
          {t.conversa.whats}
        </a>
      )}
      <a href={mailto} className={`block w-full rounded-2xl py-4 text-center text-[15px] font-semibold ${WHATSAPP_FORA_DO_AR ? 'bg-foreground text-background' : 'border border-border active:bg-secondary/50'}`}>
        {t.conversa.email.replace('{email}', email)}
      </a>
    </div>
  )
}
