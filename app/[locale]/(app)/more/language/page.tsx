'use client'

import { useTranslations } from 'next-intl'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export default function LanguagePage() {
  const t = useTranslations('languagePage')
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string

  const LANGUAGES = [
    { code: 'pt-BR', label: t('ptBRLabel'), region: t('ptBRRegion') },
    { code: 'es', label: t('esLabel'), region: t('esRegion') },
    { code: 'en', label: t('enLabel'), region: t('enRegion') },
    { code: 'tr', label: t('trLabel'), region: t('trRegion') },
  ]

  function selectLanguage(code: string) {
    router.push(`/${code}/more`)
  }

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/more`}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold">{t('title')}</h1>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {LANGUAGES.map((lang) => {
          const isActive = locale === lang.code
          return (
            <button
              key={lang.code}
              onClick={() => selectLanguage(lang.code)}
              className="w-full flex items-center gap-4 px-4 py-4 text-left active:bg-secondary/50 transition-colors"
            >
              <div className="flex-1">
                <p className={cn('text-sm font-semibold', isActive && 'text-foreground')}>{lang.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{lang.region}</p>
              </div>
              {isActive && (
                <div className="w-6 h-6 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
                  <Check size={13} className="text-background" />
                </div>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center px-4">
        {t('applyDescription')}
      </p>
    </div>
  )
}
