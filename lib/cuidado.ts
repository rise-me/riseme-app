// "Tu cuidado": aulas de PRESENTE para quem disse que tem dor no joelho ou nas costas (Bruno, 11–12/11/2026).
// Nada do desafio comprado muda; a aba aparece dentro de QUALQUER desafio que ela tenha. Fonte única das listas
// e da regra de quem recebe. Plano e decisões: docs/plano-personalizado.md.
//
// Quem recebe: user_metadata.cuidado (resposta da pergunta no app) ou, sem ela, a pergunta 'problemas_fisicos' do
// quiz da compra (user_metadata.quiz, guardado pelo webhook). Nenhum dos dois → o app pergunta no desafio.
// Aula só aparece se existir no idioma da aluna (sem cair em outro idioma). Idiomas ligados: CUIDADO_IDIOMAS.
import { videoNoIdioma, type LessonVideo, type MockDay } from './mock-challenge-days'
import { respostaDoQuiz, type QuizGuardado } from './quiz-contexto'
import { recursoLigado } from './previa'

export type TipoCuidado = 'rodillas' | 'espalda'
export const TIPOS_CUIDADO: TipoCuidado[] = ['rodillas', 'espalda']

// ES e PL primeiro (Bruno 11/11). Outro idioma entra quando as aulas e os textos dele existirem.
export const CUIDADO_IDIOMAS = ['es', 'pl']

type Idioma = 'es' | 'pl' | 'en'
// Onde a aula acontece (vira 1 linha simples na tela) e o que ela pede que nem toda casa tem (vira a linha de
// alternativa, Bruno 11/11: "pode ser que a pessoa tenha"). Cadeira, sofá, cama e parede toda casa tem.
type Lugar = 'silla' | 'sofa' | 'cama'
type Equipo = 'rodillo' | 'tobillera'

interface AulaCuidado {
  codigo: string // código da leitura do Subidor (RESUMO.md / RESUMO-RODILLAS.md)
  // Onde o vídeo mora: desafio e dia no registro de aulas (lib/hls-lessons.json; o 4 também no YouTube em ES)
  desafio: string
  dia: number
  // Idioma cujo vídeo mora em OUTRO lugar (ioga na cadeira: ES no desafio 4, PL no 17). O progresso segue desafio/dia.
  porIdioma?: Partial<Record<Idioma, { desafio: string; dia: number }>>
  titulo: Record<Idioma, string>
  lugar?: Lugar
  equipo?: Equipo[]
  rodillasEnElSuelo?: boolean // apoia os joelhos no chão → dica da toalha
}

