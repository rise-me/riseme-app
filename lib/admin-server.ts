import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// A service key dá acesso total ao banco — este módulo nunca pode ser importado
// por código de client (o `server-only` acima quebra o build se acontecer).

export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export interface AdminUser {
  id: string
  email: string
}

// Papel vive em app_metadata (só a service key escreve lá — a usuária não
// consegue se autopromover via updateUser, que só toca user_metadata).
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') return null
  return { id: user.id, email: user.email ?? '' }
}

export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser()
  if (!admin) throw new Error('forbidden')
  return admin
}
