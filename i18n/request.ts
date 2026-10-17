import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
import { mensagensDasFichas } from '@/lib/desafios'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !routing.locales.includes(locale as 'pt-BR' | 'es' | 'en')) {
    locale = routing.defaultLocale
  }

  const messages = (await import(`../messages/${locale}.json`)).default
  // Desafios do 6 em diante têm os textos na ficha (lib/desafios), não em messages/
  const fichas = mensagensDasFichas(locale)
  return {
    locale,
    messages: {
      ...messages,
      challengeData: { ...messages.challengeData, ...fichas.challengeData },
      challengeDays: { ...messages.challengeDays, ...fichas.challengeDays },
    },
  }
})
