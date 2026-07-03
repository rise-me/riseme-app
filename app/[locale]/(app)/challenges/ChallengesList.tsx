'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChallengeCard } from '@/components/challenges/ChallengeCard'
import { PaywallModal } from '@/components/subscription/PaywallModal'
import type { MockChallenge } from '@/lib/mock-challenges'

interface Props {
  challenges: MockChallenge[]
  locale: string
}

export function ChallengesList({ challenges, locale }: Props) {
  const t = useTranslations('challenges')
  const tData = useTranslations('challengeData')
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState<MockChallenge | null>(null)

  function handleLockedClick(challenge: MockChallenge) {
    setSelectedChallenge(challenge)
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
      />
    </>
  )
}
