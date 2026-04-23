'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { ChallengeCard } from '@/components/challenges/ChallengeCard'
import { PaywallModal } from '@/components/subscription/PaywallModal'
import { mockChallenges, type MockChallenge } from '@/lib/mock-challenges'
import { Heart, Download } from 'lucide-react'

export default function ChallengesPage() {
  const t = useTranslations('challenges')
  const params = useParams()
  const locale = params.locale as string

  const [paywallOpen, setPaywallOpen] = useState(false)
  const [selectedChallenge, setSelectedChallenge] = useState<MockChallenge | null>(null)

  function handleLockedClick(challenge: MockChallenge) {
    setSelectedChallenge(challenge)
    setPaywallOpen(true)
  }

  return (
    <>
      <div className="px-4 pt-12 pb-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <div className="flex items-center gap-3">
            <button className="text-muted-foreground hover:text-foreground">
              <Heart size={22} strokeWidth={1.8} />
            </button>
            <button className="text-muted-foreground hover:text-foreground">
              <Download size={22} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Challenge list */}
        <div className="space-y-2.5">
          {mockChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              locale={locale}
              onLockedClick={handleLockedClick}
            />
          ))}
        </div>
      </div>

      {/* Paywall Modal */}
      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        challengeTitle={selectedChallenge?.title}
      />
    </>
  )
}
