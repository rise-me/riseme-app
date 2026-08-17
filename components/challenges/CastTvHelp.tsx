'use client'

// "Ver na TV": o RiseMe é PWA, sem cast nativo (sem Chromecast/AirPlay SDK).
// A saída que funciona em qualquer TV é o ESPELHAMENTO do próprio celular.
// Este card detecta o aparelho e mostra só o caminho dele (3 passos), com
// toggle manual caso a detecção erre (ex.: iPad novo se apresenta como Mac).
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Wifi, Airplay, Cast, MonitorSmartphone, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'

type Device = 'ios' | 'android'

function detectDevice(): Device {
  if (typeof navigator === 'undefined') return 'ios'
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  // iPadOS 13+ diz que é Mac, mas tem toque
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios'
  return 'ios'
}

interface Props {
  open: boolean
  onClose: () => void
}

export function CastTvHelp({ open, onClose }: Props) {
  const t = useTranslations('castTv')
  const [device, setDevice] = useState<Device>('ios')

  useEffect(() => {
    if (open) setDevice(detectDevice())
  }, [open])

  const steps = [
    { icon: Wifi, text: t('step1') },
    { icon: device === 'ios' ? Airplay : Cast, text: t(`${device}.step2`) },
    { icon: MonitorSmartphone, text: t('step3') },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm rounded-3xl p-6 gap-0">
        <div className="text-4xl mb-3 text-center">📺</div>
        <h3 className="text-lg font-bold text-center mb-1">{t('title')}</h3>
        <p className="text-sm text-muted-foreground text-center leading-relaxed mb-4">
          {t('subtitle')}
        </p>

        <div className="flex bg-secondary rounded-xl p-1 mb-4">
          {(['ios', 'android'] as Device[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDevice(d)}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors',
                device === d ? 'bg-foreground text-background' : 'text-muted-foreground'
              )}
            >
              {t(`${d}.label`)}
            </button>
          ))}
        </div>

        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <s.icon size={18} className="text-foreground" />
              </div>
              <div className="min-w-0 pt-0.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                  {t('stepLabel', { n: i + 1 })}
                </p>
                <p className="text-sm leading-snug">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex items-center gap-2 bg-foreground text-background rounded-xl px-3 py-2.5">
          <Play size={16} className="flex-shrink-0" />
          <p className="text-sm font-semibold">{t('then')}</p>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground text-center leading-relaxed">
          {t('note')}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-3 bg-foreground text-background rounded-2xl text-sm font-bold"
        >
          {t('gotIt')}
        </button>
      </DialogContent>
    </Dialog>
  )
}
