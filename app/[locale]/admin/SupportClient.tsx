'use client'

import { useState, useTransition } from 'react'
import { Search, Mail, KeyRound, Plus, Trash2, UserPlus, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  searchUser,
  sendPasswordLink,
  grantChallenge,
  revokeChallenge,
  createAccount,
  type UserLookup,
} from './actions'

// Ferramenta interna (Bruno + suporte) — texto fixo em português, sem i18n.

const CHALLENGES = [
  { id: '1', name: '💪 Calistenia en Casa' },
  { id: '2', name: '🧘‍♀️ Pilates en la Pared' },
  { id: '3', name: '✨ Yoga Facial' },
  { id: '4', name: '🪑 Yoga en la Silla' },
  { id: '5', name: '🔥 Cuerpo Sexy de Verano' },
]
const challengeName = (id: string) => CHALLENGES.find((c) => c.id === id)?.name ?? `Desafio ${id}`

const LOCALES = [
  { code: 'es', label: 'Espanhol' },
  { code: 'tr', label: 'Turco' },
  { code: 'pt-BR', label: 'Português' },
  { code: 'en', label: 'Inglês' },
]

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export function SupportClient() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState<UserLookup | null>(null)
  const [notFoundEmail, setNotFoundEmail] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null)
  const [grantId, setGrantId] = useState('1')
  const [pending, startTransition] = useTransition()

  // formulário de criação de conta
  const [newName, setNewName] = useState('')
  const [newLocale, setNewLocale] = useState('es')
  const [newChallenge, setNewChallenge] = useState('1')

  function runSearch(target?: string) {
    const q = (target ?? email).trim()
    if (!q) return
    startTransition(async () => {
      setFeedback(null)
      const res = await searchUser(q)
      if ('error' in res) {
        setFeedback({ ok: false, text: res.error })
        return
      }
      if (!res.found) {
        setResult(null)
        setNotFoundEmail(q.toLowerCase())
      } else {
        setResult(res)
        setNotFoundEmail(null)
      }
    })
  }

  function refresh() {
    if (result?.email) runSearch(result.email)
  }

  const neverLoggedIn = result?.found && !result.lastSignInAt

  return (
    <div className="space-y-5">
      {/* Busca */}
      <form
        onSubmit={(e) => { e.preventDefault(); runSearch() }}
        className="flex gap-2"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email da aluna"
          className="flex-1 px-4 py-3 rounded-2xl border border-border bg-card text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-3 rounded-2xl bg-foreground text-background text-sm font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <Search size={16} />
          Buscar
        </button>
      </form>

      {feedback && (
        <div className={cn(
          'flex items-center gap-2 text-sm px-4 py-3 rounded-2xl',
          feedback.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        )}>
          {feedback.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {feedback.text}
        </div>
      )}

      {/* Não encontrada → criar conta */}
      {notFoundEmail && (
        <div className="border border-border rounded-2xl p-5 space-y-4">
          <p className="text-sm">
            <span className="font-bold">{notFoundEmail}</span> não tem conta no app.
          </p>
          <p className="text-xs text-muted-foreground">
            Se ela comprou e não recebeu acesso, crie a conta aqui: ela recebe o email de boas-vindas pra definir a senha, já com o desafio liberado.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome (opcional)"
              className="px-3 py-2.5 rounded-xl border border-border bg-card text-sm"
            />
            <select
              value={newLocale}
              onChange={(e) => setNewLocale(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-border bg-card text-sm"
            >
              {LOCALES.map((l) => <option key={l.code} value={l.code}>Idioma: {l.label}</option>)}
            </select>
            <select
              value={newChallenge}
              onChange={(e) => setNewChallenge(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-border bg-card text-sm"
            >
              {CHALLENGES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button
            disabled={pending}
            onClick={() => startTransition(async () => {
              const res = await createAccount({ email: notFoundEmail, name: newName, locale: newLocale, challengeId: newChallenge })
              setFeedback(res.ok
                ? { ok: true, text: 'Conta criada — email de boas-vindas enviado com o desafio liberado.' }
                : { ok: false, text: res.error ?? 'Erro ao criar conta' })
              if (res.ok) runSearch(notFoundEmail)
            })}
            className="w-full py-3 rounded-2xl bg-foreground text-background text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <UserPlus size={16} />
            Criar conta e liberar desafio
          </button>
        </div>
      )}

      {/* Encontrada → ficha + ações */}
      {result?.found && (
        <div className="border border-border rounded-2xl p-5 space-y-5">
          <div>
            <p className="font-bold">{result.name ?? 'Sem nome'}</p>
            <p className="text-sm text-muted-foreground">{result.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-semibold">Conta criada</p>
              <p>{formatDate(result.createdAt)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-semibold">Último acesso</p>
              <p className={cn(neverLoggedIn && 'text-red-600 font-semibold')}>
                {result.lastSignInAt ? formatDate(result.lastSignInAt) : 'NUNCA ENTROU'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-semibold">Idioma</p>
              <p>{LOCALES.find((l) => l.code === result.locale)?.label ?? result.locale ?? '—'}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground uppercase font-semibold">Assinatura</p>
              <p>
                {result.activeSubscription
                  ? `Ativa (${result.activeSubscription.plan_type ?? '?'}) até ${formatDate(result.activeSubscription.current_period_end)}`
                  : 'Nenhuma'}
              </p>
            </div>
          </div>

          {neverLoggedIn && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl px-3 py-2.5">
              Essa aluna nunca conseguiu entrar. Use “Enviar link de senha” — resolve 90% dos casos.
            </div>
          )}

          {/* Desafios */}
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground uppercase font-semibold">Desafios liberados</p>
            {result.challenges && result.challenges.length > 0 ? (
              result.challenges.map((c) => (
                <div key={c.challenge_id} className="flex items-center justify-between bg-secondary rounded-xl px-3 py-2 text-sm">
                  <span>{challengeName(c.challenge_id)} <span className="text-muted-foreground text-xs">({c.access_type ?? '—'})</span></span>
                  <button
                    disabled={pending}
                    onClick={() => {
                      if (!window.confirm(`Remover ${challengeName(c.challenge_id)} de ${result.email}?`)) return
                      startTransition(async () => {
                        const res = await revokeChallenge(result.id!, c.challenge_id)
                        setFeedback(res.ok ? { ok: true, text: 'Desafio removido.' } : { ok: false, text: res.error ?? 'Erro' })
                        refresh()
                      })
                    }}
                    className="text-red-500 p-1"
                    title="Remover acesso"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum desafio liberado.</p>
            )}
          </div>

          {/* Ações */}
          <div className="space-y-2 pt-1 border-t border-border">
            <div className="flex gap-2 pt-3">
              <select
                value={grantId}
                onChange={(e) => setGrantId(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-border bg-card text-sm"
              >
                {CHALLENGES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button
                disabled={pending}
                onClick={() => startTransition(async () => {
                  const res = await grantChallenge(result.id!, grantId)
                  setFeedback(res.ok
                    ? { ok: true, text: 'Desafio liberado (vitalício). Não envia email — o desafio já aparece no app dela.' }
                    : { ok: false, text: res.error ?? 'Erro' })
                  refresh()
                })}
                className="px-4 py-2.5 rounded-xl bg-foreground text-background text-sm font-bold flex items-center gap-1.5 disabled:opacity-50"
              >
                <Plus size={15} />
                Liberar
              </button>
            </div>

            <button
              disabled={pending}
              onClick={() => startTransition(async () => {
                const res = await sendPasswordLink(result.email!, result.locale ?? 'es')
                setFeedback(res.ok
                  ? { ok: true, text: `Link de senha enviado pra ${result.email} (vale 24h). Se não chegar em ~2 min, pede pra olhar o spam.` }
                  : { ok: false, text: res.error ?? 'Erro ao enviar' })
              })}
              className="w-full py-3 rounded-2xl border border-border text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <KeyRound size={15} />
              Enviar link de senha
            </button>
          </div>
        </div>
      )}

      {/* Guia rápido */}
      {!result && !notFoundEmail && (
        <div className="text-sm text-muted-foreground space-y-2 border border-dashed border-border rounded-2xl p-5">
          <p className="font-semibold text-foreground flex items-center gap-2"><Mail size={15} /> Como atender “comprei e não consigo entrar”:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Busque o email exato que ela usou na compra.</li>
            <li>Conta existe e “nunca entrou” → <span className="font-semibold">Enviar link de senha</span>.</li>
            <li>Conta existe mas sem o desafio → <span className="font-semibold">Liberar</span> o desafio comprado.</li>
            <li>Conta não existe → <span className="font-semibold">Criar conta</span> já com o desafio.</li>
          </ol>
          <p className="text-xs pt-1">Nunca use o botão “Reenviar acesso ao comprador” da Hotmart — ele é de outro produto (Hotmart Club) e não afeta o app.</p>
        </div>
      )}
    </div>
  )
}
