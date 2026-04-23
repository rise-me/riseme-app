import { Flame, Clock, Trophy, Zap, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// Mock data — will be replaced with Supabase queries in Fase 2
const STREAK = 3
const RECORD = 7
const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
const MOCK_COMPLETED_INDICES = [1, 2, 3] // Seg, Ter, Qua

const CHALLENGE = {
  id: '1',
  emoji: '💪',
  title: 'Calistenia em Casa',
  current: 3,
  total: 28,
}

const STATS = [
  { label: 'Treinos\nesta semana', value: '3', icon: <Zap size={16} className="text-yellow-500" /> },
  { label: 'Minutos\ntotais', value: '60', icon: <Clock size={16} className="text-blue-500" /> },
  { label: 'Desafios\nconcluídos', value: '0', icon: <Trophy size={16} className="text-amber-500" /> },
  { label: 'Dias ativos\nno mês', value: '3', icon: <Calendar size={16} className="text-green-600" /> },
]

export default async function ProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb
  const todayIndex = new Date().getDay()
  const WEEK_STATUS: (boolean | 'today')[] = WEEK_DAYS.map((_, i) => {
    if (i === todayIndex) return 'today'
    if (MOCK_COMPLETED_INDICES.includes(i)) return true
    return false
  })

  const progressPct = Math.round((CHALLENGE.current / CHALLENGE.total) * 100)

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
          <p className="text-4xl font-black leading-none">{STREAK}</p>
          <p className="text-sm text-muted-foreground mt-0.5">dias seguidos</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Recorde</p>
          <p className="text-lg font-black">{RECORD}</p>
        </div>
      </div>

      {/* Weekly activity */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Atividade semanal
        </p>
        <div className="flex justify-between">
          {WEEK_DAYS.map((day, i) => {
            const status = WEEK_STATUS[i]
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                  status === true && 'bg-foreground',
                  status === 'today' && 'border-2 border-foreground bg-background',
                  status === false && 'bg-secondary',
                )}>
                  {status === true && (
                    <span className="text-background text-[11px] font-black">✓</span>
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-medium',
                  status === 'today' ? 'text-foreground font-bold' : 'text-muted-foreground'
                )}>
                  {day}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Active challenge */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Desafio ativo
          </p>
          <Link
            href={`/${locale}/challenges/${CHALLENGE.id}`}
            className="text-xs font-semibold text-foreground"
          >
            Ver →
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-3xl">{CHALLENGE.emoji}</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">{CHALLENGE.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dia {CHALLENGE.current} de {CHALLENGE.total}
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
