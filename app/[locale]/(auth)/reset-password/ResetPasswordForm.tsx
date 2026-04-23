'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function ResetPasswordForm({ locale }: { locale: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    const params = new URLSearchParams(hash)
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (access_token && refresh_token) {
      supabase.auth.setSession({ access_token, refresh_token }).then(({ error }) => {
        if (error) {
          setError('Link inválido ou expirado. Solicite um novo e-mail de recuperação.')
        } else {
          setSessionReady(true)
          window.history.replaceState(null, '', window.location.pathname)
        }
      })
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setSessionReady(true)
      else setError('Link inválido ou expirado. Solicite um novo e-mail de recuperação.')
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('As senhas não coincidem.')
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
      router.push(`/${locale}/home`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          placeholder="Mínimo 6 caracteres"
          disabled={!sessionReady}
          className="h-12 rounded-xl bg-card border-border"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirmar senha</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder="Repita a senha"
          disabled={!sessionReady}
          className="h-12 rounded-xl bg-card border-border"
        />
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <Button
        type="submit"
        disabled={loading || !sessionReady}
        className="w-full h-12 rounded-xl font-bold tracking-wide text-sm bg-foreground text-background hover:bg-foreground/90"
      >
        {loading ? '...' : 'SALVAR NOVA SENHA'}
      </Button>
    </form>
  )
}
