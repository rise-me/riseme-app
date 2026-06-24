import posthog from 'posthog-js'

export function track(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  posthog.capture(event, props)
}
