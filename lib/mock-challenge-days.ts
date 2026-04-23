export interface MockDay {
  day_number: number
  title: string
  duration_minutes: number
  level: 'Iniciante' | 'Intermediário' | 'Avançado'
  completed?: boolean
}

export function getMockDays(challengeId: string): MockDay[] {
  const titles = [
    'Aquecimento e Mobilidade',
    'Força de Braços',
    'Core e Abdômen',
    'Agachamento e Glúteos',
    'Empurrada e Puxada',
    'Cardio Ativo',
    'Recuperação Ativa',
    'Resistência Muscular',
    'Explosão e Potência',
    'Equilíbrio e Estabilidade',
    'Força Total',
    'Intervalado Curto',
    'Pernas e Posterior',
    'Ombros e Trapézio',
    'Core Profundo',
    'Descanso Ativo',
    'Força de Braços II',
    'Glúteos e Posterior',
    'Cardio e Core',
    'Flexibilidade',
    'Força Total II',
    'Potência Muscular',
    'Mobilidade Avançada',
    'Resistência Cardio',
    'Força e Controle',
    'Treino Completo',
    'Desafio Final',
    'Celebração e Recuperação',
  ]

  return titles.map((title, i) => ({
    day_number: i + 1,
    title,
    duration_minutes: [15, 20, 25, 30][i % 4],
    level: (['Iniciante', 'Iniciante', 'Intermediário', 'Avançado'] as const)[i % 4],
    completed: challengeId === '1' && i < 3, // mock: challenge 1 has 3 days done
  }))
}
