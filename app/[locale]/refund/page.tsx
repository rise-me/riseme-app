import type { Metadata } from 'next'
import { linkWhatsAppSuporte } from '@/lib/suporte'

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
      'BLIK: the money goes back to the bank account you paid from, usually within a few hours to a few days, depending on your bank.',
      'Card: the money goes back to your card, usually within 5–10 business days, depending on your bank.',
    ],
    extratoTitulo: 'How the purchase shows on your statement',
    extrato: 'On your bank statement the purchase shows as RISEME.',
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
        </section>

        <Bloco titulo={t.depoisTitulo} itens={t.depois} />
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
