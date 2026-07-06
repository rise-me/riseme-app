'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Aparece só na 1ª entrada (flag onboarded no metadata). Fecha o ciclo mental:
// a aluna entende que TEM uma senha (está no WhatsApp) e decide manter ou trocar.
// Card centralizado (não bottom-sheet) pra não colidir com a BottomNav.
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
            href={`/${locale}/more/profile`}
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
