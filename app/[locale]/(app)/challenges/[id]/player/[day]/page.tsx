import { mockChallenges } from '@/lib/mock-challenges'
import { getMockDays } from '@/lib/mock-challenge-days'
import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { VideoPlayer } from './VideoPlayer'
import { canAccessChallenge, getUserAccess } from '@/lib/user-access-server'
import { getProgressForChallenge } from '@/lib/progress-server'
import { signLessonPath } from '@/lib/hls-token'
import { getCurrentUser } from '@/lib/current-user-server'
import { recursoLigado } from '@/lib/previa'
import { aulasSuaveDisponiveis } from '@/lib/cuidado-server'

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; day: string }>
}) {
  const { locale, id, day } = await params
  const challenge = mockChallenges.find((c) => c.id === id)
  if (!challenge) notFound()

  const access = await getUserAccess()
  if (!canAccessChallenge(id, access)) {
    redirect(`/${locale}/challenges/${id}`)
  }

  const tDays = await getTranslations('challengeDays')
  const dayTitles = (tDays.raw(id) as string[] | undefined) ?? []

  const days = getMockDays(id, dayTitles, locale)
  const dayNumber = parseInt(day)
  const currentDay = days.find((d) => d.day_number === dayNumber)
  if (!currentDay) notFound()

  // Trava sequencial no servidor: URL direta /player/28 não pula a fila.
  // Um dia só abre se for o 1 ou se o anterior estiver concluído.
  if (dayNumber > 1) {
    const progress = await getProgressForChallenge(id)
    const completed = new Set(progress.map((p) => p.day_number))
    if (!completed.has(dayNumber - 1)) {
      redirect(`/${locale}/challenges/${id}`)
    }
  }

  // Aula no R2: passe assinado só depois das travas de acesso acima
  const hlsPath = currentDay.video?.provider === 'hls' ? signLessonPath(currentDay.video.id) : null

  // "¿Cómo te fue hoy?" no fim da aula: es + pl, desligado para as alunas até COMO_TE_FUE_ATIVO=1 (admin vê)
  const user = await getCurrentUser()
  const esPl = ['es', 'pl'].includes(locale.split('-')[0])
  const perguntar = esPl && recursoLigado('COMO_TE_FUE_ATIVO', user?.admin === true)
  // Conquista nos dias 3/7/14/21: desligada até CONQUISTA_ATIVO=1 (admin vê)
  const conquistas = esPl && recursoLigado('CONQUISTA_ATIVO', user?.admin === true)
  const suaveHref = perguntar && (await aulasSuaveDisponiveis(access, locale)) > 0 ? `/${locale}/cuidado/suave` : null

  return (
    <VideoPlayer
      challenge={challenge}
      days={days}
      currentDayNumber={dayNumber}
      locale={locale}
      hasPase={access.hasActiveSubscription}
      hlsPath={hlsPath}
      perguntar={perguntar}
      conquistas={conquistas}
      userId={user?.id ?? null}
      suaveHref={suaveHref}
    />
  )
}
