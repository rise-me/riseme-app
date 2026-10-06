'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

// Troca de senha de quem JÁ está logada (a conta nasce com o código de acesso do WhatsApp
// como senha). É o destino do "Crear mi contraseña" do aviso de 1º acesso e o que as
// mensagens de acesso prometem ("puedes cambiar tu contraseña dentro de la aplicación").
export function ChangePasswordForm() {
  const t = useTranslations('profile')
  const tAuth = useTranslations('auth')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saved' | 'error' | 'mismatch'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setStatus('mismatch')
      return
    }
    setLoading(true)
    // onboarded junto: quem cria a própria senha não precisa mais do aviso de 1º acesso.
    const { error } = await createClient().auth.updateUser({ password, data: { onboarded: true } })
    setLoading(false)
    if (error) {
      console.error('[perfil] troca de senha falhou:', error.message)
      setStatus('error')
      return
    }
    setPassword('')
    setConfirm('')
    setStatus('saved')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-4 space-y-3">
      <p className="text-sm text-muted-foreground">{t('passwordHint')}</p>
      <Input
        type="password"
        value={password}
        onChange={(e) => { setPassword(e.target.value); setStatus('idle') }}
        required
        minLength={6}
        autoComplete="new-password"
        placeholder={tAuth('passwordPlaceholder')}
        aria-label={tAuth('newPassword')}
        className="h-12 rounded-xl bg-background border-border"
      />
      <Input
        type="password"
        value={confirm}
        onChange={(e) => { setConfirm(e.target.value); setStatus('idle') }}
        required
        minLength={6}
        autoComplete="new-password"
        placeholder={tAuth('passwordRepeatPlaceholder')}
        aria-label={tAuth('confirmPassword')}
        className="h-12 rounded-xl bg-background border-border"
      />
      {status === 'mismatch' && <p className="text-sm text-destructive">{tAuth('passwordsDontMatch')}</p>}
      {status === 'error' && <p className="text-sm text-destructive">{t('passwordError')}</p>}
      {status === 'saved' && <p className="text-sm font-semibold text-green-700 dark:text-green-400">{t('passwordSaved')}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl font-bold tracking-wide text-sm bg-foreground text-background hover:bg-foreground/90"
      >
        {loading ? '...' : t('savePassword')}
      </Button>
    </form>
  )
}
