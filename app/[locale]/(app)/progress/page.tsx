import { getAllProgressForUser } from '@/lib/progress-server'
import { getCurrentUser } from '@/lib/current-user-server'
import { fusoDaAluna } from '@/lib/dias'
import { getUserAccess } from '@/lib/user-access-server'
import { CLASE_HOY_IDIOMAS, proximaAula } from '@/lib/proxima-aula'
import { montarClaseDeHoy, treinouHoje } from '@/lib/clase-hoy-server'
import { recursoLigado } from '@/lib/previa'
import { ProgressView } from './ProgressView'

// Tela inicial do app. Aqui só se carregam os dados; o desenho mora em ProgressView.
export default async function ProgressPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const [progress, user, tz, access] = await Promise.all([
    getAllProgressForUser(),
    getCurrentUser(),
    fusoDaAluna(locale),
    getUserAccess(),
  ])

  // "Tu clase de hoy": a tela abre com o botão da próxima aula (lib/proxima-aula.ts)
  const ligado = CLASE_HOY_IDIOMAS.includes(locale.split('-')[0]) && recursoLigado('CLASE_HOY_ATIVO', user?.admin === true)
  const prox = ligado ? proximaAula(progress, access) : null
  const clase = prox ? await montarClaseDeHoy(prox, treinouHoje(progress, tz), locale) : null

  return <ProgressView locale={locale} progress={progress} user={user} tz={tz} clase={clase} />
}
