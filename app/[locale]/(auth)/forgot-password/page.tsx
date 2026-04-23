import Link from 'next/link'
import { ForgotPasswordForm } from './ForgotPasswordForm'

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black tracking-tight">
            Rise<span className="text-sm align-super">Me</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Recupere o acesso à sua conta
          </p>
        </div>
        <ForgotPasswordForm locale={locale} />
        <p className="text-sm text-muted-foreground text-center">
          <Link href={`/${locale}/login`} className="font-semibold text-foreground underline underline-offset-2">
            Voltar para entrar
          </Link>
        </p>
      </div>
    </main>
  )
}
