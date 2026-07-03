'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

// hrefs SEM prefixo de locale: /es/admin 307-redireciona pra /admin e o
// redirect no meio da client nav engolia o clique. A UI é PT fixo, então
// o locale da rota não importa.
const tabs = [
  { href: '/admin', label: 'Suporte' },
  { href: '/admin/numeros', label: 'Números' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex gap-2 text-sm font-semibold">
      {tabs.map((tab) => {
        const active = tab.href === '/admin'
          ? /\/admin$/.test(pathname)
          : pathname.endsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'px-3 py-1.5 rounded-full',
              active ? 'bg-foreground text-background' : 'bg-secondary'
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
