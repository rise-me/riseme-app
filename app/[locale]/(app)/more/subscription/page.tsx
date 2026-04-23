import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react'
import Link from 'next/link'

const BENEFITS = [
  'Acesso a todos os desafios de 28 dias',
  'Calistenia, Pilates, Yoga, HIIT e mais',
  'Progresso salvo e streak diário',
  'Novos desafios adicionados todo mês',
]

export default async function SubscriptionPage({
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
        <h1 className="text-xl font-bold">Assinatura</h1>
      </div>

      {/* Current plan */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-1">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">
          Plano atual
        </p>
        <div className="flex items-center justify-between">
          <p className="text-lg font-black">Starter</p>
          <span className="text-xs font-bold px-2.5 py-1 bg-secondary text-muted-foreground rounded-full">
            Plano inicial
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Acesso ao seu desafio e aos treinos gratuitos
        </p>
      </div>

      {/* Upsell */}
      <div className="bg-foreground text-background rounded-2xl p-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-background/60 mb-1">
            Desbloqueie tudo
          </p>
          <p className="text-xl font-black leading-tight">
            Acesso ilimitado a todos os desafios
          </p>
        </div>

        <div className="space-y-2">
          {BENEFITS.map((b) => (
            <div key={b} className="flex items-center gap-2.5">
              <CheckCircle2 size={15} className="text-background/70 flex-shrink-0" />
              <span className="text-sm text-background/80">{b}</span>
            </div>
          ))}
        </div>

        {/* Plans */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between bg-background/10 rounded-xl px-4 py-3 border border-background/20">
            <div>
              <p className="text-sm font-bold">Anual</p>
              <p className="text-xs text-background/60">Renova por $49/ano</p>
            </div>
            <div className="text-right">
              <p className="font-black">$19</p>
              <p className="text-xs text-background/60">/ano</p>
            </div>
            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-400/20 text-green-300">
              -70%
            </span>
          </div>
          <div className="flex items-center justify-between bg-background/5 rounded-xl px-4 py-3 border border-background/10">
            <div>
              <p className="text-sm font-bold">Mensal</p>
              <p className="text-xs text-background/60">Renova por $14,90/mês</p>
            </div>
            <div className="text-right">
              <p className="font-black">$7</p>
              <p className="text-xs text-background/60">/mês</p>
            </div>
          </div>
        </div>

        <button className="w-full py-4 bg-background text-foreground rounded-2xl text-sm font-bold tracking-wide">
          Desbloquear meu acesso
        </button>

        <p className="text-center text-xs text-background/40">Cancele a qualquer momento</p>
      </div>
    </div>
  )
}
