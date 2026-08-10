'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { House, Swords, Apple, Sparkles, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

// aba Treinos removida em 2026-07-03 (aulas grátis sem vídeo real) — decisão
// "por enquanto" do Bruno; rotas /workouts redirecionam pra /challenges.
// aba Menú (maçã) adicionada em 2026-08-06 — decisão Bruno: alimentação
// merece porta própria na navegação, não card dentro de Extras.
// aba Plan removida em 2026-08-06 (decisão Bruno: duplicava Desafíos);
// /home redireciona pro Progresso, que virou a tela inicial.
const navItems = [
  { key: 'progress', href: '/progress', icon: House },
  { key: 'challenges', href: '/challenges', icon: Swords },
  { key: 'menu', href: '/menu', icon: Apple },
  { key: 'bonus', href: '/bonus', icon: Sparkles },
  { key: 'more', href: '/more', icon: MoreHorizontal },
] as const

export function BottomNav({ locale }: { locale: string }) {
  const pathname = usePathname()
  const t = useTranslations('nav')

  // players são fullscreen — a nav por cima cobria os controles e roubava toques
  if (pathname.includes('/player/')) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-safe">
      <div className="flex items-stretch h-16 max-w-lg mx-auto">
        {navItems.map(({ key, href, icon: Icon }) => {
          const fullHref = `/${locale}${href}`
          const isActive = pathname.includes(href.split('?')[0])

          return (
            <Link
              key={key}
              href={fullHref}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 transition-colors',
                isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={cn(isActive && 'scale-105 transition-transform')}
              />
              <span className={cn('text-[10px] font-medium', isActive && 'font-semibold')}>
                {t(key)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
