import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { gerarCardapio } from '@/lib/diet/gerar'
import { cotaDaUsuaria } from '@/lib/diet/quota'
import {
  RESTRICOES,
  PREFERENCIAS,
  CONDICOES,
  FREQ_TREINO,
  MINUTOS_TREINO,
  ESFORCOS,
  type PerfilCardapio,
  type Restricao,
  type Preferencia,
  type Condicao,
  type Custo,
  type FreqTreino,
  type MinutosTreino,
  type Esforco,
  type Objective,
  type Sex,
} from '@/lib/diet/tipos'

// POST /api/menu/gerar — gera o cardápio personalizado da aluna logada.
// Valida TUDO no servidor, checa a COTA (trava real — o app nunca decide),
// chama o motor de IA e grava em diet_menus. Sessão via cookie do Supabase.

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // geração via IA (até 6 chamadas Claude, 2 por vez)

const SEXOS = new Set<Sex>(['female', 'male'])
const FREQS = new Set<FreqTreino>(FREQ_TREINO)
const MINUTOS = new Set<number>(MINUTOS_TREINO)
const ESFORCOS_OK = new Set<Esforco>(ESFORCOS)
const OBJETIVOS = new Set<Objective>(['lose', 'maintain', 'gain'])
const CUSTOS = new Set<Custo>(['barata', 'moderada', 'cara'])
const NUM_REFEICOES = new Set([3, 4, 5, 6])
const RESTRICOES_OK = new Set<Restricao>(RESTRICOES)
const PREFERENCIAS_OK = new Set<Preferencia>(PREFERENCIAS)
const CONDICOES_OK = new Set<Condicao>(CONDICOES)

function enumArray<T>(v: unknown, ok: Set<T>): T[] {
  if (!Array.isArray(v)) return []
  const out: T[] = []
  for (const x of v) if (ok.has(x as T) && !out.includes(x as T)) out.push(x as T)
  return out
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

// Texto livre da aluna (amo/jamais): até 4 itens curtos, sem quebra de linha —
// vai pro prompt, então limpa o suficiente pra não virar instrução solta.
function listaLivre(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => String(x ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 4)
}

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[menu] ANTHROPIC_API_KEY não configurada')
    return NextResponse.json({ error: 'not_configured' }, { status: 500 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!b) return NextResponse.json({ error: 'bad_request' }, { status: 400 })

  const sex = SEXOS.has(b.sex as Sex) ? (b.sex as Sex) : 'female'
  const perfil: PerfilCardapio = {
    sex,
    age: clamp(Math.round(Number(b.age) || 0), 14, 90),
    weightKg: clamp(Math.round(Number(b.weightKg) || 0), 35, 250),
    heightCm: clamp(Math.round(Number(b.heightCm) || 0), 120, 220),
    freqTreino: FREQS.has(b.freqTreino as FreqTreino) ? (b.freqTreino as FreqTreino) : 'f1_2',
    minutosTreino: (MINUTOS.has(Number(b.minutosTreino)) ? Number(b.minutosTreino) : 30) as MinutosTreino,
    esforco: ESFORCOS_OK.has(b.esforco as Esforco) ? (b.esforco as Esforco) : 'moderado',
    objective: OBJETIVOS.has(b.objective as Objective) ? (b.objective as Objective) : 'lose',
    numRefeicoes: (NUM_REFEICOES.has(Number(b.numRefeicoes)) ? Number(b.numRefeicoes) : 4) as 3 | 4 | 5 | 6,
    incluiCafe: b.incluiCafe !== false,
    restricoes: enumArray(b.restricoes, RESTRICOES_OK),
    preferencias: enumArray(b.preferencias, PREFERENCIAS_OK),
    condicoes: enumArray(b.condicoes, CONDICOES_OK),
    custo: CUSTOS.has(b.custo as Custo) ? (b.custo as Custo) : 'moderada',
    adora: listaLivre(b.adora),
    naoCome: listaLivre(b.naoCome),
    observacao: String(b.observacao ?? '').slice(0, 500),
  }
  if (!perfil.age || !perfil.weightKg || !perfil.heightCm) {
    return NextResponse.json({ error: 'missing_profile' }, { status: 400 })
  }

  // Trava de cota — SEMPRE no servidor.
  const cota = await cotaDaUsuaria(user.id)
  if (cota.restantes <= 0) {
    return NextResponse.json(
      { error: 'quota_exceeded', plano: cota.plano, renova: cota.renova },
      { status: 403 }
    )
  }

  const locale = (user.user_metadata?.locale as string) ?? 'es'

  let menu
  try {
    menu = await gerarCardapio(perfil, locale)
  } catch (e) {
    console.error('[menu] geração falhou:', e)
    return NextResponse.json({ error: 'generation_failed' }, { status: 502 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
  const { data: saved, error: saveError } = await admin
    .from('diet_menus')
    .insert({ user_id: user.id, locale, menu })
    .select('id, created_at')
    .single()
  if (saveError) {
    console.error('[menu] falha ao salvar:', saveError)
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  return NextResponse.json({
    id: saved.id,
    created_at: saved.created_at,
    menu,
    restantes: cota.restantes - 1,
  })
}
