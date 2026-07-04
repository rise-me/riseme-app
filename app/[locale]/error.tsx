'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  useEffect(() => {
    console.error('[app] unhandled error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-6 bg-background">
      <h1 className="text-4xl font-black tracking-tighter inline-flex items-baseline">
        Rise<span className="text-lg font-bold ml-0.5" style={{ verticalAlign: '-0.1em' }}>Me</span>
      </h1>
      <div className="space-y-1">
        <p className="text-lg font-bold">{t('errorTitle')}</p>
        <p className="text-sm text-muted-foreground">{t('errorDesc')}</p>
      </div>
      <button
        onClick={reset}
        className="px-6 py-3 bg-foreground text-background rounded-2xl text-sm font-bold"
      >
        {t('retry')}
      </button>
    </div>
  )
}
