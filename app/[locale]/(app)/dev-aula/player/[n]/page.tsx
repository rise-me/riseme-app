import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { VideoPlayer } from '../../../challenges/[id]/player/[day]/VideoPlayer'
import { Conquista } from '@/components/challenges/Conquista'
import { mockChallenges } from '@/lib/mock-challenges'
import { getMockDays } from '@/lib/mock-challenge-days'

// SÓ NO COMPUTADOR (npm run dev), em /dev-aula/player/<dia> (o "/player/" esconde a barra de baixo, como no app):
// a tela do player com a aula já concluída ("¿Cómo te fue hoy?"); ?conquista=1 abre a tela de conquista do dia
// (3, 7, 14 ou 21) por cima. 404 em produção.
export default async function DevAula({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; n: string }>
  searchParams: Promise<Record<string, string | undefined>>
}) {
  if (process.env.NODE_ENV !== 'development') notFound()
  const { locale, n } = await params
  const conquista = Boolean((await searchParams).conquista)
  const dia = parseInt(n) || 3
  const tDays = await getTranslations('challengeDays')
  const days = getMockDays('1', (tDays.raw('1') as string[]) ?? [], locale).map((d) => ({ ...d, video: undefined }))
  const challenge = mockChallenges.find((c) => c.id === '1')!
  return (
    <>
      <VideoPlayer challenge={challenge} days={days} currentDayNumber={dia} locale={locale} hasPase hlsPath={null} perguntar previaConcluida suaveHref={`/${locale}/dev-cuidado?tela=lista&tipo=suave&simula=1`} />
      {conquista && <ConquistaPrevia dia={dia} locale={locale} />}
    </>
  )
}

function ConquistaPrevia({ dia, locale }: { dia: number; locale: string }) {
  return <Conquista challengeId="1" dia={dia} locale={locale} userId="00000000-0000-0000-0000-000000000000"/>
}
