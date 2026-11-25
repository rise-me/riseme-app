'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { track } from '@/lib/posthog/track'

export type RespostaAula = 'facil' | 'bien' | 'dificil'

// "¿Cómo te fue hoy?" no fim da aula (Bruno 15/11): mede, aula por aula, quem acha fácil e quem acha difícil, e é a
// porta da "versión suave" — oferecida SÓ a quem marca "Muy difícil" (há alunas que reclamam que é fácil demais).
// Guarda em user_metadata.como_te_fue (sem tabela nova): [{ c: desafio, d: dia, r: resposta, em }]. Plano: docs/primeira-aula.md.
// O espelho (Bruno 16/11 e 25/11): "Fácil" oferece a "versión intensa" quando há aulas dela no idioma.
export function ComoTeFue({ challengeId, dayNumber, suaveHref, intensaHref }: { challengeId: string; dayNumber: number; suaveHref?: string | null; intensaHref?: string | null }) {
  const t = useTranslations('comoTeFue')
  const [resposta, setResposta] = useState<RespostaAula | null>(null)

  async function responder(r: RespostaAula) {
    setResposta(r)
    track('como_te_fue', { challenge_id: challengeId, day_number: dayNumber, resposta: r })
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const antes = (user?.user_metadata?.como_te_fue as unknown[] | undefined) ?? []
      const novo = { c: challengeId, d: dayNumber, r, em: new Date().toISOString() }
      await supabase.auth.updateUser({ data: { como_te_fue: [...antes, novo].slice(-200) } })
    } catch {}
  }

  // "Muy difícil" + versión suave / "Fácil" + versión intensa no idioma dela: oferece (ela escolhe; nada muda se disser não)
  const oferta = resposta === 'dificil' && suaveHref ? { trilha: 'suave', href: suaveHref }
    : resposta === 'facil' && intensaHref ? { trilha: 'intensa', href: intensaHref } : null
  if (oferta) {
    return (
      <div className="bg-white/5 rounded-2xl p-4 space-y-3 text-center">
        <p className="text-white text-sm font-bold">{t(oferta.trilha === 'suave' ? 'thanksHard' : 'thanksEasy')}</p>
        <p className="text-white/80 text-sm leading-relaxed">{t(`${oferta.trilha}Offer`)}</p>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={oferta.href}
            onClick={() => track(`${oferta.trilha}_oferta`, { acao: 'sim', challenge_id: challengeId, day_number: dayNumber })}
            className="py-3 rounded-xl bg-white text-black text-sm font-bold"
          >
            {t(`${oferta.trilha}Yes`)}
          </Link>
          <button
            onClick={() => { track(`${oferta.trilha}_oferta`, { acao: 'nao', challenge_id: challengeId, day_number: dayNumber }); setResposta('bien') }}
            className="py-3 rounded-xl bg-white/10 text-white text-sm font-bold"
          >
            {t(`${oferta.trilha}No`)}
          </button>
        </div>
      </div>
    )
  }

  if (resposta) {
    return (
      <div className="bg-white/5 rounded-2xl p-4 text-center">
        <p className="text-white text-sm font-bold">{t(resposta === 'dificil' ? 'thanksHard' : 'thanks')}</p>
        {resposta === 'dificil' && <p className="text-white/60 text-xs mt-1 leading-relaxed">{t('hardTip')}</p>}
      </div>
    )
  }

  const opcoes: { r: RespostaAula; emoji: string }[] = [
    { r: 'facil', emoji: '😎' },
    { r: 'bien', emoji: '🙂' },
    { r: 'dificil', emoji: '😮‍💨' },
  ]
  return (
    <div className="bg-white/5 rounded-2xl p-4 space-y-3">
      <p className="text-white text-sm font-bold text-center">{t('question')}</p>
      <div className="grid grid-cols-3 gap-2">
        {opcoes.map((o) => (
          <button
            key={o.r}
            onClick={() => responder(o.r)}
            className="flex flex-col items-center gap-1 py-3 rounded-xl bg-white/10 text-white text-xs font-bold active:scale-[0.97]"
          >
            <span className="text-2xl leading-none">{o.emoji}</span>
            {t(o.r)}
          </button>
        ))}
      </div>
    </div>
  )
}
