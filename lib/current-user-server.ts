import { createClient } from '@/lib/supabase/server'

export interface CurrentUser {
  id: string
  email: string
  name: string
  initial: string
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const email = user.email ?? ''
  const metaName = (user.user_metadata?.name as string | undefined)?.trim()
  const name = metaName || email.split('@')[0] || ''
  const initial = (name || email).charAt(0).toUpperCase() || '?'

  return { id: user.id, email, name, initial }
}
