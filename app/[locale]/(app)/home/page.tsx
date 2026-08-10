import { redirect } from 'next/navigation'

// Aba "Plan" removida (decisão Bruno 2026-08-06: só duplicava a aba Desafíos).
// /home segue sendo o destino canônico pós-login em vários fluxos (login,
// /entrar, reset) — redireciona pra tela inicial real, o Progresso.
// O que a tela tinha de vivo mudou de casa: FirstAccessNotice e WaterTracker
// agora moram no /progress.
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  redirect(`/${locale}/progress`)
}
