import Link from 'next/link'
import { SignupForm } from './SignupForm'

export default async function SignupPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 space-y-8">
      {/* Logo */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tighter inline-flex items-baseline">
          Rise<span className="text-lg font-bold ml-0.5" style={{ verticalAlign: '-0.1em' }}>Me</span>
        </h1>
        <p className="text-sm text-muted-foreground">Crie sua conta grátis</p>
      </div>

      {/* Form */}
      <SignupForm locale={locale} />

      {/* Login link */}
      <p className="text-sm text-muted-foreground text-center">
        Já tem uma conta?{' '}
        <Link href={`/${locale}/login`} className="font-semibold text-foreground underline underline-offset-2">
          Entrar
        </Link>
      </p>

      {/* Terms */}
      <p className="text-xs text-muted-foreground text-center px-4">
        Ao criar sua conta, você concorda com os{' '}
        <span className="underline cursor-pointer">Termos de Uso</span>
        {' '}e a{' '}
        <span className="underline cursor-pointer">Política de Privacidade</span>
      </p>
    </div>
  )
}
