export type ChallengeStatus = 'free' | 'active' | 'locked' | 'completed'

export interface MockChallenge {
  id: string
  days_count: number
  thumbnail_emoji: string
  is_free: boolean
  status: ChallengeStatus
  current_day?: number
}

export const mockChallenges: MockChallenge[] = [
  {
    id: '1',
    days_count: 28,
    thumbnail_emoji: '💪',
    is_free: false,
    status: 'locked',
  },
  {
    id: '2',
    days_count: 28,
    thumbnail_emoji: '🧘‍♀️',
    is_free: false,
    status: 'locked',
  },
  {
    id: '3',
    days_count: 10,
    thumbnail_emoji: '✨',
    is_free: false,
    status: 'locked',
  },
  {
    id: '4',
    days_count: 28,
    thumbnail_emoji: '🪑',
    is_free: false,
    status: 'locked',
  },
  {
    id: '5',
    days_count: 28,
    thumbnail_emoji: '🔥',
    is_free: false,
    status: 'locked',
  },
]
