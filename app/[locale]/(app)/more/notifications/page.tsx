'use client'

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const NOTIFICATIONS = [
  {
    id: 'daily',
    title: 'Lembrete diário de treino',
    description: 'Receba um lembrete para não perder seu streak',
    defaultOn: true,
  },
  {
    id: 'achievements',
    title: 'Conquistas',
    description: 'Notificações quando desbloquear badges',
    defaultOn: true,
  },
  {
    id: 'new_challenges',
    title: 'Novos desafios',
    description: 'Aviso quando novos desafios forem adicionados',
    defaultOn: false,
  },
  {
    id: 'tips',
    title: 'Dicas de bem-estar',
    description: 'Dicas semanais para potencializar seus resultados',
    defaultOn: false,
  },
]

export default function NotificationsPage() {
  const params = useParams()
  const locale = params.locale as string
  const [states, setStates] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATIONS.map((n) => [n.id, n.defaultOn]))
  )

  function toggle(id: string) {
    setStates((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/more`}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold">Notificações</h1>
      </div>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        {NOTIFICATIONS.map((item) => (
          <div key={item.id} className="flex items-center gap-4 px-4 py-4 pr-5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
            <button
              onClick={() => toggle(item.id)}
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors flex-shrink-0',
                states[item.id] ? 'bg-foreground' : 'bg-border'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform',
                  states[item.id] ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center px-4">
        As preferências de notificação serão salvas automaticamente.
      </p>
    </div>
  )
}
