'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, SkipBack, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MockChallenge } from '@/lib/mock-challenges'
import type { MockDay } from '@/lib/mock-challenge-days'

interface Props {
  challenge: MockChallenge
  days: MockDay[]
  currentDayNumber: number
  locale: string
}

export function VideoPlayer({ challenge, days, currentDayNumber, locale }: Props) {
  const router = useRouter()
  const currentDay = days.find((d) => d.day_number === currentDayNumber)!
  const nextDay = days.find((d) => d.day_number === currentDayNumber + 1)
  const prevDay = days.find((d) => d.day_number === currentDayNumber - 1)

  // Mock timer — will be replaced with real video progress tracking
  const totalSeconds = (currentDay.duration_minutes ?? 15) * 60
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (running && elapsed < totalSeconds) {
      intervalRef.current = setInterval(() => {
        setElapsed((s) => {
          if (s >= totalSeconds - 1) {
            setRunning(false)
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

  function navigate(day: MockDay | undefined) {
    if (!day) return
    router.push(`/${locale}/challenges/${challenge.id}/player/${day.day_number}`)
  }

  // Progress bar: 20 segments
  const SEGMENTS = 20
  const filledSegments = Math.round(progressPct * SEGMENTS)

  const label = elapsed < totalSeconds * 0.15 ? 'AQUECIMENTO' : elapsed < totalSeconds * 0.85 ? 'TREINO' : 'FINALIZAÇÃO'

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Video area — placeholder (replace with Cloudflare Stream iframe) */}
      <div className="relative flex-1 bg-zinc-900 flex items-center justify-center">
        {/* Mock video background */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950" />

        {/* Close button */}
        <button
          onClick={() => router.back()}
          className="absolute top-12 right-4 z-10 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          <X size={18} className="text-white" />
        </button>

        {/* Overlay: phase label + timer */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white/60 text-xs font-bold tracking-widest mb-1">{label}</p>
          <p className="text-white text-6xl font-black tabular-nums leading-none">
            {formatTime(totalSeconds - elapsed)}
          </p>
        </div>

        {/* Emoji placeholder for video */}
        <span className="text-8xl opacity-20 select-none">{challenge.thumbnail_emoji}</span>
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

        {/* Navigation buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(prevDay)}
            disabled={!prevDay}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border text-sm font-bold transition-opacity',
              prevDay
                ? 'border-white/20 text-white hover:bg-white/10'
                : 'border-white/10 text-white/20 opacity-40'
            )}
          >
            <SkipBack size={16} />
            ANTERIOR
          </button>
          <button
            onClick={() => navigate(nextDay)}
            disabled={!nextDay}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all',
              nextDay
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-white/20 text-white/30'
            )}
          >
            PRÓXIMO
            <SkipForward size={16} />
          </button>
        </div>

        {/* Next up preview */}
        {nextDay && (
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">{challenge.thumbnail_emoji}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white/40 text-[10px] font-semibold">A SEGUIR</p>
              <p className="text-white text-xs font-bold truncate">{nextDay.title}</p>
              <p className="text-white/40 text-[10px]">{nextDay.duration_minutes} min</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
