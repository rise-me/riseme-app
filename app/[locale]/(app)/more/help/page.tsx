import { ArrowLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const HELP_ITEMS = [
  { emoji: '💪', label: 'Dúvidas sobre os treinos' },
  { emoji: '💡', label: 'Sugestões de melhorias' },
  { emoji: '💳', label: 'Perguntas sobre faturamento' },
  { emoji: '🔧', label: 'Problemas técnicos' },
  { emoji: '🔄', label: 'Gerenciar assinatura' },
  { emoji: '✍️', label: 'Outras perguntas' },
]

export default async function HelpPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

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
        <h1 className="text-xl font-bold">Ajuda</h1>
      </div>

      {/* Info banner */}
      <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3 flex items-start gap-3">
        <span className="text-orange-500 text-sm mt-0.5">ⓘ</span>
        <p className="text-xs text-orange-700 leading-relaxed">
          Você receberá uma cópia da sua mensagem por e-mail após o envio.
        </p>
      </div>

      {/* Help items */}
      <div className="space-y-2">
        {HELP_ITEMS.map((item) => (
          <button
            key={item.label}
            className="w-full flex items-center gap-4 bg-card border border-border rounded-2xl px-4 py-4 text-left active:bg-secondary/50 transition-colors"
          >
            <span className="text-xl flex-shrink-0">{item.emoji}</span>
            <span className="flex-1 text-sm font-medium">{item.label}</span>
            <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
