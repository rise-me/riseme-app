'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { CalendarDays, TrendingUp, Dumbbell, Swords, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { key: 'plan', href: '/home', icon: CalendarDays },
  { key: 'progress', href: '/progress', icon: TrendingUp },
  { key: 'workouts', href: '/workouts', icon: Dumbbell },
  { key: 'challenges', href: '/challenges', icon: Swords },
  { key: 'more', href: '/more', icon: MoreHorizontal },
] as const

export function BottomNav({ locale }: { locale: string }) {
  const pathname = usePathname()
  const t = useTranslations('nav')

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
