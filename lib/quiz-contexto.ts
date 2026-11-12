// O que a aluna respondeu no QUIZ antes de comprar, para o agente de WhatsApp (Bruno, 05/11/2026: "seria incrível").
// Cadeia: a venda chega da Hotmart com `purchase.origin.sck` (id do visitante do Tag Manager) → o app guarda o sck em
// auth user_metadata → a sessão do quiz com esse sck (banco `metricas-quiz`, tabela quiz_sessoes, painel-quizes)
// traz as respostas {tela: opção} → viram texto legível com o mapa tela→pergunta→opção (quiz-cl-es.json, gerado do
// copy.es.json do funil). Guardado em user_metadata.quiz na 1ª leitura; sem credencial do banco de métricas
// (METRICAS_SUPABASE_URL/_SERVICE_KEY) nada é buscado e o perfil segue sem o quiz. Medido em 05/11: 769 das 2.358
// compradoras dos últimos 30 dias com conta no app têm sessão do quiz com respostas (31% das vendas com sck).
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import mapaClEs from './whatsapp-agent/quiz-cl-es.json'
// Mapas de outros funis: gerados do copy.<idioma>.json com scripts/gerar-mapa-quiz.mts (fora da pasta do bot).
import mapaClPl from './quiz-mapas/cl-pl.json'

type Mapa = Record<string, { key: string; pergunta: string; opcoes: Record<string, string> }>
// CL-ES-BR (camuflagem do geo-gate) tem numeração de telas diferente: fica fora até ter mapa próprio (05/11/2026).
const MAPAS: Record<string, Mapa> = { 'CL-ES': mapaClEs as Mapa, 'CL-BIO': mapaClEs as Mapa, 'CL-PL': mapaClPl as Mapa }

// Rótulo curto por chave: a pergunta inteira é longa demais pro perfil.
const ROTULO: Record<string, string> = {
  objetivo: 'objetivo', tipo_cuerpo_actual: 'corpo hoje', pais: 'país', rango_edad: 'faixa de idade', experiencia_calistenia: 'experiência com calistenia',
  animo_sin_equipo: 'treinar sem equipamento', experiencia_cuerpo: 'ganha/perde peso', ultima_satisfaccion_cuerpo: 'última vez satisfeita com o corpo',
  areas_trabajar: 'áreas que quer trabalhar', tipo_cuerpo_deseado: 'corpo desejado', problemas_fisicos: 'problemas físicos', frecuencia_ejercicio: 'frequência de exercício',
  consumo_agua: 'água por dia', respuestas_parecidas: 'se identifica com', falta_aire_escaleras: 'fôlego na escada', frecuencia_caminar: 'caminha',
  nivel_energia: 'energia', calistenia_energia: 'calistenia e energia', horas_sueno: 'sono', malos_habitos: 'maus hábitos', eventos_aumento_peso: 'o que fez engordar',
  razon_principal: 'razão principal', evento_importante: 'evento importante à vista', proyeccion_resultados: 'projeção',
  altura: 'altura (cm)', peso_actual: 'peso atual (kg)', peso_objetivo: 'peso objetivo (kg)', edad: 'idade', nombre: 'nome que digitou',
}

export interface QuizGuardado { sck: string; funil: string; respostas: Record<string, string>; em: string }

export function quizConfigurado(): boolean {
  return Boolean(process.env.METRICAS_SUPABASE_URL && process.env.METRICAS_SUPABASE_SERVICE_KEY)
}

let _quiz: SupabaseClient | null = null
function metricas(): SupabaseClient | null {
  if (!quizConfigurado()) return null
  if (!_quiz) _quiz = createClient(process.env.METRICAS_SUPABASE_URL!, process.env.METRICAS_SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } })
  return _quiz
}

/**
 * Sessão do quiz com respostas (qualquer funil), ou null. Chave: o sck do Tag Manager (CL-ES/Hotmart) ou, onde o funil
 * não tem sck (CL-PL na Stripe, 10/11/2026), o id de visitante do próprio quiz (utm._vid), passado como 'vid:<id>'.
 */
