import { Flame, Clock, Trophy, Zap, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { getAllProgressForUser } from '@/lib/progress-server'
import { mockChallenges } from '@/lib/mock-challenges'

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MINUTES_PER_DAY_AVG = 20

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysBetween(a: Date, b: Date) {
  return Math.round((startOfLocalDay(a).getTime() - startOfLocalDay(b).getTime()) / 86400000)
}

function computeStreak(completedDates: Date[]): number {
  if (completedDates.length === 0) return 0
  const uniqueDays = Array.from(
    new Set(completedDates.map((d) => startOfLocalDay(d).getTime()))
  )
    .map((t) => new Date(t))
    .sort((a, b) => b.getTime() - a.getTime())

  const today = startOfLocalDay(new Date())
  let streak = 0
  let cursor = today
  const firstDiff = daysBetween(today, uniqueDays[0])
  if (firstDiff > 1) return 0
  if (firstDiff === 1) cursor = new Date(today.getTime() - 86400000)

  for (const day of uniqueDays) {
    if (daysBetween(cursor, day) === 0) {
      streak++
      cursor = new Date(cursor.getTime() - 86400000)
    } else if (daysBetween(cursor, day) < 0) {
      continue
    } else {
      break
    }
  }
  return streak
}

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const progress = await getAllProgressForUser()

  const completedDates = progress.map((p) => new Date(p.completed_at))
  const totalCompleted = progress.length
  const streak = computeStreak(completedDates)

  // week activity (últimos 7 dias, índice 0=Dom até 6=Sáb)
  const today = startOfLocalDay(new Date())
  const todayIndex = today.getDay()
  const thisWeekStart = new Date(today.getTime() - todayIndex * 86400000)
  const weekCompleted = new Set<number>()
  for (const p of progress) {
    const d = startOfLocalDay(new Date(p.completed_at))
    const diff = daysBetween(d, thisWeekStart)
    if (diff >= 0 && diff <= 6) weekCompleted.add(diff)
  }
  type DayStatus = 'done' | 'today-done' | 'today' | 'missed' | 'upcoming'
  const WEEK_STATUS: DayStatus[] = WEEK_DAYS.map((_, i) => {
    const done = weekCompleted.has(i)
    if (i === todayIndex) return done ? 'today-done' : 'today'
    if (i < todayIndex) return done ? 'done' : 'missed'
    return 'upcoming'
  })

  // dias ativos no mês
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthDays = new Set(
    progress
      .filter((p) => new Date(p.completed_at) >= monthStart)
      .map((p) => startOfLocalDay(new Date(p.completed_at)).toISOString())
  )

  // desafio ativo = aquele com progresso mais recente
  const progressByChallenge = new Map<string, number>()
  for (const p of progress) {
    progressByChallenge.set(p.challenge_id, (progressByChallenge.get(p.challenge_id) ?? 0) + 1)
  }
  const activeChallengeId = progress[0]?.challenge_id
  const activeChallenge = activeChallengeId
    ? mockChallenges.find((c) => c.id === activeChallengeId)
    : undefined
  const activeChallengeDone = activeChallengeId
    ? progressByChallenge.get(activeChallengeId) ?? 0
    : 0
  const progressPct = activeChallenge
    ? Math.round((activeChallengeDone / activeChallenge.days_count) * 100)
    : 0

  // desafios concluídos (todos os dias feitos)
  let completedChallenges = 0
  for (const [cid, done] of progressByChallenge) {
    const ch = mockChallenges.find((c) => c.id === cid)
    if (ch && done >= ch.days_count) completedChallenges++
  }

  const STATS = [
    { label: 'Treinos\nesta semana', value: String(weekCompleted.size), icon: <Zap size={16} className="text-yellow-500" /> },
    { label: 'Minutos\ntotais', value: String(totalCompleted * MINUTES_PER_DAY_AVG), icon: <Clock size={16} className="text-blue-500" /> },
    { label: 'Desafios\nconcluídos', value: String(completedChallenges), icon: <Trophy size={16} className="text-amber-500" /> },
    { label: 'Dias ativos\nno mês', value: String(monthDays.size), icon: <Calendar size={16} className="text-green-600" /> },
  ]

  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Progresso</h1>
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
          B
        </div>
      </div>

      {/* Streak */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Flame size={28} className="text-orange-500" />
        </div>
        <div>
          <p className="text-4xl font-black leading-none">{streak}</p>
          <p className="text-sm text-muted-foreground mt-0.5">dias seguidos</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Total</p>
          <p className="text-lg font-black">{totalCompleted}</p>
        </div>
      </div>

      {/* Weekly activity */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Atividade semanal
          </p>
          <p className="text-xs font-bold">
            <span className="text-foreground">{weekCompleted.size}</span>
            <span className="text-muted-foreground">/7 dias</span>
          </p>
        </div>

        <div className="relative">
          {/* linha conectora de fundo */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-secondary" />
          {/* linha conectora preenchida até o último dia concluído */}
          {weekCompleted.size > 0 && (() => {
            const lastDone = Math.max(...Array.from(weekCompleted))
            const total = WEEK_DAYS.length - 1
            const pct = total > 0 ? (lastDone / total) * 100 : 0
            return (
              <div
                className="absolute top-5 left-5 h-0.5 bg-foreground transition-all"
                style={{ width: `calc((100% - 2.5rem) * ${pct / 100})` }}
              />
            )
          })()}

          <div className="relative flex justify-between">
            {WEEK_DAYS.map((day, i) => {
              const status = WEEK_STATUS[i]
              const isDone = status === 'done' || status === 'today-done'
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                    isDone && 'bg-foreground shadow-md',
                    status === 'today' && 'bg-background border-2 border-foreground ring-4 ring-foreground/10',
                    status === 'today-done' && 'ring-4 ring-foreground/20',
                    status === 'missed' && 'bg-background border border-dashed border-border',
                    status === 'upcoming' && 'bg-secondary/60',
                  )}>
                    {isDone && (
                      <span className="text-background text-sm font-black">✓</span>
                    )}
                    {status === 'today' && (
                      <span className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] font-semibold',
                    status === 'today' || status === 'today-done'
                      ? 'text-foreground'
                      : isDone
                      ? 'text-foreground'
                      : 'text-muted-foreground',
                  )}>
                    {day}
                  </span>
                  {(status === 'today' || status === 'today-done') && (
                    <span className="text-[9px] font-black tracking-widest text-foreground -mt-1">
                      HOJE
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Active challenge */}
      {activeChallenge && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Desafio ativo
            </p>
            <Link
              href={`/${locale}/challenges/${activeChallenge.id}`}
              className="text-xs font-semibold text-foreground"
            >
              Ver →
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl">{activeChallenge.thumbnail_emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight">{activeChallenge.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeChallengeDone} de {activeChallenge.days_count} concluídos
              </p>
            </div>
            <span className="text-sm font-black text-foreground flex-shrink-0">
              {progressPct}%
            </span>
          </div>

          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {!activeChallenge && (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <p className="text-3xl mb-2">🎯</p>
          <p className="text-sm font-semibold">Nenhum desafio em andamento</p>
          <p className="text-xs text-muted-foreground mt-1">
            Comece um desafio para ver seu progresso aqui.
          </p>
          <Link
            href={`/${locale}/challenges`}
            className="inline-block mt-4 px-5 py-2.5 bg-foreground text-background rounded-2xl text-xs font-bold"
          >
            Explorar desafios
          </Link>
        </div>
      )}

      {/* Mini-stats 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground leading-tight whitespace-pre-line">
                {stat.label}
              </p>
              {stat.icon}
            </div>
            <p className="text-3xl font-black leading-none">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
