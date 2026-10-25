'use client'

import { BottomNav } from '@/components/layout/BottomNav'
import { SplashScreen } from '@/components/layout/SplashScreen'
import { useState, use, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const [showSplash, setShowSplash] = useState(true)
  const router = useRouter()

  // Fuso da aluna p/ o servidor calcular "hoje" e a sequência no dia dela (lib/dias.ts). Mudou → recarrega os dados.
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (!tz || document.cookie.split('; ').includes(`tz=${encodeURIComponent(tz)}`)) return
      document.cookie = `tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`
      router.refresh()
    } catch {}
  }, [router])

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <main className="flex-1 mb-bottom-nav overflow-y-auto">
        {children}
      </main>
      <BottomNav locale={locale} />
    </div>
  )
}