export async function buscarRespostasQuiz(sck: string, cliente: SupabaseClient | null = metricas()): Promise<Omit<QuizGuardado, 'em'> | null> {
  if (!cliente || !sck) return null
  const base = cliente.from('quiz_sessoes').select('funil, respostas, respondeu, inicio')
  const filtrada = sck.startsWith('vid:') ? base.eq('utm->>_vid', sck.slice(4)) : base.eq('sck', sck)
  const { data } = await filtrada.eq('respondeu', true).order('inicio', { ascending: false }).limit(1)
  const s = data?.[0]
  if (!s || Object.keys(s.respostas ?? {}).length < 3) return null
  return { sck, funil: s.funil, respostas: s.respostas as Record<string, string> }
}

/** Texto em português para o perfil do agente. null = nada legível. */
export function resumirQuiz(q: { funil: string; respostas: Record<string, string>; em?: string }): string | null {
  const mapa = MAPAS[q.funil]
  if (!mapa) return null
  const linhas: string[] = []
  for (const [tela, resp] of Object.entries(q.respostas)) {
    const m = mapa[tela]
    if (!m || !resp) continue
    const vals = String(resp).split(',').map((id) => m.opcoes[id.trim()] ?? id.trim()).filter(Boolean)
    if (!vals.length) continue
    linhas.push(`${ROTULO[m.key] ?? m.key}: ${vals.join(', ')}`)
  }
  if (!linhas.length) return null
  // IMC quando altura e peso vieram (telas de digitação, gravadas desde 05/11/2026)
  const num = (tela: string) => parseFloat(String(q.respostas[tela] ?? '').replace(',', '.'))
  const alt = num('25'), peso = num('26'), alvo = num('27')
  if (alt > 100 && alt < 230 && peso > 30 && peso < 300) {
    const imc = peso / (alt / 100) ** 2
    linhas.push(`IMC calculado: ${imc.toFixed(1)}${alvo > 30 ? ` · quer chegar a ${alvo} kg (${(peso - alvo).toFixed(1)} kg a menos)` : ''}`)
  }
  return `O QUE ELA RESPONDEU NO QUIZ antes de comprar${q.em ? ` (${q.em.slice(0, 10)})` : ''} — é quem ela é e o que quer; use para entender e personalizar, sem recitar de volta nem dizer "você respondeu no quiz" (só cite se ajudar na resposta):\n- ${linhas.join('\n- ')}`
}

/**
 * Opções marcadas numa pergunta do quiz, achada pela CHAVE (ex.: 'problemas_fisicos'), não pelo nº da tela: cada funil
 * numera do seu jeito. null = o funil não tem mapa, não tem essa pergunta ou ela ficou sem resposta.
 */
export function respostaDoQuiz(q: { funil: string; respostas: Record<string, string> }, chave: string): string[] | null {
  const mapa = MAPAS[q.funil]
  if (!mapa) return null
  const tela = Object.keys(mapa).find((t) => mapa[t].key === chave)
  const resp = tela ? q.respostas[tela] : undefined
  if (!resp) return null
  return String(resp).split(',').map((s) => s.trim()).filter(Boolean)
}

/** Guarda sck e/ou respostas em user_metadata (sem migração; o perfil já lê o metadata). */
export async function guardarQuizNaConta(db: SupabaseClient, userId: string, dados: { sck?: string; quiz?: QuizGuardado }, atual?: Record<string, unknown>): Promise<void> {
  const meta = atual ?? ((await db.auth.admin.getUserById(userId)).data.user?.user_metadata ?? {})
  const novo: Record<string, unknown> = { ...meta }
  if (dados.sck && !meta.sck) novo.sck = dados.sck
  if (dados.quiz) novo.quiz = dados.quiz
  await db.auth.admin.updateUserById(userId, { user_metadata: novo })
}

/**
 * Resumo do quiz para a aluna: do metadata se já guardado; senão busca pelo sck (se houver credencial), guarda e devolve.
 * Nunca lança: sem dado, null.
 */
export async function quizDaAluna(db: SupabaseClient, user: User | null | undefined): Promise<string | null> {
  if (!user) return null
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  const guardado = meta.quiz as QuizGuardado | undefined
  if (guardado?.respostas) return resumirQuiz(guardado)
  const sck = meta.sck as string | undefined
  if (!sck) return null
  try {
    const achado = await buscarRespostasQuiz(sck)
    if (!achado) return null
    const quiz: QuizGuardado = { ...achado, em: new Date().toISOString() }
    await guardarQuizNaConta(db, user.id, { quiz }, meta)
    return resumirQuiz(quiz)
  } catch (err) {
    console.error('[quiz-contexto] falhou:', err)
    return null
  }
}
