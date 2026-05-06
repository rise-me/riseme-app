import { mockChallenges } from './mock-challenges'

export type LevelKey = 'beginner' | 'intermediate' | 'advanced'

export interface MockDay {
  day_number: number
  title: string
  duration_minutes: number
  level: LevelKey
  youtube_id?: string
  completed?: boolean
}

const VIDEOS_BY_CHALLENGE: Record<string, string[]> = {
  '1': [
    '9MOWGVPUJSU', 'tzhajbcmXo0', 'B5zFShBvR3E', '-yDswsRCtAY', 'btL5hjOMqvA',
    'HIx7RwKn7Ho', '_yJqpWhSJ_o', 'blrg1GihFsM', 'oLh64RTwLJ8', '3HrvYNw2zfE',
    'g2-eIZEYUmM', 'onfnrSxGH1s', 'S8m5OUFS1p8', 'wZjRnJgqO1A', '4jmcko6l2pg',
    '7XRcR6FLXuo', 'G3bgT83lWns', 'vWGKkeU_daw', 'OLlLHvZJQ_8', 'S8m5OUFS1p8',
    'YxP7prefrLc', 'o80JwtFZLrU', '2UIqNP_xQpQ', 'klZMaePTkE8', 'mgnia_ou09M',
    'JZHCjx50VTI', 'zzaWk-vESIw', 'BiCLBJRDxUI',
  ],
  '2': [
    'dqEYwtpABu4', 'Cxkj5NjF-GE', '9l1wFXyNSNY', 'Cwa3OwaoS9k', '2-wLTw1-pwU',
    '3eXcor6BcO8', 'LnjgdVdaa1U', 'SbX1cbigwu8', 'Mykwu_-aFEs', 'FAqafyWRMNw',
    'QCH3KIui_Vc', 'RhU-Cv1BM4k', 'L5LzHaUA2Eo', '4k87l0K1UjE', 'L4iynQktb04',
    'Ar5loDBkojg', 'd-heyaP2nsk', 'EnXKQqZu3-I', 'm7kKSw-3Dic', 'KUzwEiv5Apc',
    'AUiy0FvW29g', 'i9G6vuL8lJI', 'vdBKg6T8w1w', 'GtQNbW-jrKc', 'dcD7abBq_tM',
    'YteYej7jcN0', 'ASir54tuY4c', 'ihiEhcBDHEE',
  ],
  '3': [
    '0LFpqK3X-Zc', '4-VVU2Mm9uY', 'DWa3J03223s', 'wjjash1gO_c', 'CYBkclmQsj0',
    'cOQkJNPCkas', 'NmR8Blp5aFE', 'uYVaGWPfS9w', 'XN3FVpGt4Hk', '2GsHATqRNG0',
  ],
  '4': [
    'wMUAa_KXcPM', 'F0fYflGTyqc', 'aFkA1FNzqWM', '2d246UNtJTc', 'weXs6kSxnH4',
    '7bw25E3sWak', 'g_ZDZS9OsFE', 'W7sSyow4x-8', 'Cw3Nxqhm5Mw', 'ya6op6CNHyg',
    'pIVjuz2uXqo', 'jUxRkgoIiUo', 'J-0zzYfpRKI', 'tm-lGi8fACg', 'GDYnDuC6Tew',
    'i4MorA8moWw', '62Sfk19hqW0', 'Itd2P7ihlww', 'L827HXW5IWw', 'Y8A2thPg67U',
    'CPEMYkNeNrM', '7h3yMpfTXAI', 'mMJx4Gb3r9M', 'ClLY-O_eTvQ', 'CuCOmCG1pB0',
    '8SnrIRhAX_Y', 'ZlpGIJ9-NOs', 'Svff4vURfHg',
  ],
  '5': [
    'StWXVUs2Axk', 'Icav8fd5zcA', 'C0KLfvnihvY', 'MVsCmwEzMWs', 'sHatA8XCuno',
    '2jcTudsosTk', 'OPiVKJgRddo', 'K6LDoRHBivY', 'fibXIL-gxnI', 'o54F_zCS-jE',
    'hemM3FGk6N4', '_8PceYpgF5o', 'Q5hFbzn9clA', 'ZGb0VcnrPxY', 'G0ZGxC-bBec',
    'PLliEurVYVY', 'sHnNlXVIEmU', '7U7Ub2JuK4A', 'YAm05Ruq4xw', 'e1JcNVonSHo',
    'Lx57YACLafw', 'O0KzkwI9YVY', 'BkoukSqlm9Q', 'h_iuaZtK_88', 'hPvEhSozhMU',
    'ajtIjXIcI_0', 'OIoCOp4bJy0', 'wKN6rQi7m70',
  ],
}

const LEVEL_ROTATION: LevelKey[] = ['beginner', 'beginner', 'intermediate', 'advanced']

export function getMockDays(challengeId: string, dayTitles: string[]): MockDay[] {
  const videos = VIDEOS_BY_CHALLENGE[challengeId] ?? []
  const challenge = mockChallenges.find((c) => c.id === challengeId)
  const daysCount = challenge?.days_count ?? 28

  return Array.from({ length: daysCount }, (_, i) => ({
    day_number: i + 1,
    title: dayTitles[i] ?? `Day ${i + 1}`,
    duration_minutes: [15, 20, 25, 30][i % 4],
    level: LEVEL_ROTATION[i % 4],
    youtube_id: videos[i],
  }))
}
