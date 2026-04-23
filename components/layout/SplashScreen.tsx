'use client'

import { useEffect, useState } from 'react'

export function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<'visible' | 'fadeout'>('visible')

  useEffect(() => {
    // Show splash for 1.4s, then fade out over 0.4s
    const fadeTimer = setTimeout(() => setPhase('fadeout'), 1400)
    const finishTimer = setTimeout(() => onFinish(), 1800)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(finishTimer)
    }
  }, [onFinish])

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
      style={{
        transition: 'opacity 0.4s ease-out',
        opacity: phase === 'fadeout' ? 0 : 1,
        pointerEvents: 'none',
      }}
    >
      {/* Logo */}
      <div
        style={{
          animation: 'splashScale 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        }}
      >
        <span className="text-5xl font-black tracking-tighter leading-none select-none inline-flex items-baseline">
          Rise<span className="text-xl font-bold leading-none ml-0.5" style={{ verticalAlign: '-0.1em' }}>Me</span>
        </span>
      </div>

      <style>{`
        @keyframes splashScale {
          from { opacity: 0; transform: scale(0.85); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
