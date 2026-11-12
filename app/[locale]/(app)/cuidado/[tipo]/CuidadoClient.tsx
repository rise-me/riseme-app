'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, CheckCircle2, Play, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AulaNaTela, TipoCuidado } from '@/lib/cuidado'

interface Props {
  tipo: TipoCuidado
  aulas: (AulaNaTela & { feita: boolean })[]
  locale: string
}

// Telas para quem tem pouca familiaridade com app (Bruno 11/11): uma ideia por bloco, frase curta, sem palavra técnica.
export function CuidadoClient({ tipo, aulas, locale }: Props) {
  const router = useRouter()
  const t = useTranslations('cuidado')
  const feitas = aulas.filter((a) => a.feita).length

  return (
    <div className="flex flex-col min-h-screen">
      <div className="relative bg-foreground text-background pt-14 pb-6 px-4">
        <button
          onClick={() => router.back()}
          aria-label={t('back')}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-background/10 flex items-center justify-center"
        >
          <ArrowLeft size={18} className="text-background" />
        </button>

        <div className="text-6xl mb-4">🎁</div>
        <p className="text-background/60 text-xs font-bold uppercase tracking-wide">{t('tabName')}</p>
        <h1 className="text-2xl font-black leading-tight mb-2">{t(`${tipo}.name`)}</h1>
        <p className="text-background/80 text-sm leading-relaxed">{t(`${tipo}.topLine`)}</p>

        {feitas > 0 && (
          <p className="mt-4 text-xs font-semibold text-background/70">{t('doneCount', { done: feitas, total: aulas.length })}</p>
        )}
      </div>

      <div className="flex-1 px-4 pt-4 pb-6 space-y-2">
        {aulas.map((a) => (
          <button
            key={a.codigo}
            onClick={() => router.push(`/${locale}/cuidado/${tipo}/player/${a.n}`)}
            className="w-full flex items-start gap-3 bg-card border border-border rounded-2xl p-3.5 text-left transition-all active:scale-[0.98]"
          >
            <div className={cn('w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0', a.feita ? 'bg-foreground' : 'bg-secondary')}>
              {a.feita ? <CheckCircle2 size={22} className="text-background" /> : <Play size={18} className="text-foreground" />}
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <p className="font-bold text-sm leading-tight">{a.titulo}</p>
              {a.minutos && (
                <div className="flex items-center gap-1">
                  <Clock size={11} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{a.minutos} min</span>
                </div>
              )}
              {a.lugar && <p className="text-xs text-foreground/80">{t(`place.${a.lugar}`)}</p>}
              {a.equipo.map((e) => (
                <p key={e} className="text-xs text-muted-foreground leading-snug">{t(`equipment.${e}`)}</p>
              ))}
              {a.rodillasEnElSuelo && <p className="text-xs text-muted-foreground leading-snug">{t('towelTip')}</p>}
            </div>

            <span className="text-xs text-muted-foreground font-semibold flex-shrink-0 pt-0.5">{t('lessonLabel', { n: a.n })}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
