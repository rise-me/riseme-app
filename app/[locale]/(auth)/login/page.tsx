import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { LoginForm } from './LoginForm'

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('auth')

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 space-y-8">
      {/* Logo */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-black tracking-tighter inline-flex items-baseline">
          Rise<span className="text-lg font-bold ml-0.5" style={{ verticalAlign: '-0.1em' }}>Me</span>
        </h1>
        <p className="text-sm text-muted-foreground">{t('tagline')}</p>
      </div>

      {/* Form */}
      <LoginForm locale={locale} />

      {/* Signup link */}
      <p className="text-sm text-muted-foreground text-center">
        {t('dontHaveAccount')}{' '}
        <Link href={`/${locale}/signup`} className="font-semibold text-foreground underline underline-offset-2">
          {t('signup')}
        </Link>
      </p>

      {/* Terms */}
      <p className="text-xs text-muted-foreground text-center px-4">
        {t('termsPrefix')}{' '}
        <span className="underline cursor-pointer">{t('termsLink')}</span>
        {' '}{t('andText')}{' '}
        <span className="underline cursor-pointer">{t('privacyLink')}</span>
      </p>
    </div>
  )
}
