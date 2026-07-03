import { redirect } from 'next/navigation'

// Seção de treinos grátis desativada em 2026-07-03 (aulas sem vídeo real).
// WorkoutDetailClient/WorkoutPlayer ficam no repo pra reativação futura.
export default async function WorkoutsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/challenges`)
}
