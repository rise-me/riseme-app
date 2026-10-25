import { createClient } from '@/lib/supabase/server'
import { fusoDaAluna, sequenciaDeDias } from '@/lib/dias'

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

export async function getProgressSummary(locale: string): Promise<ProgressSummary> {
  const [progress, tz] = await Promise.all([getAllProgressForUser(), fusoDaAluna(locale)])
  const streak = sequenciaDeDias(progress.map((p) => new Date(p.completed_at)), tz)

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
