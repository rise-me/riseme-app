// Motor de geração do cardápio. A ESTRUTURA é determinística (momentos, kcal
// por momento, macros do dia — lib/diet/macros.ts); a IA só PREENCHE cada
// momento com 3 opções isocalóricas + ingredientes, no idioma da aluna.
// Substituição = escolher outra opção do mesmo horário.
//
// Cada momento é uma chamada Claude separada (2 por vez — mais que isso bate no
// limite de taxa e fica lento). Tolerante a falha parcial: 1 momento ruim não
// derruba o cardápio; só falha se TODOS falharem.
import Anthropic from '@anthropic-ai/sdk'
import {
  MOMENTOS,
  type Momento,
  type Cardapio,
  type PerfilCardapio,
  type RefeicaoPlano,
  type OpcaoRefeicao,
} from './tipos'
import { kcalDiaAlvo, macrosDoDia, nivelAtividade } from './macros'

const CLAUDE_MODEL = 'claude-sonnet-5'

let _client: Anthropic | null = null
function anthropic(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

/** Peso de cada momento na divisão das kcal do dia (normalizado depois). */
const PESO_MOMENTO: Record<Momento, number> = {
  cafe_da_manha: 25,
  lanche_da_manha: 10,
  almoco: 30,
  lanche_da_tarde: 10,
  jantar: 25,
  ceia: 8,
}

const COM_CAFE: Record<number, Momento[]> = {
  3: ['cafe_da_manha', 'almoco', 'jantar'],
  4: ['cafe_da_manha', 'almoco', 'lanche_da_tarde', 'jantar'],
  5: ['cafe_da_manha', 'lanche_da_manha', 'almoco', 'lanche_da_tarde', 'jantar'],
  6: ['cafe_da_manha', 'lanche_da_manha', 'almoco', 'lanche_da_tarde', 'jantar', 'ceia'],
}
const SEM_CAFE: Record<number, Momento[]> = {
  3: ['almoco', 'lanche_da_tarde', 'jantar'],
  4: ['almoco', 'lanche_da_tarde', 'jantar', 'ceia'],
  5: ['lanche_da_manha', 'almoco', 'lanche_da_tarde', 'jantar', 'ceia'],
  6: ['lanche_da_manha', 'almoco', 'lanche_da_tarde', 'jantar', 'ceia'],
}

export function momentosDoCardapio(numRefeicoes: number, incluiCafe: boolean): Momento[] {
  const tabela = incluiCafe ? COM_CAFE : SEM_CAFE
  return tabela[numRefeicoes] ?? tabela[5]
}

/** Rótulos por momento no idioma da aluna (pro prompt; a tela usa i18n). */
const MOMENTO_LABEL: Record<Momento, Record<string, string>> = {
  cafe_da_manha: { es: 'Desayuno', tr: 'Kahvaltı', 'pt-BR': 'Café da manhã', en: 'Breakfast' },
  lanche_da_manha: { es: 'Merienda de la mañana', tr: 'Kuşluk ara öğünü', 'pt-BR': 'Lanche da manhã', en: 'Morning snack' },
  almoco: { es: 'Almuerzo', tr: 'Öğle yemeği', 'pt-BR': 'Almoço', en: 'Lunch' },
  lanche_da_tarde: { es: 'Merienda de la tarde', tr: 'İkindi ara öğünü', 'pt-BR': 'Lanche da tarde', en: 'Afternoon snack' },
  jantar: { es: 'Cena', tr: 'Akşam yemeği', 'pt-BR': 'Jantar', en: 'Dinner' },
  ceia: { es: 'Colación nocturna', tr: 'Gece ara öğünü', 'pt-BR': 'Ceia', en: 'Evening snack' },
}

const IDIOMA: Record<string, string> = {
  es: 'español',
  tr: 'Türkçe (turco)',
  'pt-BR': 'português do Brasil',
  en: 'English (inglês)',
}

function kcalPorMomento(momentos: Momento[], kcalDia: number): Record<string, number> {
  const somaPesos = momentos.reduce((s, m) => s + PESO_MOMENTO[m], 0)
  const out: Record<string, number> = {}
  for (const m of momentos) out[m] = Math.round((PESO_MOMENTO[m] / somaPesos) * kcalDia)
  return out
}

function listaLegivel(keys: string[]): string {
  return keys.length ? keys.map((k) => k.replace(/_/g, ' ')).join(', ') : '—'
}

/** Valida a saída da IA sem dependências: precisa de opcoes[] com os campos certos. */
function parseSaidaMomento(raw: string): OpcaoRefeicao[] {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  const json = JSON.parse(start >= 0 && end >= 0 ? raw.slice(start, end + 1) : raw) as {
    opcoes?: unknown
  }
  if (!Array.isArray(json.opcoes) || json.opcoes.length === 0) throw new Error('sem opcoes')
  const opcoes: OpcaoRefeicao[] = []
  for (const o of json.opcoes.slice(0, 3)) {
    const op = o as Record<string, unknown>
    if (
      typeof op.nome !== 'string' ||
      typeof op.kcal !== 'number' ||
      !Array.isArray(op.ingredientes) ||
      op.ingredientes.length === 0
    ) {
      continue
    }
    opcoes.push({
      nome: op.nome,
      kcal: Math.round(op.kcal),
      proteina_g: Math.round(Number(op.proteina_g) || 0),
      carbo_g: Math.round(Number(op.carbo_g) || 0),
      gordura_g: Math.round(Number(op.gordura_g) || 0),
      ingredientes: (op.ingredientes as Array<Record<string, unknown>>)
        .filter((i) => typeof i.qtd === 'string' && typeof i.item === 'string')
        .map((i) => ({ qtd: i.qtd as string, item: i.item as string })),
    })
  }
  if (opcoes.length === 0) throw new Error('opcoes inválidas')
  return opcoes
}

async function gerarMomento(
  momento: Momento,
  kcalAlvo: number,
  perfil: PerfilCardapio,
  kcalDia: number,
  locale: string,
): Promise<RefeicaoPlano> {
  const idioma = IDIOMA[locale] ?? IDIOMA.es
  const rotulo = MOMENTO_LABEL[momento][locale] ?? MOMENTO_LABEL[momento].es
  const macros = macrosDoDia(kcalDia, perfil.weightKg, perfil.objective)

  const FREQ_DESC: Record<string, string> = {
    none: 'não treina', f1_2: 'treina 1-2x/semana', f3_4: 'treina 3-4x/semana',
    f5_6: 'treina 5-6x/semana', daily: 'treina todos os dias',
  }
  const treino = `${FREQ_DESC[perfil.freqTreino]}, ~${perfil.minutosTreino} min por treino, esforço ${perfil.esforco}`

  const system =
    `Você é um nutricionista que monta refeições equilibradas e realistas para o app RiseMe ` +
    `(público: mulheres que treinam em casa). Baseia-se em boa prática nutricional (proteína ` +
    `suficiente, alimentos de verdade, porções plausíveis) e em pratos CULTURALMENTE comuns no ` +
    `país do idioma pedido. Responde SOMENTE com um objeto JSON válido, sem texto antes ou depois. ` +
    `TODO o conteúdo visível (nomes de refeições e ingredientes) deve estar em ${idioma}.`

  const user =
    `Monte o momento "${rotulo}" de um cardápio de 1 dia. Dê EXATAMENTE 3 opções ISOCALÓRICAS ` +
    `(kcal parecidas entre si, cada uma perto de ${kcalAlvo} kcal) — são substituições equivalentes.\n\n` +
    `Contexto do dia (meta diária: ${kcalDia} kcal · macros-alvo: proteína ${macros.proteina_g} g, ` +
    `carboidrato ${macros.carbo_g} g, gordura ${macros.gordura_g} g). Este momento vale ~${kcalAlvo} kcal.\n` +
    `Objetivo: ${perfil.objective}. Atividade física: ${treino}.\n` +
    `Restrições alimentares: ${listaLegivel(perfil.restricoes)}.\n` +
    `Preferências: ${listaLegivel(perfil.preferencias)}.\n` +
    `Condições de saúde a considerar: ${listaLegivel(perfil.condicoes)}.\n` +
    `Perfil de custo: ${perfil.custo}.\n` +
    `Alimentos que a pessoa ADORA: ${listaLegivel(perfil.adora)} — faça-os aparecer em ALGUMAS opções do dia, ` +
    `no máximo 1 opção por momento; as outras opções ficam SEM eles (variedade importa).\n` +
    `Alimentos que a pessoa NÃO COME DE JEITO NENHUM: ${listaLegivel(perfil.naoCome)}.\n` +
    `Observações da pessoa: ${perfil.observacao?.trim() || '—'}.\n\n` +
    `Respeite as restrições à risca (ex.: vegano não leva carne, ovo, leite nem mel). ` +
    `JAMAIS use os alimentos que a pessoa não come — nem como ingrediente secundário. ` +
    `As opções devem ser adequadas ao momento "${rotulo}". ` +
    `Cada opção precisa de ingredientes com quantidade legível (ex.: "2 unidades", "60 g", "1 xícara (200 ml)").\n\n` +
    `Formato EXATO da resposta:\n` +
    `{"opcoes":[` +
    `{"nome":"...","kcal":0,"proteina_g":0,"carbo_g":0,"gordura_g":0,` +
    `"ingredientes":[{"qtd":"...","item":"..."}]}]}`

  const msg = await anthropic().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    // Sem thinking: pedimos só JSON estruturado. Em modelos com thinking adaptativo
    // ligado por padrão, o pensamento consome o teto de max_tokens e trunca o JSON.
    thinking: { type: 'disabled' },
    system,
    messages: [{ role: 'user', content: user }],
  })
  const text = msg.content.find((c) => c.type === 'text')
  const raw = text && 'text' in text ? text.text : ''
  return { momento, opcoes: parseSaidaMomento(raw) }
}

