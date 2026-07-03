'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/posthog/track'

const GOAL_ML = 2000
const CUP_ML = 250

// data local do aparelho (YYYY-MM-DD) — o dia da usuária, não o do servidor
function localDate(): string {
  return new Intl.DateTimeFormat('en-CA').format(new Date())
}

export function WaterTracker() {
  const t = useTranslations('home')
  const [ml, setMl] = useState<number | null>(null) // null = carregando
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const { data, error } = await supabase
        .from('user_water')
        .select('ml')
        .eq('user_id', user.id)
        .eq('date', localDate())
        .maybeSingle()
      if (cancelled) return
      if (error) {
        console.error('[water] load:', error)
        setMl(0)
        return
      }
      setMl((data as { ml: number } | null)?.ml ?? 0)
    }
    load()
    return () => { cancelled = true }
  }, [])

  function change(delta: number) {
    if (ml === null) return
    const next = Math.max(0, Math.min(GOAL_ML * 3, ml + delta))
    if (next === ml) return
    setMl(next)
    if (delta > 0) track('water_logged', { ml_total: next })

    // agrupa toques rápidos num único save
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { error } = await supabase.from('user_water').upsert(
        { user_id: user.id, date: localDate(), ml: next, updated_at: new Date().toISOString() } as never,
        { onConflict: 'user_id,date' }
      )
      if (error) console.error('[water] save:', error)
    }, 600)
  }

  const current = ml ?? 0
  const pct = Math.min(100, Math.round((current / GOAL_ML) * 100))
  const done = current >= GOAL_ML

  return (
    <div className="bg-card rounded-2xl p-4 border border-border space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl">
          💧
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">{done ? t('waterDone') : t('drinkWater')}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {t('waterProgress', { current: current.toLocaleString(), goal: GOAL_ML.toLocaleString() })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => change(-CUP_ML)}
            disabled={ml === null || current === 0}
            aria-label="-250 ml"
            className={cn(
              'w-9 h-9 rounded-full border border-border flex items-center justify-center',
              (ml === null || current === 0) && 'opacity-30'
            )}
          >
            <Minus size={16} />
          </button>
          <button
            onClick={() => change(CUP_ML)}
            disabled={ml === null}
            aria-label="+250 ml"
            className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center disabled:opacity-50"
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', done ? 'bg-sky-500' : 'bg-foreground')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
