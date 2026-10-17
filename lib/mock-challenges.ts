import { FICHAS, diasDaFicha } from './desafios'
import esMessages from '../messages/es.json'

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
  // Do 6 em diante: lib/desafios (uma ficha por desafio)
  ...FICHAS.map((f): MockChallenge => ({
    id: f.id,
    days_count: diasDaFicha(f),
    thumbnail_emoji: f.emoji,
    is_free: f.gratis,
    status: 'locked',
  })),
]

// Nome em espanhol, para as ferramentas internas (admin, agente do WhatsApp).
// Fonte única: antes cada uma tinha a sua lista copiada.
export function challengeNameEs(id: string, withEmoji = false): string | undefined {
  const ficha = FICHAS.find((f) => f.id === id)
  const legacy = (esMessages.challengeData as Record<string, { title: string }>)[id]
  const title = ficha ? (ficha.titulo.es ?? ficha.titulo[ficha.idiomas[0]]) : legacy?.title
  if (!title) return undefined
  const emoji = mockChallenges.find((c) => c.id === id)?.thumbnail_emoji
  return withEmoji && emoji ? `${emoji} ${title}` : title
}
