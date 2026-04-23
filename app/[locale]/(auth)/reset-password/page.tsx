import { ResetPasswordForm } from './ResetPasswordForm'

export default async function ResetPasswordPage({
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
            Defina sua nova senha
          </p>
        </div>
        <ResetPasswordForm locale={locale} />
      </div>
    </main>
  )
}
