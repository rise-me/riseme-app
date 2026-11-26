'use client'

import { useTranslations } from 'next-intl'
import { track } from '@/lib/posthog/track'
import { COPY_ES, linkIndicacao } from '@/lib/indicacao-link'

// Dias que viram conquista. O 28 fica de fora: no último dia já existe a oferta do Pase (VideoPlayer).
export const DIAS_CONQUISTA = [3, 7, 14, 21]

const chave = (challengeId: string, dia: number) => `riseme:conquista:${challengeId}:${dia}`
export function conquistaJaMostrada(challengeId: string, dia: number): boolean {
  try { return localStorage.getItem(chave(challengeId, dia)) === '1' } catch { return false }
}
export function marcaConquista(challengeId: string, dia: number) {
  try { localStorage.setItem(chave(challengeId, dia), '1') } catch {}
}

// Tela de conquista nos dias 3, 7, 14 e 21 (Bruno 14–15/11): quem passa da 1ª semana é minoria (medido 14/11: 17% fazem
// 3 aulas na 1ª semana; ~10% chegam ao dia 7). É também o momento de alegria para convidar uma amiga (só ES: o link de
// indicação é o checkout da CL-ES). Aparece ao SAIR da aula ou no fim do vídeo, uma vez por desafio e dia.
export function Conquista({ challengeId, dia, locale, userId, onClose }: { challengeId: string; dia: number; locale: string; userId?: string | null; onClose?: () => void }) {
  const t = useTranslations('conquista')
  const indica = locale.split('-')[0] === 'es' && userId ? `https://wa.me/?text=${encodeURIComponent(COPY_ES.mensagem(linkIndicacao(userId)))}` : null

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-background rounded-3xl p-6 text-center space-y-4">
        <div className="text-6xl">{dia === 7 ? '🏆' : '🎉'}</div>
        <h2 className="text-2xl font-black leading-tight">{t(`d${dia}.title`)}</h2>
        <p className="text-base leading-relaxed">{t(`d${dia}.body`)}</p>
        <div className="space-y-2 pt-1">
          <button
            onClick={() => { track('conquista_fechar', { challenge_id: challengeId, day_number: dia }); onClose?.() }}
            className="block w-full py-3.5 rounded-2xl bg-foreground text-background text-sm font-bold tracking-wide"
          >
            {t('cta')}
          </button>
          {indica && (
            <a
              href={indica}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('indicacao_compartilhar', { canal: 'whatsapp', origem: 'conquista', day_number: dia })}
              className="block w-full py-3 rounded-2xl border border-border text-sm font-bold"
            >
              {t('share')}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
