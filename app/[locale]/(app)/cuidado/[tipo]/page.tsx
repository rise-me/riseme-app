import { notFound, redirect } from 'next/navigation'
import { getUserAccess } from '@/lib/user-access-server'
import { aulasDoCuidado, ehTipoCuidado } from '@/lib/cuidado'
import { podeVerCuidado, progressoDoCuidado } from '@/lib/cuidado-server'
import { CuidadoClient } from './CuidadoClient'

// "Tu cuidado": lista das aulas de presente (lib/cuidado.ts). Sem trava de ordem: ela faz quando e qual quiser.
export default async function CuidadoPage({ params }: { params: Promise<{ locale: string; tipo: string }> }) {
  const { locale, tipo } = await params
  if (!ehTipoCuidado(tipo)) notFound()
  const access = await getUserAccess()
  if (!(await podeVerCuidado(access, locale, tipo))) redirect(`/${locale}/challenges`)

  const feitas = await progressoDoCuidado()
  const aulas = aulasDoCuidado(tipo, locale).map((a) => ({
    ...a,
    feita: feitas.has(`${a.progresso.challengeId}/${a.progresso.dayNumber}`),
  }))
  return <CuidadoClient tipo={tipo} aulas={aulas} locale={locale} />
}
