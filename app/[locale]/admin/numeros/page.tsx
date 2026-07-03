import { redirect } from 'next/navigation'
import { createServiceClient, getAdminUser } from '@/lib/admin-server'

// Ferramenta interna — texto fixo em português.

export const dynamic = 'force-dynamic'

const CHALLENGE_NAMES: Record<string, string> = {
  '1': '💪 Calistenia en Casa',
  '2': '🧘‍♀️ Pilates en la Pared',
  '3': '✨ Yoga Facial',
  '4': '🪑 Yoga en la Silla',
  '5': '🔥 Cuerpo Sexy de Verano',
}

interface AuthUserRow {
  id: string
  created_at: string
  last_sign_in_at?: string | null
  invited_at?: string | null
  email_confirmed_at?: string | null
}

async function fetchAllAuthUsers() {
  const supabase = createServiceClient()
  const users: AuthUserRow[] = []
  let page = 1
  // paginação defensiva: hoje são ~1.600 contas; teto alto pro futuro
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    users.push(...(data.users as unknown as AuthUserRow[]))
    if (data.users.length < 1000) break
    page++
  }
  return users
}

async function loadStats() {
  const supabase = createServiceClient()

  const [authUsers, challengeRows, subsCount] = await Promise.all([
    fetchAllAuthUsers(),
    supabase.from('user_challenges').select('challenge_id').then(({ data }) =>
      (data ?? []) as Array<{ challenge_id: string }>
    ),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .then(({ count }) => count ?? 0),
  ])

  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000
  const active7 = authUsers.filter((u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() <= 7 * DAY).length
  const active30 = authUsers.filter((u) => u.last_sign_in_at && now - new Date(u.last_sign_in_at).getTime() <= 30 * DAY).length
  const stuckInvited = authUsers.filter((u) => u.invited_at && !u.last_sign_in_at).length
  const new7 = authUsers.filter((u) => now - new Date(u.created_at).getTime() <= 7 * DAY).length
  const everLoggedIn = authUsers.filter((u) => u.last_sign_in_at).length

  const perChallenge = new Map<string, number>()
  for (const row of challengeRows) {
    const id = String(row.challenge_id)
    perChallenge.set(id, (perChallenge.get(id) ?? 0) + 1)
  }
  const challengeStats = [...perChallenge.entries()].sort((a, b) => b[1] - a[1])

  return { total: authUsers.length, active7, active30, stuckInvited, new7, everLoggedIn, subsCount, challengeStats }
}

export default async function AdminNumbersPage() {
  // reforço do portão do layout — esta página expõe dados agregados do banco
  if (!(await getAdminUser())) redirect('/login')

  const { total, active7, active30, stuckInvited, new7, everLoggedIn, subsCount, challengeStats } = await loadStats()

  const bigCards = [
    { label: 'Total de alunas', value: total },
    { label: 'Ativas últimos 7 dias', value: active7 },
    { label: 'Ativas últimos 30 dias', value: active30 },
    { label: 'Já entraram alguma vez', value: everLoggedIn },
    { label: 'Convidadas que nunca entraram', value: stuckInvited, alert: stuckInvited > 0 },
    { label: 'Contas novas (7 dias)', value: new7 },
    { label: 'Assinaturas ativas', value: subsCount },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Números</h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {bigCards.map((c) => (
          <div key={c.label} className="border border-border rounded-2xl p-4">
            <p className={`text-2xl font-black tabular-nums ${c.alert ? 'text-red-600' : ''}`}>{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Acessos por desafio (vitalício + liberações)</h2>
        {challengeStats.length === 0 && <p className="text-sm text-muted-foreground">Nenhum acesso registrado.</p>}
        {challengeStats.map(([id, count]) => (
          <div key={id} className="flex items-center justify-between border border-border rounded-xl px-4 py-2.5 text-sm">
            <span>{CHALLENGE_NAMES[id] ?? `Desafio ${id}`}</span>
            <span className="font-bold tabular-nums">{count}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        “Convidadas que nunca entraram” = compraram e receberam convite, mas nunca definiram a senha.
        São recuperáveis: a campanha de reativação usa essa lista.
      </p>
    </div>
  )
}
