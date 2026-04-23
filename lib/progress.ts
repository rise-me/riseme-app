import { createClient } from '@/lib/supabase/client'

export interface DayProgress {
  challenge_id: string
  day_number: number
  watched_pct: number
  completed_at: string
}

export async function markDayComplete(params: {
  challengeId: string
  dayNumber: number
  watchedPct: number
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'not_authenticated' }

  const row = {
    user_id: user.id,
    challenge_id: params.challengeId,
    day_number: params.dayNumber,
    watched_pct: params.watchedPct,
    completed_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('user_progress')
    .upsert(row as never, { onConflict: 'user_id,challenge_id,day_number' })

  return { error }
}
