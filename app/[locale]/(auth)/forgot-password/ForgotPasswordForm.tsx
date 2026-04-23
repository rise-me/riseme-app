'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function ForgotPasswordForm({ locale }: { locale: string }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/${locale}/reset-password`,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="text-center space-y-3 bg-card border border-border rounded-2xl p-6">
        <p className="text-3xl">📧</p>
        <p className="text-sm font-semibold">Enviamos o link de recuperação</p>
        <p className="text-xs text-muted-foreground">
          Confira sua caixa de entrada em <span className="font-semibold text-foreground">{email}</span> e clique no link para definir uma nova senha.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="seu@email.com"
          className="h-12 rounded-xl bg-card border-border"
        />
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-xl font-bold tracking-wide text-sm bg-foreground text-background hover:bg-foreground/90"
      >
        {loading ? '...' : 'ENVIAR LINK'}
      </Button>
    </form>
  )
}
