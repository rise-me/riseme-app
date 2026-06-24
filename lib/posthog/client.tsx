'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { createClient } from '@/lib/supabase/client'

let initialized = false

export function PostHogClient({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized) return
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST
    if (!key || !host) return

    posthog.init(key, {
      api_host: host,
      person_profiles: 'identified_only',
      capture_pageview: 'history_change',
      capture_pageleave: true,
      session_recording: {
        maskAllInputs: true,
      },
    })
    initialized = true

    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        posthog.identify(user.id, {
          locale: navigator.language,
        })
      }
    })

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        posthog.identify(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        posthog.reset()
      }
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return <>{children}</>
}
