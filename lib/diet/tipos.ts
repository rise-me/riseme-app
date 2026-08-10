// Contrato de dados do CARDÁPIO PERSONALIZADO. Portado do motor do Salvou
// (~/Produtos/salvou/src/lib/diet) em 2026-08-06 e adaptado ao RiseMe:
// 4 idiomas (es/tr/pt-BR/en) e sem a camada GLP-1. Se o motor evoluir num dos
// produtos, avaliar levar pro outro — a lógica é irmã, não compartilhada.

export type Sex = 'female' | 'male'
export type Objective = 'lose' | 'maintain' | 'gain'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

/** Momentos do dia, na ordem em que aparecem no cardápio. */
export const MOMENTOS = [
  'cafe_da_manha',
  'lanche_da_manha',
  'almoco',
  'lanche_da_tarde',
  'jantar',
  'ceia',
] as const
export type Momento = (typeof MOMENTOS)[number]

/** Restrições alimentares (multi). */
export const RESTRICOES = [
  'vegetariano',
  'vegano',
  'sem_gluten',
  'sem_lactose',
  'sem_acucar_refinado',
  'low_carb',
  'halal',
] as const
export type Restricao = (typeof RESTRICOES)[number]

/** Preferências de alimentação (multi). */
export const PREFERENCIAS = [
  'frango',
  'peixe',
  'carne_vermelha',
  'ovos',
  'leguminosas',
  'evita_fritura',
  'refeicoes_rapidas',
] as const
export type Preferencia = (typeof PREFERENCIAS)[number]

/** Condições de saúde a considerar (multi). */
export const CONDICOES = [
  'diabetes',
  'hipertensao',
  'colesterol_alto',
  'refluxo',
  'intolerancias',
] as const
export type Condicao = (typeof CONDICOES)[number]

/** Perfil de custo dos ingredientes. */
export type Custo = 'barata' | 'moderada' | 'cara'

export interface Ingrediente {
  qtd: string // "2 unidades", "60 g"
  item: string
}

/** Uma OPÇÃO de refeição (isocalórica com as outras do mesmo momento). */
export interface OpcaoRefeicao {
  nome: string
  kcal: number
  proteina_g: number
  carbo_g: number
  gordura_g: number
  ingredientes: Ingrediente[]
}

export interface RefeicaoPlano {
  momento: Momento
  opcoes: OpcaoRefeicao[]
}

export interface MacrosPlano {
  carbo_g: number
  proteina_g: number
  gordura_g: number
}

/** O cardápio completo — o que vive em diet_menus.menu (jsonb). */
export interface Cardapio {
  kcalDia: number
  macros: MacrosPlano
  refeicoes: RefeicaoPlano[]
}

/** Dados que a aluna preenche no formulário (uma tela). */
export interface PerfilCardapio {
  sex: Sex
  age: number
  weightKg: number
  heightCm: number
  activity: ActivityLevel
  objective: Objective
  numRefeicoes: 3 | 4 | 5 | 6
  incluiCafe: boolean
  restricoes: Restricao[]
  preferencias: Preferencia[]
  condicoes: Condicao[]
  custo: Custo
  observacao: string
}
