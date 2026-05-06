import type { LevelKey } from './mock-challenge-days'

export interface MockWorkout {
  id: string
  emoji: string
  level: LevelKey
  lessons_count: number
}

export interface MockWorkoutLesson {
  lesson_number: number
  duration_minutes: number
  completed?: boolean
}

export const mockWorkouts: MockWorkout[] = [
  { id: 'w1', emoji: '⚡', level: 'beginner', lessons_count: 6 },
  { id: 'w2', emoji: '🌿', level: 'beginner', lessons_count: 5 },
  { id: 'w3', emoji: '🔥', level: 'intermediate', lessons_count: 8 },
]

const LESSON_DURATIONS: Record<string, number[]> = {
  w1: [2, 2, 2, 2, 1, 1],
  w2: [3, 3, 3, 3, 3],
  w3: [3, 2, 2, 3, 3, 2, 3, 2],
}

export function getMockWorkoutById(id: string): MockWorkout | undefined {
  return mockWorkouts.find((w) => w.id === id)
}

export function getMockWorkoutLessons(workoutId: string): MockWorkoutLesson[] {
  const durations = LESSON_DURATIONS[workoutId] ?? []
  return durations.map((duration_minutes, i) => ({
    lesson_number: i + 1,
    duration_minutes,
  }))
}
