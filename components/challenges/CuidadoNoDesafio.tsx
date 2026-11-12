'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/posthog/track'
import type { CuidadoGravado, TipoCuidado } from '@/lib/cuidado'
import type { EstadoCuidado } from '@/lib/cuidado-server'

// "Tu cuidado" dentro de qualquer desafio (lib/cuidado.ts): (1) sem resposta → pergunta simples; (2) marcou joelho/
// costas → cartão do presente; (3) 1ª vez que libera → aviso grande com botão. Textos curtos (Bruno 11/11: parte do
// público tem pouca familiaridade com app).
export function CuidadoNoDesafio({ estado, locale }: { estado: EstadoCuidado; locale: string }) {
  const router = useRouter()
  const t = useTranslations('cuidado')
  const [respondida, setRespondida] = useState(false)
  // Mudar a resposta depois (Bruno 12/11: marcou Rodillas e não tinha como acrescentar a Espalda)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [avisoAberto, setAvisoAberto] = useState(
    Boolean(estado.cuidado && !estado.cuidado.avisado && estado.tipos.length > 0)
  )

  if (!estado.ligado) return null

  async function gravar(dados: Omit<CuidadoGravado, 'em'>) {
    try {
      await createClient().auth.updateUser({ data: { cuidado: { ...dados, em: new Date().toISOString() } } })
    } catch {}
  }

  async function responder(rodillas: boolean, espalda: boolean) {
    setSalvando(true)
    track('cuidado_respondeu', { rodillas, espalda })
    // Respondeu agora e marcou algo: o aviso do presente abre já, então nasce "avisado" (não repete).
    await gravar({ rodillas, espalda, origem: 'pergunta', avisado: rodillas || espalda })
    setRespondida(true)
    setEditando(false)
    router.refresh()
    setSalvando(false)
    if (rodillas || espalda) setAvisoAberto(true)
  }

  async function fecharAviso(ir: TipoCuidado | null) {
    setAvisoAberto(false)
    if (estado.cuidado && !estado.cuidado.avisado) {
      await gravar({ rodillas: estado.cuidado.rodillas, espalda: estado.cuidado.espalda, origem: estado.cuidado.origem, avisado: true })
    }
    track('cuidado_aviso', { acao: ir ? 'ver' : 'fechar' })
    if (ir) router.push(`/${locale}/cuidado/${ir}`)
  }

  // Pergunta (sem resposta no app nem no quiz, ou ela pediu para mudar)
  if ((!estado.cuidado && !respondida) || editando) {
    const opcoes: { rotulo: string; rodillas: boolean; espalda: boolean }[] = [
      { rotulo: t('question.knees'), rodillas: true, espalda: false },
      { rotulo: t('question.back'), rodillas: false, espalda: true },
      { rotulo: t('question.both'), rodillas: true, espalda: true },
      { rotulo: t('question.no'), rodillas: false, espalda: false },
    ]
    return (
      <div className="mx-4 mt-4 bg-card border border-border rounded-2xl p-4 space-y-3">
        <p className="font-bold text-base leading-snug">{t('question.title')}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{t('question.why')}</p>
        <div className="grid grid-cols-2 gap-2">
          {opcoes.map((o) => (
            <button
              key={o.rotulo}
              disabled={salvando}
              onClick={() => responder(o.rodillas, o.espalda)}
              className="py-3 rounded-xl border border-border bg-secondary text-sm font-bold active:scale-[0.98] disabled:opacity-50"
            >
              {o.rotulo}
            </button>
          ))}
        </div>
        {editando && (
          <button onClick={() => setEditando(false)} className="w-full py-1 text-muted-foreground text-sm font-semibold">
            {t('question.cancel')}
          </button>
        )}
      </div>
    )
  }

  const tipos = estado.tipos
  const qual: 'rodillas' | 'espalda' | 'both' =
    tipos.length > 1 ? 'both' : tipos[0]?.tipo ?? 'rodillas'
  const totalAulas = tipos.reduce((s, x) => s + x.aulas, 0)

  return (
    <>
      {tipos.map((x) => (
        <button
          key={x.tipo}
          onClick={() => router.push(`/${locale}/cuidado/${x.tipo}`)}
          className="mx-4 mt-4 w-[calc(100%-2rem)] flex items-center gap-3 bg-card border-2 border-foreground/80 rounded-2xl p-4 text-left active:scale-[0.98]"
        >
          <span className="text-3xl flex-shrink-0">🎁</span>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base leading-tight">{t('card.title', { name: t(`${x.tipo}.name`) })}</p>
            <p className="text-sm text-muted-foreground leading-snug mt-0.5">
              {x.feitas > 0 ? t('card.progress', { done: x.feitas, total: x.aulas }) : t(`${x.tipo}.cardLine`, { n: x.aulas })}
            </p>
          </div>
          <ChevronRight size={20} className="text-muted-foreground flex-shrink-0" />
        </button>
      ))}

      <button
        onClick={() => setEditando(true)}
        className="mx-4 mt-2 w-[calc(100%-2rem)] py-1 text-left text-xs text-muted-foreground font-semibold underline underline-offset-2"
      >
        {tipos.length > 0 ? t('question.change') : t('question.changeNo')}
      </button>

      {avisoAberto && tipos.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={() => fecharAviso(null)} />
          <div className="relative w-full max-w-sm bg-background rounded-3xl border border-border shadow-2xl p-6 text-center space-y-4">
            <div className="text-5xl">🎁</div>
            <h2 className="text-xl font-black leading-tight">{t('gift.title')}</h2>
            <p className="text-base leading-relaxed">{t(`gift.body.${qual}`, { n: totalAulas })}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('gift.same')}</p>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => fecharAviso(tipos[0].tipo)}
                className="block w-full py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold tracking-wide"
              >
                {t('gift.cta')}
              </button>
              <button onClick={() => fecharAviso(null)} className="w-full py-2.5 text-muted-foreground text-sm font-semibold">
                {t('gift.later')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
