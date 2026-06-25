'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/posthog/track'

export function SignupForm({ locale }: { locale: string }) {
  const t = useTranslations('auth')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('passwordsDontMatch'))
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      track('signup_completed', { locale })
      setSubmittedEmail(email)
      setLoading(false)
    }
  }

  async function handleResend() {
    if (!submittedEmail || resending || resent) return
    setResending(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resend({ type: 'signup', email: submittedEmail })
    setResending(false)
    if (!error) setResent(true)
  }

  if (submittedEmail) {
    return (
      <div className="w-full space-y-4">
        <div className="text-center space-y-3 bg-card border border-border rounded-2xl p-6">
          <p className="text-3xl">📧</p>
          <p className="text-sm font-semibold">{t('checkYourEmailTitle')}</p>
          <p className="text-xs text-muted-foreground">
            {t('checkYourEmailDesc', { email: submittedEmail })}
          </p>
          <Button
            type="button"
            onClick={handleResend}
            disabled={resending || resent}
            variant="outline"
            className="w-full h-11 rounded-xl text-sm font-semibold"
          >
            {resent ? t('confirmationResent') : resending ? '...' : t('resendConfirmation')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <form onSubmit={handleSignup} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name">{t('name')}</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder={t('namePlaceholder')}
            className="h-12 rounded-xl bg-card border-border"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder={t('emailPlaceholder')}
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
            minLength={6}
            placeholder={t('passwordPlaceholder')}
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
            className="h-12 rounded-xl bg-card border-border"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl font-bold tracking-wide text-sm bg-foreground text-background hover:bg-foreground/90"
        >
          {loading ? '...' : t('createAccountUpper')}
        </Button>
      </form>
    </div>
  )
}
