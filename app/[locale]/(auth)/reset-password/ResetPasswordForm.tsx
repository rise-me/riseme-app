'use client'

import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ResetPasswordForm({ locale }: { locale: string }) {
  const t = useTranslations('auth')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [linkExpired, setLinkExpired] = useState(false)

  function markExpired() {
    setError(t('linkExpired'))
    setLinkExpired(true)
  }

  useEffect(() => {
    const supabase = createClient()

    // PKCE flow (new default): ?code=... in query string
    const code = new URL(window.location.href).searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          markExpired()
        } else {
          setSessionReady(true)
          window.history.replaceState(null, '', window.location.pathname)
        }
      })
      return
    }

    // Implicit flow (legacy): #access_token=...&refresh_token=... in hash
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    const hashParams = new URLSearchParams(hash)
    const access_token = hashParams.get('access_token')
    const refresh_token = hashParams.get('refresh_token')

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) {
          markExpired()
        } else {
          setSessionReady(true)
          window.history.replaceState(null, '', window.location.pathname)
        }
      })
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true)
      else markExpired()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('passwordsDontMatch'))
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = `/${locale}/home`
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">{t('newPassword')}</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder={t('passwordPlaceholder')}
          disabled={!sessionReady}
          className="h-12 rounded-xl bg-card border-border"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">{t('confirmPassword')}</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder={t('passwordRepeatPlaceholder')}
          disabled={!sessionReady}
          className="h-12 rounded-xl bg-card border-border"
        />
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      {linkExpired ? (
        <Link
          href={`/${locale}/forgot-password`}
          className="block w-full h-12 rounded-xl font-bold tracking-wide text-sm bg-foreground text-background hover:bg-foreground/90 flex items-center justify-center"
        >
          {t('requestNewLink')}
        </Link>
      ) : (
        <Button
          type="submit"
          disabled={loading || !sessionReady}
          className="w-full h-12 rounded-xl font-bold tracking-wide text-sm bg-foreground text-background hover:bg-foreground/90"
        >
          {loading ? '...' : t('saveNewPasswordUpper')}
        </Button>
      )}
    </form>
  )
}
