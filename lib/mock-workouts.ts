export interface MockWorkout {
  id: string
  title: string
  description: string
  emoji: string
  level: 'Iniciante' | 'Intermediário' | 'Avançado'
  lessons_count: number
}

export interface MockWorkoutLesson {
  lesson_number: number
  title: string
  duration_minutes: number
  completed?: boolean
}

export const mockWorkouts: MockWorkout[] = [
  {
    id: 'w1',
    title: 'Treino Express 10 min',
    description: 'Queime calorias rápido sem equipamento',
    emoji: '⚡',
    level: 'Iniciante',
    lessons_count: 6,
  },
  {
    id: 'w2',
    title: 'Alongamento Total',
    description: 'Relaxe e melhore sua flexibilidade',
    emoji: '🌿',
    level: 'Iniciante',
    lessons_count: 5,
  },
  {
    id: 'w3',
    title: 'Core Forte',
    description: 'Fortaleça seu abdômen e lombar',
    emoji: '🔥',
    level: 'Intermediário',
    lessons_count: 8,
  },
]

const lessonsByWorkout: Record<string, MockWorkoutLesson[]> = {
  w1: [
    { lesson_number: 1, title: 'Aquecimento Dinâmico', duration_minutes: 2 },
    { lesson_number: 2, title: 'Agachamentos', duration_minutes: 2 },
    { lesson_number: 3, title: 'Flexão de Braços', duration_minutes: 2 },
    { lesson_number: 4, title: 'Mountain Climbers', duration_minutes: 2 },
    { lesson_number: 5, title: 'Burpees Express', duration_minutes: 1 },
    { lesson_number: 6, title: 'Desaceleração', duration_minutes: 1 },
  ],
  w2: [
    { lesson_number: 1, title: 'Respiração e Centragem', duration_minutes: 3 },
    { lesson_number: 2, title: 'Pescoço e Ombros', duration_minutes: 3 },
    { lesson_number: 3, title: 'Tronco e Lateral', duration_minutes: 3 },
    { lesson_number: 4, title: 'Quadril e Glúteos', duration_minutes: 3 },
    { lesson_number: 5, title: 'Pernas e Isquiotibiais', duration_minutes: 3 },
  ],
  w3: [
    { lesson_number: 1, title: 'Ativação do Core', duration_minutes: 3 },
    { lesson_number: 2, title: 'Prancha Clássica', duration_minutes: 2 },
    { lesson_number: 3, title: 'Prancha Lateral', duration_minutes: 2 },
    { lesson_number: 4, title: 'Abdominal Crunch', duration_minutes: 3 },
    { lesson_number: 5, title: 'Leg Raises', duration_minutes: 3 },
    { lesson_number: 6, title: 'Russian Twist', duration_minutes: 2 },
    { lesson_number: 7, title: 'Bird-Dog', duration_minutes: 3 },
    { lesson_number: 8, title: 'Relaxamento Lombar', duration_minutes: 2 },
  ],
}

export function getMockWorkoutById(id: string): MockWorkout | undefined {
  return mockWorkouts.find((w) => w.id === id)
}

export function getMockWorkoutLessons(workoutId: string): MockWorkoutLesson[] {
  return lessonsByWorkout[workoutId] ?? []
}