export async function gerarCardapio(perfil: PerfilCardapio, locale: string): Promise<Cardapio> {
  const activity = nivelAtividade(perfil.freqTreino, perfil.minutosTreino, perfil.esforco)
  const kcalDia = kcalDiaAlvo({ ...perfil, activity })
  const momentos = momentosDoCardapio(perfil.numRefeicoes, perfil.incluiCafe)
  const kcalMom = kcalPorMomento(momentos, kcalDia)

  // No máx. 2 chamadas simultâneas; preserva a ordem do dia; falha parcial tolerada.
  const out: Array<RefeicaoPlano | null> = new Array(momentos.length).fill(null)
  let prox = 0
  async function worker() {
    for (let i = prox++; i < momentos.length; i = prox++) {
      try {
        out[i] = await gerarMomento(momentos[i], kcalMom[momentos[i]], perfil, kcalDia, locale)
      } catch (e) {
        console.error(`[cardapio] momento "${momentos[i]}" falhou:`, e)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(2, momentos.length) }, worker))

  const refeicoes = out.filter((r): r is RefeicaoPlano => r !== null)
  if (refeicoes.length === 0) throw new Error('geração veio sem momentos válidos')

  return {
    kcalDia,
    macros: macrosDoDia(kcalDia, perfil.weightKg, perfil.objective),
    refeicoes,
  }
}

export { MOMENTOS }
