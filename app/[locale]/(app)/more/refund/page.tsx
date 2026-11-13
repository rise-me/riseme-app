import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/current-user-server'
import { vendasStripeDaConta } from '@/lib/stripe-api'
import { linkWhatsAppSuporte } from '@/lib/suporte'
import { PedirReembolso, type TextosBotao } from './PedirReembolso'

// Más → Reembolso (só aparece no menu para quem comprou pela Stripe). Regras em lib/stripe-vendas.ts.

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
  },
}

const valorBonito = (centavos: number | null, moeda: string | null) =>
  centavos == null ? '' : `${(centavos / 100).toFixed(2).replace('.', ',')} ${(moeda ?? '').toLowerCase() === 'pln' ? 'zł' : (moeda ?? '').toUpperCase()}`

export default async function RefundInAppPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const t = TEXTO[locale] ?? TEXTO.en
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

      <p className="text-[15px] leading-relaxed text-muted-foreground">{t.intro}</p>

      {vendas.length === 0 ? (
        <div className="space-y-3">
          <p className="text-[15px] leading-relaxed">{t.semCompra}</p>
          <a href={linkWhatsAppSuporte(t.msgWhats)} target="_blank" rel="noopener noreferrer" className="block w-full rounded-2xl bg-foreground py-4 text-center text-[15px] font-semibold text-background">
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
              ) : (
                <PedirReembolso sessionId={v.sessionId} locale={locale} valor={valor} t={t} />
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
