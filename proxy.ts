import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

const APP_PATHS = ['/home', '/challenges', '/workouts', '/progress', '/more']

function isAppPath(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/(pt-BR|es|en|tr)/, '')
  return APP_PATHS.some((p) => withoutLocale === p || withoutLocale.startsWith(p + '/'))
}

export async function proxy(request: NextRequest) {
  // Always start with intl middleware so unprefixed paths get rewritten to default locale.
  let response = intlMiddleware(request)

  if (!isAppPath(request.nextUrl.pathname)) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = intlMiddleware(request)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const localeMatch = request.nextUrl.pathname.match(/^\/(pt-BR|es|en|tr)/)
    const locale = localeMatch ? localeMatch[1] : ''
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = locale ? `/${locale}/login` : '/login'
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
}
