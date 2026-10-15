'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChallengeCard } from '@/components/challenges/ChallengeCard'
import { PaywallModal } from '@/components/subscription/PaywallModal'
import { ofertaMostradaHoje } from '@/lib/pase-oferta'
import type { MockChallenge } from '@/lib/mock-challenges'

interface Props {
  challenges: MockChallenge[]
  locale: string
  // Pop-up do teste grátis na volta (14/10/2026): só pra quem não tem o Pase e já fez ao menos uma aula
  // (quem acabou de comprar entra direto no desafio, sem oferta). Máximo 1 oferta por dia (lib/pase-oferta.ts).
  hasPase: boolean
  didAnyDay: boolean
}

export function ChallengesList({ challenges, locale, hasPase, didAnyDay }: Props) {
  const t = useTranslations('challenges')
  const tData = useTranslations('challengeData')
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState<MockChallenge | null>(null)
  const [src, setSrc] = useState('pase-app')

  useEffect(() => {
    if (hasPase || !didAnyDay || ofertaMostradaHoje()) return
    const id = setTimeout(() => {
      setSelectedChallenge(null)
      setSrc('pase-volta')
      setPaywallOpen(true)
    }, 1200)
    return () => clearTimeout(id)
  }, [hasPase, didAnyDay])

  function handleLockedClick(challenge: MockChallenge) {
    setSelectedChallenge(challenge)
    setSrc('pase-app')
    setPaywallOpen(true)
  }

  return (
    <>
      <div className="px-4 pt-12 pb-6 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>

        <div className="space-y-2.5">
          {challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              locale={locale}
              onLockedClick={handleLockedClick}
            />
          ))}
        </div>
      </div>

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        challengeTitle={selectedChallenge ? tData(`${selectedChallenge.id}.title`) : undefined}
        src={src}
      />
    </>
  )
}
