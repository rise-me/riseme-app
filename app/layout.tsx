import type { Metadata } from 'next'
import { Inter, Mukta } from 'next/font/google'
import './globals.css'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
})

// Escrita devanágari (hindi, CL-HI). Só o subconjunto devanágari: o navegador baixa a fonte apenas quando aparece letra
// hindi na tela (unicode-range), então os outros idiomas não pagam nada. Inter não tem devanágari → cai aqui letra a letra.
const mukta = Mukta({
  variable: '--font-deva',
  subsets: ['devanagari'],
  weight: ['400', '600', '700', '800'],
  preload: false,
})

export const metadata: Metadata = {
  title: 'RiseMe',
  description: 'Desafíos fitness de 28 días para transformar tu cuerpo y tu vida.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RiseMe',
  },
  formatDetection: { telephone: false },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className={`${inter.variable} ${mukta.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#F5F0E8" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
