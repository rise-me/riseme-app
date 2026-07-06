'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Download } from 'lucide-react'

export function BonusReader({
  locale,
  title,
  pageUrls,
  downloadUrl,
}: {
  locale: string
  title: string
  pageUrls: string[]
  downloadUrl: string | null
}) {
  const t = useTranslations('bonus')

  return (
    <div className="min-h-screen bg-background">
      {/* Header fixo com voltar + título + baixar */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 h-14 max-w-lg mx-auto">
          <Link
            href={`/${locale}/bonus`}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="flex-1 text-base font-bold truncate">{title}</h1>
          {downloadUrl && (
            <a
              href={downloadUrl}
              className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
              aria-label={t('downloadPdf')}
            >
              <Download size={17} />
            </a>
          )}
        </div>
      </header>

      {/* Páginas: imagens full-width em rolagem vertical */}
      <div className="max-w-lg mx-auto px-3 py-3 space-y-3">
        {pageUrls.map((url, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={i}
            src={url}
            alt={`${title} — ${i + 1}`}
            loading={i < 2 ? 'eager' : 'lazy'}
            className="w-full rounded-xl border border-border bg-card"
          />
        ))}

        {downloadUrl && (
          <a
            href={downloadUrl}
            className="flex items-center justify-center gap-2 w-full py-3.5 mt-2 rounded-2xl border border-border text-sm font-bold"
          >
            <Download size={16} />
            {t('downloadPdf')}
          </a>
        )}
      </div>
    </div>
  )
}
