import { notFound, redirect } from 'next/navigation'
import { VideoPlayer } from '../../../../challenges/[id]/player/[day]/VideoPlayer'
import { getUserAccess } from '@/lib/user-access-server'
import { signLessonPath } from '@/lib/hls-token'
import { aulasComoDias, aulasDoCuidado, ehTipoCuidado } from '@/lib/cuidado'
import { podeVerCuidado, progressoDoCuidado } from '@/lib/cuidado-server'
import type { MockChallenge } from '@/lib/mock-challenges'

// Player das aulas do "Tu cuidado": o mesmo do desafio, sem trava de ordem e sem oferta do Pase.
export default async function CuidadoPlayerPage({
  params,
}: {
  params: Promise<{ locale: string; tipo: string; n: string }>
}) {
  const { locale, tipo, n } = await params
  if (!ehTipoCuidado(tipo)) notFound()
  const base = `/${locale}/cuidado/${tipo}`
  const access = await getUserAccess()
  if (!(await podeVerCuidado(access, locale, tipo))) redirect(`/${locale}/challenges`)

  const days = aulasComoDias(aulasDoCuidado(tipo, locale), await progressoDoCuidado())
  const numero = parseInt(n)
  const atual = days.find((d) => d.day_number === numero)
  if (!atual) redirect(base)

  // Aula no R2: passe assinado só depois da conferência de acesso acima
  const hlsPath = atual.video?.provider === 'hls' ? signLessonPath(atual.video.id) : null
  const pseudo: MockChallenge = {
    id: `cuidado-${tipo}`,
    days_count: days.length,
    thumbnail_emoji: tipo === 'rodillas' ? '🦵' : '🌿',
    is_free: false,
    status: 'active',
  }
  return (
    <VideoPlayer
      challenge={pseudo}
      days={days}
      currentDayNumber={numero}
      locale={locale}
      hasPase={access.hasActiveSubscription}
      hlsPath={hlsPath}
      basePath={base}
      semOferta
    />
  )
}
