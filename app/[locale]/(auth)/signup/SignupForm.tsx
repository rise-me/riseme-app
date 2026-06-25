'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/posthog/track'
import Link from 'next/link'

const RESEND_COOLDOWN_SECONDS = 60

export function SignupForm({ locale }: { locale: string }) {
  const t = useTranslations('auth')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)
  const [accountAlreadyExisted, setAccountAlreadyExisted] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('passwordsDontMatch'))
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    const isDuplicate = (data?.user?.identities?.length ?? 0) === 0
    if (isDuplicate) {
      setAccountAlreadyExisted(true)
      setSubmittedEmail(email)
    } else {
      track('signup_completed', { locale })
      setCooldown(RESEND_COOLDOWN_SECONDS)
      setSubmittedEmail(email)
    }
    setLoading(false)
  }

  async function handleResend() {
    if (!submittedEmail || resending || cooldown > 0) return
    setResending(true)
    const supabase = createClient()
    await supabase.auth.resend({ type: 'signup', email: submittedEmail })
    setResending(false)
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  if (submittedEmail && accountAlreadyExisted) {
    return (
      <div className="w-full space-y-4">
        <div className="text-center space-y-3 bg-card border border-border rounded-2xl p-6">
          <p className="text-3xl">🔑</p>
          <p className="text-sm font-semibold">{t('emailAlreadyExistsTitle')}</p>
          <p className="text-xs text-muted-foreground">
            {t('emailAlreadyExistsDesc', { email: submittedEmail })}
          </p>
          <div className="space-y-2 pt-2">
            <Link href={`/${locale}/login`} className="block">
              <Button
                type="button"
                className="w-full h-11 rounded-xl text-sm font-bold tracking-wide bg-foreground text-background hover:bg-foreground/90"
              >
                {t('loginInstead')}
              </Button>
            </Link>
            <Link href={`/${locale}/forgot-password`} className="block">
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-xl text-sm font-semibold"
              >
                {t('recoverPasswordInstead')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
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
          <p className="text-xs text-muted-foreground pt-2">
            {t('noLoEncuentras')}
          </p>
          <Button
            type="button"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
            variant="outline"
            className="w-full h-11 rounded-xl text-sm font-semibold"
          >
            {cooldown > 0
              ? t('resendIn', { seconds: cooldown })
              : resending
              ? '...'
              : t('resendConfirmation')}
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
