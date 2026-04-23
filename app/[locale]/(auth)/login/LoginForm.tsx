'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export function LoginForm({ locale }: { locale: string }) {
  const t = useTranslations('auth')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(`/${locale}/home`)
    }
  }

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleLogin} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 rounded-xl bg-card border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12 rounded-xl bg-card border-border"
          />
          <Link
            href={`/${locale}/forgot-password`}
            className="text-xs text-muted-foreground w-full block text-center mt-1"
          >
            {t('forgotPassword')}
          </Link>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl font-bold tracking-wide text-sm bg-foreground text-background hover:bg-foreground/90"
        >
          {loading ? '...' : t('login').toUpperCase()}
        </Button>
      </form>
    </div>
  )
}
