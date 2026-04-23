'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, SkipBack, SkipForward, Sparkles, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MockWorkout, MockWorkoutLesson } from '@/lib/mock-workouts'

type Plan = 'annual' | 'monthly'

const PLANS = {
  annual: {
    key: 'annual' as Plan,
    label: 'Anual',
    price: '$19',
    period: '/ano',
    renewsAt: '$49',
    badge: 'Economize 70%',
  },
  monthly: {
    key: 'monthly' as Plan,
    label: 'Mensal',
    price: '$7',
    period: '/mês',
    renewsAt: '$14,90',
    badge: null,
  },
}

interface Props {
  workout: MockWorkout
  lessons: MockWorkoutLesson[]
  currentLessonNumber: number
  locale: string
}

const SEGMENTS = 20

export function WorkoutPlayer({ workout, lessons, currentLessonNumber, locale }: Props) {
  const router = useRouter()
  const currentLesson = lessons.find((l) => l.lesson_number === currentLessonNumber)!
  const nextLesson = lessons.find((l) => l.lesson_number === currentLessonNumber + 1)
  const prevLesson = lessons.find((l) => l.lesson_number === currentLessonNumber - 1)

  const totalSeconds = (currentLesson.duration_minutes ?? 3) * 60
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const [upsellOpen, setUpsellOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan>('annual')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running && elapsed < totalSeconds) {
      intervalRef.current = setInterval(() => {
        setElapsed((s) => {
          if (s >= totalSeconds - 1) {
            setRunning(false)
            // Show upsell when lesson finishes
            setUpsellOpen(true)
            return totalSeconds
          }
          return s + 1
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, elapsed, totalSeconds])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const progressPct = totalSeconds > 0 ? elapsed / totalSeconds : 0
  const filledSegments = Math.round(progressPct * SEGMENTS)
  const label = elapsed < totalSeconds * 0.15 ? 'AQUECIMENTO' : elapsed < totalSeconds * 0.85 ? 'TREINO' : 'FINALIZAÇÃO'

  function goToLesson(lesson: MockWorkoutLesson | undefined) {
    if (!lesson) return
    router.push(`/${locale}/workouts/${workout.id}/player/${lesson.lesson_number}`)
  }

  function handleNext() {
    if (nextLesson) {
      goToLesson(nextLesson)
    } else {
      // Last lesson — go back to workout detail
      router.push(`/${locale}/workouts/${workout.id}`)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        {/* Video area */}
        <div className="relative flex-1 bg-zinc-900 flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950" />

          {/* Close button */}
          <button
            onClick={() => router.back()}
            className="absolute top-12 right-4 z-10 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X size={18} className="text-white" />
          </button>

          {/* Lesson info */}
          <div className="absolute top-12 left-4 z-10">
            <p className="text-white/50 text-[10px] font-bold tracking-widest">
              AULA {currentLessonNumber} DE {lessons.length}
            </p>
          </div>

          {/* Phase label + timer */}
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white/60 text-xs font-bold tracking-widest mb-1">{label}</p>
            <p className="text-white text-5xl font-black tabular-nums leading-none">
              {formatTime(totalSeconds - elapsed)}
            </p>
            <p className="text-white/70 text-sm font-semibold mt-1">{currentLesson.title}</p>
          </div>

          <span className="text-8xl opacity-20 select-none">{workout.emoji}</span>
        </div>

        {/* Controls panel */}
        <div className="bg-black px-5 pt-4 pb-8 space-y-4">
          {/* Segmented progress bar */}
          <div className="flex gap-0.5">
            {Array.from({ length: SEGMENTS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'flex-1 h-1 rounded-full transition-colors duration-300',
                  i < filledSegments ? 'bg-white' : 'bg-white/20'
                )}
              />
            ))}
          </div>

          {/* Stats row */}
          <div className="flex justify-between text-xs text-white/50 font-semibold">
            <div>
              <p className="text-white text-sm tabular-nums">{formatTime(elapsed)}</p>
              <p>ESGOTADO</p>
            </div>
            <div className="text-right">
              <p className="text-white text-sm">0</p>
              <p>KCAL</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            <button
              onClick={() => goToLesson(prevLesson)}
              disabled={!prevLesson}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border text-sm font-bold',
                prevLesson
                  ? 'border-white/20 text-white'
                  : 'border-white/10 text-white/20 opacity-40'
              )}
            >
              <SkipBack size={16} />
              ANTERIOR
            </button>
            <button
              onClick={() => { setUpsellOpen(true) }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold bg-white text-black"
            >
              PRÓXIMO
              <SkipForward size={16} />
            </button>
          </div>

          {/* Next up preview */}
          {nextLesson && (
            <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                <span className="text-lg">{workout.emoji}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white/40 text-[10px] font-semibold">A SEGUIR</p>
                <p className="text-white text-xs font-bold truncate">{nextLesson.title}</p>
                <p className="text-white/40 text-[10px]">{nextLesson.duration_minutes} min</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subscription upsell popup */}
      {upsellOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => { setUpsellOpen(false); handleNext() }}
          />

          {/* Sheet */}
          <div className="relative w-full max-w-lg bg-background rounded-t-3xl px-6 pt-5 pb-10 space-y-4">
            {/* Handle */}
            <div className="w-10 h-1 bg-border rounded-full mx-auto" />

            {/* Icon + heading */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-foreground flex items-center justify-center flex-shrink-0">
                <Sparkles size={20} className="text-background" />
              </div>
              <div>
                <h3 className="text-lg font-black leading-tight">Gostando desse treino?</h3>
                <p className="text-muted-foreground text-xs mt-0.5">
                  Desbloqueie todos os desafios com uma assinatura
                </p>
              </div>
            </div>

            {/* Plan selector */}
            <div className="space-y-2">
              {Object.values(PLANS).map((plan) => (
                <button
                  key={plan.key}
                  onClick={() => setSelectedPlan(plan.key)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left',
                    selectedPlan === plan.key
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border bg-card'
                  )}
                >
                  {/* Radio */}
                  <div className={cn(
                    'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                    selectedPlan === plan.key ? 'border-foreground' : 'border-border'
                  )}>
                    {selectedPlan === plan.key && (
                      <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
                    )}
                  </div>

                  {/* Plan info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{plan.label}</span>
                      {plan.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Renova por {plan.renewsAt}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <span className="font-bold text-base">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Benefits */}
            <div className="space-y-1.5">
              {[
                '28 dias de treino guiado',
                'Desafios de calistenia, pilates e yoga',
                'Progresso salvo e streak diário',
              ].map((benefit) => (
                <div key={benefit} className="flex items-center gap-2.5">
                  <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" />
                  <span className="text-sm">{benefit}</span>
                </div>
              ))}
            </div>

            {/* CTA buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => {
                  const url = selectedPlan === 'annual'
                    ? process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_ANNUAL
                    : process.env.NEXT_PUBLIC_HOTMART_CHECKOUT_MONTHLY
                  if (url) window.location.href = url
                }}
                className="w-full py-4 bg-foreground text-background rounded-2xl text-sm font-bold tracking-wide"
              >
                Desbloquear meu acesso
              </button>
              <button
                onClick={() => { setUpsellOpen(false); handleNext() }}
                className="w-full py-2.5 text-muted-foreground text-sm font-medium"
              >
                {nextLesson ? 'Continuar treino' : 'Voltar aos treinos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