// Ids dos módulos no registro do R2 (combinado com o Subidor de aulas): 11 Costas · 12 Alívio das Costas ·
// 13 Menisco · 14 Osteoartrite · 15 Ioga no Sofá · 16 Ioga na Cama · 17 Ioga na Cadeira só PL (confirmados 12/11).
// A ioga na cadeira é o desafio 4 do app (mesmas aulas): ES vem do YouTube do 4; o PL fica no 17, e não no 4, para
// não mudar o áudio de quem comprou o "Yoga en la Silla" (o 4 com R2 em inglês tiraria o espanhol do YouTube).
// Títulos = nomes.{en,es,pl}.tsv do Subidor (revisão nativa, 12/11; sem promessa médica). ES da ioga é nosso.
// ORDEM = ordem aprovada pelo Bruno (12/11). A posição na lista é só a ordem na tela: o progresso usa desafio+dia.
const AULAS: Record<TipoCuidado, AulaCuidado[]> = {
  espalda: [
    { codigo: 'A01', desafio: '12', dia: 1, equipo: ['rodillo'],
      titulo: { es: 'Libera la flexibilidad de tu columna', pl: 'Uwolnij elastyczność kręgosłupa', en: "Unlock Your Spine's Flexibility" } },
    { codigo: 'A02', desafio: '12', dia: 2, lugar: 'silla',
      titulo: { es: 'Movilidad en la silla', pl: 'Mobilność na krześle', en: 'Chair Mobility Flow' } },
    { codigo: 'A03', desafio: '12', dia: 3, lugar: 'silla', equipo: ['rodillo'], rodillasEnElSuelo: true,
      titulo: { es: 'Movilidad de espalda de pie', pl: 'Mobilność pleców na stojąco', en: 'Standing Back Mobility' } },
    { codigo: 'C09', desafio: '11', dia: 9, rodillasEnElSuelo: true,
      titulo: { es: 'Core de bajo impacto', pl: 'Trening brzucha o niskim obciążeniu', en: 'Low-Impact Core Workout' } },
    { codigo: 'C11', desafio: '11', dia: 11,
      titulo: { es: 'Fuerza de core y estabilidad', pl: 'Wzmacnianie brzucha i stabilizacja', en: 'Core Strength & Stability' } },
    { codigo: 'C12', desafio: '11', dia: 12,
      titulo: { es: 'Tonificación de cuerpo completo', pl: 'Ujędrnianie całego ciała', en: 'Full-Body Toning Workout' } },
  ],
  rodillas: [
    // Parte 1 · alívio (sentada ou deitada, iniciante)
    { codigo: 'Y01', desafio: '4', dia: 1, porIdioma: { pl: { desafio: '17', dia: 1 } }, lugar: 'silla',
      titulo: { es: 'Yoga relajante en la silla', pl: 'Regenerująca joga na krześle', en: 'Restorative Chair Yoga' } },
    { codigo: 'Y02', desafio: '4', dia: 2, porIdioma: { pl: { desafio: '17', dia: 2 } }, lugar: 'silla',
      titulo: { es: 'Yoga en la silla para tus articulaciones', pl: 'Joga na krześle dla stawów', en: 'Chair Yoga for Joints' } },
    { codigo: 'Y04', desafio: '4', dia: 4, porIdioma: { pl: { desafio: '17', dia: 4 } }, lugar: 'silla',
      titulo: { es: 'Piernas en movimiento suave en la silla', pl: 'Łagodny trening nóg na krześle', en: 'Gentle Chair Leg Flow' } },
    { codigo: 'M01', desafio: '13', dia: 1, lugar: 'silla', equipo: ['rodillo', 'tobillera'],
      titulo: { es: 'Comienza a cuidar tu rodilla', pl: 'Zacznij dbać o kolano', en: 'Start Caring for Your Knee' } },
    { codigo: 'O02', desafio: '14', dia: 2, lugar: 'silla', equipo: ['tobillera'],
      titulo: { es: 'Libera el movimiento de tus rodillas', pl: 'Uwolnij ruch w kolanach', en: 'Unlock Knee Movement' } },
    { codigo: 'O01', desafio: '14', dia: 1, lugar: 'silla', equipo: ['rodillo', 'tobillera'],
      titulo: { es: 'Serie suave para tus rodillas', pl: 'Łagodna seria dla kolan', en: 'Gentle Knee Series' } },
    { codigo: 'Y17', desafio: '4', dia: 17, porIdioma: { pl: { desafio: '17', dia: 17 } }, lugar: 'silla',
      titulo: { es: 'Tronco y caderas en movimiento en la silla', pl: 'Tułów i biodra w ruchu na krześle', en: 'Chair Flow for Torso and Hips' } },
    // Parte 2 · movimento suave (no sofá ou na cama, sem descer ao chão)
    { codigo: 'S03', desafio: '15', dia: 3, lugar: 'sofa',
      titulo: { es: 'Libera las caderas rígidas', pl: 'Rozluźnij sztywne biodra', en: 'Release Stiff Hips' } },
    { codigo: 'S05', desafio: '15', dia: 5, lugar: 'sofa',
      titulo: { es: 'Activa a cualquier edad', pl: 'Aktywna w każdym wieku', en: 'Active at Any Age' } },
    { codigo: 'K02', desafio: '16', dia: 2, lugar: 'cama',
      titulo: { es: 'Flujo sin estrés de cuerpo completo', pl: 'Spokojny ruch dla całego ciała', en: 'Stress-Free Full-Body Flow' } },
    { codigo: 'S10', desafio: '15', dia: 10, lugar: 'sofa',
      titulo: { es: 'Maestras de la movilidad', pl: 'Mistrzynie mobilności', en: 'Mobility Masters' } },
    { codigo: 'K12', desafio: '16', dia: 12, lugar: 'cama',
      titulo: { es: 'Columna en movimiento, piernas firmes', pl: 'Kręgosłup w ruchu, mocne nogi', en: 'Mobile Spine, Strong Legs' } },
  ],
}

export function ehTipoCuidado(s: string): s is TipoCuidado {
  return (TIPOS_CUIDADO as string[]).includes(s)
}

/** O que a aluna tem marcado. */
export interface CuidadoDaAluna {
  rodillas: boolean
  espalda: boolean
  origem: 'pergunta' | 'quiz'
  avisado: boolean // já viu o aviso "🎁 Un regalo para ti"
}

