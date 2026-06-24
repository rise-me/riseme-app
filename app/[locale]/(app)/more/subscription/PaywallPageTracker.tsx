'use client'

import { useEffect } from 'react'
import { track } from '@/lib/posthog/track'

export function PaywallPageTracker({ currentPlan }: { currentPlan: string }) {
  useEffect(() => {
    track('paywall_viewed', { source: 'subscription_page', current_plan: currentPlan })
  }, [currentPlan])
  return null
}
