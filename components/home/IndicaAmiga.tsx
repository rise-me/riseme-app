'use client'

import { Gift } from 'lucide-react'
import { track } from '@/lib/posthog/track'
import { COPY_ES, linkIndicacao } from '@/lib/indicacao-link'

// Cartão "Invita a una amiga" no Início (Bruno, 19/10/2026). Fixo e discreto (banner que aparece toda hora vira
// paisagem — docs/indicacao.md). O link leva o id dela no src: quando a amiga compra, o webhook da Hotmart libera
// 1 mês do Pase para ela e a dieta personalizada extra para a amiga, sozinho.
export function IndicaAmiga({ userId }: { userId: string }) {
  const c = COPY_ES
  const share = `https://wa.me/?text=${encodeURIComponent(c.mensagem(linkIndicacao(userId)))}`
  const [antes, negrito, depois] = c.texto.split('*')
  return (
    <div className="rounded-3xl border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0">
          <Gift size={20} className="text-foreground" />
        </div>
        <h2 className="text-base font-black leading-tight">{c.titulo}</h2>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {antes}
        <strong className="text-foreground">{negrito}</strong>
        {depois}
      </p>
      <a
        href={share}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => track('indicacao_compartilhar', { canal: 'whatsapp' })}
        className="block w-full py-3 rounded-2xl bg-[#25D366] text-white text-sm font-bold text-center"
      >
        {c.botao}
      </a>
    </div>
  )
}
