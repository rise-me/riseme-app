import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { VideoPlayer } from '../../../challenges/[id]/player/[day]/VideoPlayer'
import { mockChallenges } from '@/lib/mock-challenges'
import { getMockDays } from '@/lib/mock-challenge-days'

// SÓ NO COMPUTADOR (npm run dev), em /dev-aula/player/1 (o "/player/" esconde a barra de baixo, como no app): a tela do player com a aula já concluída, para ver o "¿Cómo te fue hoy?". 404 em produção.
export default async function DevAula({ params }: { params: Promise<{ locale: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { locale } = await params
  const tDays = await getTranslations('challengeDays')
  const days = getMockDays('1', (tDays.raw('1') as string[]) ?? [], locale).map((d) => ({ ...d, video: undefined }))
  const challenge = mockChallenges.find((c) => c.id === '1')!
  return <VideoPlayer challenge={challenge} days={days} currentDayNumber={3} locale={locale} hasPase hlsPath={null} perguntar previaConcluida />
}
