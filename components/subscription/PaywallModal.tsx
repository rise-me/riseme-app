'use client'

import { CheckCircle2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { track } from '@/lib/posthog/track'
import { createClient } from '@/lib/supabase/client'
import { marcaOfertaMostrada } from '@/lib/pase-oferta'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

// Oferta única: teste grátis do Pase Completo (14/10/2026, decisão do Bruno). Substitui o seletor
// US$ 39/ano × US$ 29/mês, que nunca vendeu (docs/roadmap.md).
// Checkout: Pase Completo K100401831L, oferta v4lltj3v = 7 dias grátis, depois US$ 27/ano (cartão ou PayPal).
// checkoutMode=10 = página personalizada da oferta (banner "HOY PAGAS US$0", 14/10/2026); sem ele a Hotmart mostra o checkout cru.
const TRIAL_CHECKOUT =
  process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_TRIAL ?? 'https://pay.hotmart.com/K100401831L?off=v4lltj3v&checkoutMode=10'

interface PaywallModalProps {
  open: boolean
  onClose: () => void
  challengeTitle?: string
  // Ponto de contato, gravado pela Hotmart no `src` da venda e lido pelo dashboard (pase-app, pase-aula1, ...).
  src?: string
  // Título/subtítulo próprios do ponto de contato (ex.: "¡Día 1 completado!"); sem eles, o título padrão do teste.
  title?: string
  subtitle?: string
  // Os outros desafios, nomeados (16/10/2026): oferta genérica no fim do dia 1 converteu 0 de ~290 alunas
  // em 7 dias; o pedido do Bruno é ser concreta — "você pode desbloquear 4 outros desafios". Com `outros`,
  // a lista deles substitui os benefícios genéricos e o preço vai numa linha discreta sob o botão.
  outros?: { emoji: string; title: string }[]
}

export function PaywallModal({ open, onClose, challengeTitle, src = 'pase-app', title, subtitle, outros }: PaywallModalProps) {
  const t = useTranslations('subscription')
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    marcaOfertaMostrada()
    track('paywall_viewed', { source: 'modal', challenge_title: challengeTitle ?? null, src })
    // Email da conta pré-preenchido no checkout: a Hotmart avisa o app pelo email do comprador; outro email
    // criaria uma conta nova e a aluna não veria o acesso na conta dela.
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
  }, [open, challengeTitle, src])

  const benefits = [
    t('benefit1'),
    t('benefit2'),
    t('benefit3'),
    t('benefit4'),
  ]

  function checkoutUrl() {
    const u = new URL(TRIAL_CHECKOUT)
    u.searchParams.set('src', src)
    if (email) u.searchParams.set('email', email)
    return u.toString()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent showCloseButton={false} className="sm:max-w-sm rounded-3xl p-0 gap-0 border-0 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-7 h-7 rounded-full bg-secondary flex items-center justify-center"
        >
          <X size={14} className="text-muted-foreground" />
        </button>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="pr-8">
            <h2 className="text-xl font-bold leading-tight">{title ?? t('trialTitle')}</h2>
            {(subtitle || challengeTitle) && (
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle ?? t('unlockBlock', { title: challengeTitle! })}
              </p>
            )}
          </div>

          {outros?.length ? (
            <div className="grid grid-cols-2 gap-2">
              {outros.map((o) => (
                <div key={o.title} className="flex items-center gap-2 rounded-2xl bg-secondary px-3 py-2.5">
                  <span className="text-xl">{o.emoji}</span>
                  <span className="text-xs font-semibold leading-tight">{o.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Benefits */}
              <div className="space-y-2">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-2.5">
                    <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
                    <span className="text-sm text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* O que é cobrado, sem letra miúda */}
              <div className="rounded-2xl border-2 border-foreground bg-foreground/5 p-4 space-y-1">
                <p className="font-bold text-base">{t('trialToday')}</p>
                <p className="text-sm">{t('trialAfter')}</p>
                <p className="text-xs text-muted-foreground">{t('trialCancel')}</p>
              </div>
            </>
          )}

          {/* CTA */}
          <button
            onClick={() => {
              track('subscription_clicked', { plan: 'trial_annual', source: 'modal', src })
              window.location.href = checkoutUrl()
            }}
            className="w-full py-4 bg-foreground text-background rounded-2xl text-sm font-bold tracking-wide"
          >
            {t('trialCta')}
          </button>

          {/* Footer */}
          <div className="text-center space-y-0.5">
            {outros?.length ? <p className="text-xs text-muted-foreground">{t('trialSmallPrice')}</p> : null}
            <p className="text-xs text-muted-foreground">{t('trialCardNote')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
