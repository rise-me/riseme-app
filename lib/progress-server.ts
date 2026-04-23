import { createClient } from '@/lib/supabase/server'

export interface DayProgress {
  challenge_id: string
  day_number: number
  watched_pct: number
  completed_at: string
}

export interface ProgressSummary {
  progress: DayProgress[]
  totalCompleted: number
  streak: number
  progressByChallenge: Map<string, number>
  activeChallengeId: string | null
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function daysBetween(a: Date, b: Date) {
  return Math.round((startOfLocalDay(a).getTime() - startOfLocalDay(b).getTime()) / 86400000)
}

function computeStreak(completedDates: Date[]): number {
  if (completedDates.length === 0) return 0
  const uniqueDays = Array.from(new Set(completedDates.map((d) => startOfLocalDay(d).getTime())))
    .map((t) => new Date(t))
    .sort((a, b) => b.getTime() - a.getTime())

  const today = startOfLocalDay(new Date())
  let cursor = today
  let streak = 0
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

export async function getProgressSummary(): Promise<ProgressSummary> {
  const progress = await getAllProgressForUser()
  const completedDates = progress.map((p) => new Date(p.completed_at))
  const streak = computeStreak(completedDates)

  const progressByChallenge = new Map<string, number>()
  for (const p of progress) {
    progressByChallenge.set(p.challenge_id, (progressByChallenge.get(p.challenge_id) ?? 0) + 1)
  }

  return {
    progress,
    totalCompleted: progress.length,
    streak,
    progressByChallenge,
    activeChallengeId: progress[0]?.challenge_id ?? null,
  }
}

export async function getProgressForChallenge(challengeId: string): Promise<DayProgress[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('user_progress')
    .select('challenge_id, day_number, watched_pct, completed_at')
    .eq('user_id', user.id)
    .eq('challenge_id', challengeId)

  return (data ?? []) as DayProgress[]
}

export async function getAllProgressForUser(): Promise<DayProgress[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('user_progress')
    .select('challenge_id, day_number, watched_pct, completed_at')
    .eq('user_id', user.id)
    .order('completed_at', { ascending: false })

  return (data ?? []) as DayProgress[]
}
