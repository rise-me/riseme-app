'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { KeyRound, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Aparece só na 1ª entrada (flag onboarded no metadata). Fecha o ciclo mental:
// a aluna entende que TEM uma senha (está no WhatsApp) e decide manter ou trocar.
export function FirstAccessNotice({ locale }: { locale: string }) {
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

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={dismiss} />
      <div className="relative w-full max-w-sm bg-background rounded-t-3xl sm:rounded-3xl p-6 space-y-4 m-0 sm:m-4">
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-secondary flex items-center justify-center"
          aria-label="Fechar"
        >
          <X size={14} className="text-muted-foreground" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center">
          <KeyRound size={22} className="text-foreground" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold leading-tight">{t('title')}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t('body')}</p>
        </div>

        <div className="space-y-2 pt-1">
          <a
            href={`/${locale}/more/profile`}
            className="block w-full py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold text-center"
          >
            {t('changeCta')}
          </a>
          <button
            onClick={dismiss}
            className="w-full py-2.5 text-muted-foreground text-sm font-medium"
          >
            {t('keepCta')}
          </button>
        </div>
      </div>
    </div>
  )
}