/** Formato gravado em user_metadata.cuidado (pelo app, na resposta da pergunta e no aviso visto). */
export interface CuidadoGravado {
  rodillas: boolean
  espalda: boolean
  origem: 'pergunta' | 'quiz'
  em: string
  avisado?: boolean
}

/** null = não sabemos (sem resposta no app nem no quiz): o app pergunta. */
export function cuidadoDaAluna(meta: Record<string, unknown> | null | undefined): CuidadoDaAluna | null {
  const gravado = meta?.cuidado as CuidadoGravado | undefined
  if (gravado && typeof gravado.rodillas === 'boolean') {
    return { rodillas: gravado.rodillas, espalda: gravado.espalda === true, origem: gravado.origem ?? 'pergunta', avisado: gravado.avisado === true }
  }
  const quiz = meta?.quiz as QuizGuardado | undefined
  const marcas = quiz?.respostas ? respostaDoQuiz(quiz, 'problemas_fisicos') : null
  if (!marcas) return null
  return { rodillas: marcas.includes('rodillas_sensibles'), espalda: marcas.includes('espalda_sensible'), origem: 'quiz', avisado: false }
}

/**
 * A aba existe para esta aluna? Ligada só com CUIDADO_ATIVO=1 (o Bruno libera depois de ver as telas) ou para
 * admin (prévia em produção). Presente de quem COMPROU: Pase ou qualquer desafio (canAccessBonuses).
 */
export function cuidadoLigado(opts: { admin: boolean; comprou: boolean; locale: string }): boolean {
  // Admin vê mesmo sem compra (contas de teste da equipe não têm desafio comprado)
  if (!opts.comprou && !opts.admin) return false
  if (!CUIDADO_IDIOMAS.includes(opts.locale.split('-')[0])) return false
  return recursoLigado('CUIDADO_ATIVO', opts.admin)
}

export interface AulaNaTela {
  n: number // posição na lista (1..)
  codigo: string
  titulo: string
  minutos?: number
  segundos?: number
  video: LessonVideo
  lugar?: Lugar
  equipo: Equipo[]
  rodillasEnElSuelo: boolean
  progresso: { challengeId: string; dayNumber: number }
}

// Chave de progresso por aula, estável mesmo se a lista mudar de ordem: user_progress aceita challenge_id texto.
export function chaveProgresso(a: { desafio: string; dia: number }) {
  return { challengeId: `cuidado:${a.desafio}`, dayNumber: a.dia }
}

/**
 * Aulas do tipo que existem no idioma dela, na ordem aprovada. `simular` (só a prévia de desenvolvimento) inclui as
 * que ainda não subiram, com um vídeo vazio, para ver a tela cheia.
 */
export function aulasDoCuidado(tipo: TipoCuidado, locale: string, simular = false): AulaNaTela[] {
  const lang = locale.split('-')[0]
  const idioma: Idioma = lang === 'es' || lang === 'pl' ? lang : 'en'
  const lista: AulaNaTela[] = []
  for (const a of AULAS[tipo]) {
    const fonte = a.porIdioma?.[idioma] ?? a
    const v = videoNoIdioma(fonte.desafio, fonte.dia, locale) ?? (simular ? { video: { provider: 'hls' as const, id: '' }, seconds: 20 * 60 } : null)
    if (!v) continue
    lista.push({
      n: lista.length + 1,
      codigo: a.codigo,
      titulo: a.titulo[idioma],
      segundos: v.seconds,
      minutos: v.seconds ? Math.max(1, Math.round(v.seconds / 60)) : undefined,
      video: v.video,
      lugar: a.lugar,
      equipo: a.equipo ?? [],
      rodillasEnElSuelo: a.rodillasEnElSuelo === true,
      progresso: chaveProgresso(a),
    })
  }
  return lista
}

/** As aulas no formato do player do app (day_number = posição na lista). */
export function aulasComoDias(aulas: AulaNaTela[], feitas: Set<string>): MockDay[] {
  return aulas.map((a) => ({
    day_number: a.n,
    title: a.titulo,
    duration_seconds: a.segundos,
    duration_minutes: a.minutos,
    video: a.video,
    completed: feitas.has(`${a.progresso.challengeId}/${a.progresso.dayNumber}`),
    progresso: a.progresso,
  }))
}

/** Prefixo das chaves de progresso do cuidado (para separar dos desafios nas telas de progresso). */
export const PREFIXO_PROGRESSO_CUIDADO = 'cuidado:'
