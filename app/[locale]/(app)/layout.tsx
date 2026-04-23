'use client'

import { BottomNav } from '@/components/layout/BottomNav'
import { SplashScreen } from '@/components/layout/SplashScreen'
import { useState, use } from 'react'

export default function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = use(params)
  const [showSplash, setShowSplash] = useState(true)

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
