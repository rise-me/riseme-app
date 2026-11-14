'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Aparece só na 1ª entrada (flag onboarded no metadata). Fecha o ciclo mental:
// a aluna entende que TEM uma senha (está no WhatsApp) e decide manter ou trocar.
// Card centralizado (não bottom-sheet) pra não colidir com a BottomNav.
// inline = cartão discreto no meio da página (quando a tela abre com "Tu clase de hoy": a 1ª coisa é a aula, não a senha).
export function FirstAccessNotice({ locale, inline = false }: { locale: string; inline?: boolean }) {
  const t = useTranslations('firstAccess')
  const [open, setOpen] = useState(true)

  async function dismiss() {
    setOpen(false)
    // marca onboarded pra não aparecer de novo (best-effort)
    try {
      const supabase = createClient()
      await supabase.auth.updateUser({ data: { onboarded: true } })
    } catch {}
  }

  if (!open) return null

  if (inline) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
          <KeyRound size={18} className="text-foreground" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm text-muted-foreground leading-relaxed">{t('body')}</p>
          <div className="flex items-center gap-4">
            <a href={`/${locale}/more/profile#contrasena`} className="text-sm font-bold underline underline-offset-2">
              {t('changeCta')}
            </a>
            <button onClick={dismiss} className="text-sm font-semibold text-muted-foreground">
              {t('keepCta')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={dismiss} />

      <div className="relative w-full max-w-sm bg-background rounded-3xl border border-border shadow-2xl p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
          <KeyRound size={24} className="text-foreground" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black leading-tight">{t('title')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t('body')}</p>
        </div>

        <div className="space-y-2 pt-2">
          <a
            href={`/${locale}/more/profile#contrasena`}
            className="block w-full py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold tracking-wide"
          >
            {t('changeCta')}
          </a>
          <button
            onClick={dismiss}
            className="w-full py-2.5 text-muted-foreground text-sm font-semibold"
          >
            {t('keepCta')}
          </button>
        </div>
      </div>
    </div>
  )
}
