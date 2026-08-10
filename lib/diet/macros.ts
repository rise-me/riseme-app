// Meta calórica e macros — matemática pura, sem IA (Mifflin-St Jeor + fator de
// atividade + ajuste por objetivo). A IA nunca decide número: garante que o
// cardápio "fecha a conta" sempre. Portado do Salvou (sem a camada GLP-1).
import type { Sex, Objective, ActivityLevel } from './tipos'

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

/** Déficit de 20% pra emagrecer, superávit de 10% pra ganhar, com piso de segurança. */
export function kcalDiaAlvo(p: {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
  activity: ActivityLevel
  objective: Objective
}): number {
  const maintenance = bmr(p.sex, p.weightKg, p.heightCm, p.age) * ACTIVITY_FACTOR[p.activity]
  const factor = p.objective === 'lose' ? 0.8 : p.objective === 'gain' ? 1.1 : 1.0
  const floor = p.sex === 'female' ? 1200 : 1500
  return Math.round(Math.max(maintenance * factor, floor))
}

/** Macros do dia: proteína por kg (1,6 em emagrecimento, senão 1,4), gordura 25%, carbo no resto. */
export function macrosDoDia(kcalDia: number, weightKg: number, objective: Objective) {
  const proteinaPorKg = objective === 'lose' ? 1.6 : 1.4
  const proteina_g = Math.round(weightKg * proteinaPorKg)
  const gordura_g = Math.round((kcalDia * 0.25) / 9)
  const carbo_g = Math.round(Math.max(0, kcalDia - proteina_g * 4 - gordura_g * 9) / 4)
  return { carbo_g, proteina_g, gordura_g }
}
