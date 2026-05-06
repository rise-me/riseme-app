export type ChallengeStatus = 'free' | 'active' | 'locked' | 'completed'

export interface MockChallenge {
  id: string
  title: string
  category: string
  days_count: number
  thumbnail_emoji: string
  is_free: boolean
  status: ChallengeStatus
  current_day?: number
}

export const mockChallenges: MockChallenge[] = [
  {
    id: '1',
    title: 'Calistenia em Casa',
    category: 'Calistenia',
    days_count: 28,
    thumbnail_emoji: '💪',
    is_free: true,
    status: 'active',
    current_day: 3,
  },
  {
    id: '2',
    title: 'Pilates na Parede',
    category: 'Pilates',
    days_count: 28,
    thumbnail_emoji: '🧘‍♀️',
    is_free: false,
    status: 'locked',
  },
  {
    id: '3',
    title: 'Yoga Facial',
    category: 'Yoga',
    days_count: 10,
    thumbnail_emoji: '✨',
    is_free: false,
    status: 'locked',
  },
  {
    id: '4',
    title: 'Yoga na Cadeira',
    category: 'Yoga',
    days_count: 28,
    thumbnail_emoji: '🪑',
    is_free: false,
    status: 'locked',
  },
  {
    id: '5',
    title: 'Corpo Sexy de Verão',
    category: 'Fitness',
    days_count: 28,
    thumbnail_emoji: '🔥',
    is_free: false,
    status: 'locked',
  },
]
