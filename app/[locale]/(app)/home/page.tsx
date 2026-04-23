import { getTranslations } from 'next-intl/server'
import { Flame, CalendarDays, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { getProgressSummary } from '@/lib/progress-server'
import { mockChallenges } from '@/lib/mock-challenges'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('home')

  const { streak, progressByChallenge, activeChallengeId } = await getProgressSummary()

  const activeChallenge = activeChallengeId
    ? mockChallenges.find((c) => c.id === activeChallengeId)
    : mockChallenges.find((c) => c.is_free) ?? mockChallenges[0]

  const completedCount = activeChallenge
    ? progressByChallenge.get(activeChallenge.id) ?? 0
    : 0
  const nextDay = activeChallenge
    ? Math.min(completedCount + 1, activeChallenge.days_count)
    : 1
  const pct = activeChallenge
    ? Math.round((completedCount / activeChallenge.days_count) * 100)
    : 0

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('todayPlan')}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{t('today')}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-bold">
          B
        </div>
      </div>

      {/* Active challenge card */}
      {activeChallenge && (
        <Link href={`/${locale}/challenges/${activeChallenge.id}`}>
          <div className="rounded-2xl bg-foreground text-background p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-orange-400" />
              <span className="text-sm font-medium text-background/70">
                {completedCount > 0 ? 'Em andamento' : 'Comece agora'}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-bold">{activeChallenge.title}</h2>
              <p className="text-sm text-background/60 mt-0.5">
                {completedCount} de {activeChallenge.days_count} concluídos
              </p>
            </div>
            <div className="h-1.5 bg-background/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-background rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="w-full py-3 bg-background text-foreground rounded-xl text-sm font-bold tracking-wide text-center">
              {completedCount > 0 ? `Continuar — Dia ${nextDay}` : `Começar — Dia 1`}
            </div>
          </div>
        </Link>
      )}

      {/* Streak */}
      <div className="flex items-center gap-3 bg-card rounded-2xl p-4 border border-border">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <CalendarDays size={18} className="text-muted-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">
            {streak > 0 ? `${streak} ${streak === 1 ? 'dia' : 'dias'} seguidos 🔥` : 'Comece sua sequência hoje'}
          </p>
          <p className="text-xs text-muted-foreground">
            {streak > 0 ? 'Continue assim!' : 'Complete um treino pra começar'}
          </p>
        </div>
      </div>

      {/* Hydration tracker (simple) */}
      <div className="flex items-center gap-3 bg-card rounded-2xl p-4 border border-border">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl">
          💧
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Beber água</p>
          <p className="text-xs text-muted-foreground">0 de 2.000 ml</p>
        </div>
        <ChevronRight size={16} className="text-muted-foreground" />
      </div>

      {/* Explore more challenges CTA */}
      <Link href={`/${locale}/challenges`}>
        <div className="flex items-center gap-3 bg-card rounded-2xl p-4 border border-border">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl">
            🏆
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">Explorar desafios</p>
            <p className="text-xs text-muted-foreground">
              {mockChallenges.length} desafios disponíveis
            </p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
      </Link>
    </div>
  )
}
