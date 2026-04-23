'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut, ChevronRight } from 'lucide-react'

export function LogoutButton({ locale }: { locale: string }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/${locale}/login`)
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-4 text-left active:bg-secondary/50 transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
        <LogOut size={18} className="text-destructive" />
      </div>
      <span className="flex-1 text-sm font-medium text-destructive">Sair</span>
      <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
    </button>
  )
}
