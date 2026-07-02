'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Status = 'loading' | 'error'

type EmailOtpType = 'invite' | 'recovery' | 'signup' | 'email' | 'email_change'

const SUPPORTED_TYPES: ReadonlySet<EmailOtpType> = new Set([
  'invite',
  'recovery',
  'signup',
  'email',
  'email_change',
])

function isSupportedType(value: string | null): value is EmailOtpType {
  return value !== null && SUPPORTED_TYPES.has(value as EmailOtpType)
}

export function ConfirmClient({ locale }: { locale: string }) {
  const t = useTranslations('auth')
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    const supabase = createClient()
    const url = new URL(window.location.href)
    const token_hash = url.searchParams.get('token_hash')
    const typeParam = url.searchParams.get('type')

    if (!token_hash || !isSupportedType(typeParam)) {
      setStatus('error')
      return
    }

    const type = typeParam

    supabase.auth.verifyOtp({ token_hash, type }).then(async ({ error }) => {
      if (error) {
        setStatus('error')
        return
      }

      // O link do email não carrega locale (template é compartilhado), então a URL
      // cai no default (es). O locale real da usuária vem do metadata da conta —
      // gravado pelo webhook na compra (ex: 'tr' pra Perfect Pay Turquia).
      const KNOWN_LOCALES = ['pt-BR', 'es', 'en', 'tr']
      let dest = locale
      const { data: { user } } = await supabase.auth.getUser()
      const metaLocale = user?.user_metadata?.locale as string | undefined
      if (metaLocale && KNOWN_LOCALES.includes(metaLocale)) {
        dest = metaLocale
      }

      let nextPath: string
      switch (type) {
        case 'invite':
        case 'recovery':
          nextPath = `/${dest}/set-password`
          break
        case 'email_change':
          nextPath = `/${dest}/more/profile`
          break
        case 'signup':
        case 'email':
        default:
          nextPath = `/${dest}/home`
      }

      window.location.href = nextPath
    })
  }, [locale])

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground text-center">
          {t('verifyingLink')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-destructive text-center">
        {t('linkExpired')}
      </p>
      <Link
        href={`/${locale}/forgot-password`}
        className="block w-full h-12 rounded-xl font-bold tracking-wide text-sm bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center"
      >
        {t('requestNewLink')}
      </Link>
    </div>
  )
}
