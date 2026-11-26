'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Play, CheckCircle2 } from 'lucide-react'
import { track } from '@/lib/posthog/track'

export interface ClaseDeHoyProps {
  // primera = nunca concluiu aula · hoy = tem aula para hoje · hecha = já treinou hoje
  estado: 'primera' | 'hoy' | 'hecha'
  href: string
  challengeId: string
  desafio: string
  emoji: string
  dia: number
  titulo: string
  minutos?: number
}

// Primeira coisa da tela inicial: UM botão grande que abre a próxima aula (lib/proxima-aula.ts).
// Para quem tem pouca familiaridade com app: diz o que é, quanto dura e o que fazer. Nada de menu.
export function ClaseDeHoy({ estado, href, challengeId, desafio, emoji, dia, titulo, minutos }: ClaseDeHoyProps) {
  const t = useTranslations('claseHoy')
  const clicou = () => track('clase_hoy_click', { estado, challenge_id: challengeId, day_number: dia })
  const meta = minutos ? t('meta', { challenge: desafio, min: minutos }) : desafio

  if (estado === 'hecha') {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={22} className="text-green-600 flex-shrink-0" />
          <p className="text-lg font-black leading-tight">{t('doneLabel')}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-semibold">{t('doneNext')}</p>
          <p className="font-bold text-sm leading-snug">{t('dayTitle', { day: dia, title: titulo })}</p>
        </div>
        <Link
          href={href}
          onClick={clicou}
          className="block w-full py-3 rounded-2xl border border-border text-center text-sm font-bold"
        >
          {t('doneCta')}
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-foreground text-background rounded-3xl p-5 space-y-4">
      <p className="text-xs font-bold uppercase tracking-widest text-background/60">
        {t(estado === 'primera' ? 'firstLabel' : 'todayLabel')}
      </p>
      <div className="flex items-start gap-3">
        <span className="text-4xl leading-none flex-shrink-0">{emoji}</span>
        <div className="min-w-0">
          <p className="text-xl font-black leading-tight">{t('dayTitle', { day: dia, title: titulo })}</p>
          <p className="text-sm text-background/70 mt-1">{meta}</p>
        </div>
      </div>
      <Link
        href={href}
        onClick={clicou}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl bg-background text-foreground text-base font-black tracking-wide active:scale-[0.98] transition-transform"
      >
        <Play size={18} fill="currentColor" />
        {t(estado === 'primera' ? 'firstCta' : 'todayCta')}
      </Link>
      {estado === 'primera' && <p className="text-sm text-background/70 text-center leading-snug">{t('firstHint')}</p>}
    </div>
  )
}
