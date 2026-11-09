'use client'

import { useState, useTransition } from 'react'
import { pedirReembolso } from './actions'

export type TextosBotao = {
  pedir: string
  confirmar: string
  confirmarSim: string
  cancelar: string
  pedido: string
  erro: string
}

export function PedirReembolso({ sessionId, locale, valor, t }: { sessionId: string; locale: string; valor: string; t: TextosBotao }) {
  const [etapa, setEtapa] = useState<'inicio' | 'confirmar' | 'feito' | 'erro'>('inicio')
  const [pendente, iniciar] = useTransition()

  if (etapa === 'feito') return <p className="text-[15px] leading-relaxed font-medium">{t.pedido}</p>

  if (etapa === 'confirmar' || etapa === 'erro') {
    return (
      <div className="space-y-3">
        <p className="text-[15px] leading-relaxed">{t.confirmar.replace('{valor}', valor)}</p>
        {etapa === 'erro' && <p className="text-sm text-red-600">{t.erro}</p>}
        <button
          type="button"
          disabled={pendente}
          onClick={() =>
            iniciar(async () => {
              const r = await pedirReembolso(sessionId, locale)
              setEtapa(r.ok ? 'feito' : 'erro')
            })
          }
          className="block w-full rounded-2xl bg-foreground py-4 text-center text-[15px] font-semibold text-background disabled:opacity-60"
        >
          {pendente ? '…' : t.confirmarSim}
        </button>
        <button type="button" disabled={pendente} onClick={() => setEtapa('inicio')} className="block w-full py-3 text-center text-sm text-muted-foreground">
          {t.cancelar}
        </button>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEtapa('confirmar')}
      className="block w-full rounded-2xl border border-border py-4 text-center text-[15px] font-semibold active:bg-secondary/50"
    >
      {t.pedir}
    </button>
  )
}
