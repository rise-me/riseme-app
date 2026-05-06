'use client'

import { useTranslations } from 'next-intl'
import { ArrowLeft, Copy, Check } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'

const REFERRAL_LINK = 'https://riseme.app/convite/BRUNO2025'

export default function ReferralPage() {
  const t = useTranslations('referral')
  const params = useParams()
  const locale = params.locale as string
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(REFERRAL_LINK)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsApp() {
    const text = encodeURIComponent(t('whatsappMessage', { link: REFERRAL_LINK }))
    window.open(`https://wa.me/?text=${text}`, '_blank')
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

      <div className="bg-foreground text-background rounded-2xl p-6 text-center space-y-2">
        <div className="text-4xl mb-3">🎁</div>
        <h2 className="text-xl font-black">{t('earn7Days')}</h2>
        <p className="text-sm text-background/70 leading-relaxed">
          {t('earnDescription')}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest px-1">
          {t('yourLink')}
        </p>
        <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
          <p className="flex-1 text-sm font-medium text-muted-foreground truncate">
            {REFERRAL_LINK}
          </p>
          <button
            onClick={handleCopy}
            className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0"
          >
            {copied
              ? <Check size={16} className="text-green-600" />
              : <Copy size={16} className="text-foreground" />}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleCopy}
          className="w-full py-4 bg-foreground text-background rounded-2xl text-sm font-bold tracking-wide"
        >
          {copied ? t('linkCopied') : t('copyLink')}
        </button>
        <button
          onClick={handleWhatsApp}
          className="w-full py-4 bg-[#25D366] text-white rounded-2xl text-sm font-bold tracking-wide"
        >
          {t('shareWhatsApp')}
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest px-1">
          {t('howItWorks')}
        </p>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {[
            { step: '1', text: t('step1') },
            { step: '2', text: t('step2') },
            { step: '3', text: t('step3') },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-4 px-4 py-4">
              <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-black flex-shrink-0">
                {item.step}
              </div>
              <p className="text-sm">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
