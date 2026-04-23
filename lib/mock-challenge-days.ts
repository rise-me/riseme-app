export interface MockDay {
  day_number: number
  title: string
  duration_minutes: number
  level: 'Iniciante' | 'Intermediário' | 'Avançado'
  youtube_id?: string
  completed?: boolean
}

const CALISTENIA_VIDEOS: string[] = [
  '9MOWGVPUJSU', 'tzhajbcmXo0', 'B5zFShBvR3E', '-yDswsRCtAY', 'btL5hjOMqvA',
  'HIx7RwKn7Ho', '_yJqpWhSJ_o', 'blrg1GihFsM', 'oLh64RTwLJ8', '3HrvYNw2zfE',
  'g2-eIZEYUmM', 'onfnrSxGH1s', 'S8m5OUFS1p8', 'wZjRnJgqO1A', '4jmcko6l2pg',
  '7XRcR6FLXuo', 'G3bgT83lWns', 'vWGKkeU_daw', 'OLlLHvZJQ_8', 'S8m5OUFS1p8',
  'YxP7prefrLc', 'o80JwtFZLrU', '2UIqNP_xQpQ', 'klZMaePTkE8', 'mgnia_ou09M',
  'JZHCjx50VTI', 'zzaWk-vESIw', 'BiCLBJRDxUI',
]

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
    youtube_id: challengeId === '1' ? CALISTENIA_VIDEOS[i] : undefined,
  }))
}
