import { getTranslations } from 'next-intl/server'
import { Flame, Clock, Trophy, Zap, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { getAllProgressForUser } from '@/lib/progress-server'
import { mockChallenges } from '@/lib/mock-challenges'
import { getCurrentUser } from '@/lib/current-user-server'
import { WaterTracker } from '@/components/home/WaterTracker'
import { FirstAccessNotice } from '@/components/home/FirstAccessNotice'
import { IndicaAmiga } from '@/components/home/IndicaAmiga'
import { diaNoFuso, fusoDaAluna, numeroDoDia, sequenciaDeDias } from '@/lib/dias'

const MINUTES_PER_DAY_AVG = 20

// Primeiro nome apresentável a partir do nome do checkout ("ÖMÜR GÜREL" -> "Ömür").
// toLocale* respeita regras do idioma (ex.: İ/i do turco). Sem nome real -> null.
function firstNameForGreeting(realName: string | null, locale: string): string | null {
  const first = realName?.trim().split(/\s+/)[0]
  if (!first) return null
  const lower = first.toLocaleLowerCase(locale)
  return lower.charAt(0).toLocaleUpperCase(locale) + lower.slice(1)
}

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('progress')
  const tData = await getTranslations('challengeData')
  const [progress, user, tz] = await Promise.all([
    getAllProgressForUser(),
    getCurrentUser(),
    fusoDaAluna(locale),
  ])

  const greetName = firstNameForGreeting(user?.realName ?? null, locale)

  const WEEK_DAYS = t('weekDays').split(',')

  const totalCompleted = progress.length
  const streak = sequenciaDeDias(progress.map((p) => new Date(p.completed_at)), tz)

  const todayKey = diaNoFuso(new Date(), tz)
  const todayIndex = new Date(`${todayKey}T00:00:00Z`).getUTCDay()
  const thisWeekStart = numeroDoDia(todayKey) - todayIndex
  const weekCompleted = new Set<number>()
  for (const p of progress) {
    const diff = numeroDoDia(diaNoFuso(new Date(p.completed_at), tz)) - thisWeekStart
    if (diff >= 0 && diff <= 6) weekCompleted.add(diff)
  }
  type DayStatus = 'done' | 'today-done' | 'today' | 'missed' | 'upcoming'
  const WEEK_STATUS: DayStatus[] = WEEK_DAYS.map((_, i) => {
    const done = weekCompleted.has(i)
    if (i === todayIndex) return done ? 'today-done' : 'today'
    if (i < todayIndex) return done ? 'done' : 'missed'
    return 'upcoming'
  })

  const monthDays = new Set(
    progress
      .map((p) => diaNoFuso(new Date(p.completed_at), tz))
      .filter((dia) => dia.slice(0, 7) === todayKey.slice(0, 7))
  )

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

  let completedChallenges = 0
  for (const [cid, done] of progressByChallenge) {
    const ch = mockChallenges.find((c) => c.id === cid)
    if (ch && done >= ch.days_count) completedChallenges++
  }

  const STATS = [
    { label: t('statTrainingsThisWeek'), value: String(weekCompleted.size), icon: <Zap size={16} className="text-yellow-500" /> },
    { label: t('statTotalMinutes'), value: String(totalCompleted * MINUTES_PER_DAY_AVG), icon: <Clock size={16} className="text-blue-500" /> },
    { label: t('statCompletedChallenges'), value: String(completedChallenges), icon: <Trophy size={16} className="text-amber-500" /> },
    { label: t('statActiveDaysMonth'), value: String(monthDays.size), icon: <Calendar size={16} className="text-green-600" /> },
  ]

  return (
    <div className="px-4 pt-12 pb-6 space-y-4">
      {user && !user.onboarded && <FirstAccessNotice locale={locale} />}

      {/* Header — saudação pelo nome quando temos o nome REAL da compra */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          {greetName ? t('greeting', { name: greetName }) : t('title')}
        </h1>
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
          {user?.initial ?? '?'}
        </div>
      </div>

      {/* Streak */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0">
          <Flame size={28} className="text-orange-500" />
        </div>
        <div>
          <p className="text-4xl font-black leading-none">{streak}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{t('daysSequence')}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">{t('totalLabel')}</p>
          <p className="text-lg font-black">{totalCompleted}</p>
        </div>
      </div>

      {/* Weekly activity */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t('weeklyActivity')}
          </p>
          <p className="text-xs font-bold text-foreground">
            {t('ofDays', { done: weekCompleted.size })}
          </p>
        </div>

        <div className="relative">
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-secondary" />
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
                      {t('today')}
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
              {t('activeChallenge')}
            </p>
            <Link
              href={`/${locale}/challenges/${activeChallenge.id}`}
              className="text-xs font-semibold text-foreground"
            >
              {t('viewArrow')}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-3xl">{activeChallenge.thumbnail_emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm leading-tight">{tData(`${activeChallenge.id}.title`)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('completedOf', { done: activeChallengeDone, total: activeChallenge.days_count })}
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
          <p className="text-sm font-semibold">{t('noActiveChallenge')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('noActiveChallengeDesc')}
          </p>
          <Link
            href={`/${locale}/challenges`}
            className="inline-block mt-4 px-5 py-2.5 bg-foreground text-background rounded-2xl text-xs font-bold"
          >
            {t('exploreChallenges')}
          </Link>
        </div>
      )}

      {/* Mini-stats 2x2 */}
      <div className="grid grid-cols-2 gap-3">
        {STATS.map((stat, i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 space-y-3">
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

      {/* Hidratação — veio da antiga aba Plan (removida 2026-08-06) */}
      <WaterTracker />

      {/* Indicação (19/10/2026): só espanhol por enquanto — o link é o checkout da CL-ES na Hotmart. */}
      {user && locale === 'es' && <IndicaAmiga userId={user.id} />}
    </div>
  )
}
