'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export function EntrarForm({ locale }: { locale: string }) {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [autoTrying, setAutoTrying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const autoRan = useRef(false)

  async function signIn(mail: string, pass: string): Promise<boolean> {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: mail.trim(), password: pass.trim() })
    if (error) {
      setError(t('accessInvalid'))
      return false
    }
    window.location.href = `/${locale}/home`
    return true
  }

  // Um toque: link do WhatsApp/email traz ?e=&k= → entra sozinha e limpa a URL.
  useEffect(() => {
    if (autoRan.current) return
    autoRan.current = true
    const url = new URL(window.location.href)
    const e = url.searchParams.get('e')
    const k = url.searchParams.get('k')
    if (e && k) {
      setEmail(e)
      setCode(k)
      setAutoTrying(true)
      // limpa o código da barra de endereço imediatamente
      window.history.replaceState(null, '', url.pathname)
      signIn(e, k).then((ok) => {
        if (!ok) setAutoTrying(false)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setLoading(true)
    setError(null)
    await signIn(email, code)
    setLoading(false)
  }

  if (autoTrying) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground text-center">{t('entering')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
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
        <Label htmlFor="code">{t('password')}</Label>
        <Input
          id="code"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 rounded-xl bg-card border-border"
        />
        <p className="text-xs text-muted-foreground mt-1">{t('accessCodeHint')}</p>
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl font-bold tracking-wide text-sm bg-foreground text-background hover:bg-foreground/90"
      >
        {loading ? '...' : t('enter')}
      </Button>

      <Link
        href={`/${locale}/forgot-password`}
        className="text-xs text-muted-foreground w-full block text-center"
      >
        {t('noAccess')}
      </Link>
    </form>
  )
}
