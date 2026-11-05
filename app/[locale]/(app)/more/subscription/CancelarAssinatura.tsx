'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { cancelarAssinatura } from './actions'

export function CancelarAssinatura({ codigo, locale }: { codigo: string; locale: string }) {
  const t = useTranslations('subscriptionPage')
  const [pendente, iniciar] = useTransition()
  const [confirmando, setConfirmando] = useState(false)
  const [resultado, setResultado] = useState<'ok' | 'erro' | null>(null)

  if (resultado === 'ok') return <p className="text-xs font-semibold pt-2">{t('cancelDone')}</p>

  return (
    <div className="pt-3 space-y-2">
      {resultado === 'erro' && <p className="text-xs text-destructive">{t('cancelError')}</p>}
      {!confirmando ? (
        <button type="button" onClick={() => setConfirmando(true)} className="text-xs font-medium underline text-muted-foreground">
          {t('cancelButton')}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('cancelConfirm')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pendente}
              onClick={() =>
                iniciar(async () => {
                  const r = await cancelarAssinatura(codigo, locale)
                  setResultado(r.ok ? 'ok' : 'erro')
                })
              }
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-foreground text-background disabled:opacity-50"
            >
              {pendente ? t('cancelling') : t('cancelYes')}
            </button>
            <button type="button" disabled={pendente} onClick={() => setConfirmando(false)} className="text-xs font-medium px-3 py-1.5 rounded-full bg-secondary">
              {t('cancelNo')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
