'use client'

import { useTranslations } from 'next-intl'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X, SkipBack, SkipForward, Tv } from 'lucide-react'
import { cn } from '@/lib/utils'
import { markDayComplete } from '@/lib/progress'
import { track } from '@/lib/posthog/track'
import type { MockChallenge } from '@/lib/mock-challenges'
import { HLS_BASE_URL, STREAM_CUSTOMER_HOST, type LessonVideo, type MockDay } from '@/lib/mock-challenge-days'
import { CastTvHelp } from '@/components/challenges/CastTvHelp'

interface Props {
  challenge: MockChallenge
  days: MockDay[]
  currentDayNumber: number
  locale: string
  hlsPath?: string | null
}

// O que o poll de progresso precisa, igual pros dois provedores
type PlayerHandle = {
  getCurrentTime: () => number
  getDuration: () => number
  destroy: () => void
}

type YTPlayer = {
  getCurrentTime?: () => number
  getDuration?: () => number
  destroy: () => void
}

type StreamSdkPlayer = { currentTime: number; duration: number }

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement | string, config: unknown) => YTPlayer
      PlayerState: { PLAYING: number; ENDED: number }
    }
    onYouTubeIframeAPIReady?: () => void
    Stream?: (el: HTMLIFrameElement) => StreamSdkPlayer
  }
}

let streamSdkPromise: Promise<void> | null = null
function loadStreamSDK(): Promise<void> {
  if (window.Stream) return Promise.resolve()
  if (streamSdkPromise) return streamSdkPromise
  streamSdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://embed.cloudflarestream.com/embed/sdk.latest.js'
    script.onload = () => resolve()
    script.onerror = () => {
      streamSdkPromise = null
      reject(new Error('Stream SDK failed to load'))
    }
    document.head.appendChild(script)
  })
  return streamSdkPromise
}

async function mountPlayer(host: HTMLDivElement, video: LessonVideo): Promise<PlayerHandle | null> {
  if (video.provider === 'stream') {
    if (!STREAM_CUSTOMER_HOST) return null
    await loadStreamSDK()
    const iframe = document.createElement('iframe')
    iframe.src = `https://${STREAM_CUSTOMER_HOST}/${video.id}/iframe?autoplay=true&preload=auto`
    iframe.allow = 'accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen'
    iframe.allowFullscreen = true
    iframe.style.border = 'none'
    host.appendChild(iframe)
    const p = window.Stream!(iframe)
    return {
      // duration é NaN até o metadata carregar
      getCurrentTime: () => p.currentTime || 0,
      getDuration: () => p.duration || 0,
      destroy: () => iframe.remove(),
    }
  }

  if (video.provider === 'hls') {
    if (!HLS_BASE_URL) return null
    // A playlist já é a do idioma da aluna (só tem esse áudio): o player nunca escolhe faixa
    const src = `${HLS_BASE_URL}/${video.id}`
    const el = document.createElement('video')
    el.controls = true
    el.playsInline = true
    el.autoplay = true
    el.preload = 'auto'
    el.style.width = '100%'
    el.style.height = '100%'
    el.style.background = '#000'
    host.appendChild(el)
    // iPhone/iPad: HLS nativo (mantém AirPlay e gasta menos bateria). Resto: hls.js —
    // o Chrome do Android diz "maybe" pro HLS nativo e depois falha.
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    let hls: import('hls.js').default | null = null
    if (!isIOS) {
      const { default: Hls } = await import('hls.js')
      if (Hls.isSupported()) {
        // não baixa 1080p pra uma tela de celular
        hls = new Hls({ capLevelToPlayerSize: true })
        hls.loadSource(src)
        hls.attachMedia(el)
      }
    }
    if (!hls) el.src = src
    // autoplay com som costuma ser bloqueado no celular; aí a aluna toca no play
    el.play().catch(() => {})
    return {
      getCurrentTime: () => el.currentTime || 0,
      getDuration: () => (Number.isFinite(el.duration) ? el.duration : 0),
      destroy: () => {
        hls?.destroy()
        el.removeAttribute('src')
        el.load()
        el.remove()
      },
    }
  }

  await loadYouTubeAPI()
  if (!window.YT) return null
  const p = new window.YT.Player(host, {
    videoId: video.id,
    playerVars: {
      autoplay: 1,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      controls: 1,
    },
  })
  return {
    // os métodos do YT só existem depois do onReady
    getCurrentTime: () => p.getCurrentTime?.() ?? 0,
    getDuration: () => p.getDuration?.() ?? 0,
    destroy: () => p.destroy(),
  }
}

let apiLoadingPromise: Promise<void> | null = null
function loadYouTubeAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  if (window.YT?.Player) return Promise.resolve()
  if (apiLoadingPromise) return apiLoadingPromise

  apiLoadingPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return apiLoadingPromise
}

export function VideoPlayer({ challenge, days, currentDayNumber, locale, hlsPath }: Props) {
  const router = useRouter()
  const t = useTranslations('challenges')
  const tTv = useTranslations('castTv')
  const currentDay = days.find((d) => d.day_number === currentDayNumber)!
  const nextDay = days.find((d) => d.day_number === currentDayNumber + 1)
  const prevDay = days.find((d) => d.day_number === currentDayNumber - 1)
  const video = currentDay.video
  const videoProvider = video?.provider
  // Aula no R2: o caminho já vem com o passe assinado pelo servidor (page.tsx)
  const videoId = videoProvider === 'hls' ? (hlsPath ?? undefined) : video?.id

  const playerRef = useRef<PlayerHandle | null>(null)
  const iframeHostRef = useRef<HTMLDivElement | null>(null)
  const savedRef = useRef(false)
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(currentDay.duration_seconds ?? 15 * 60)
  const [tvOpen, setTvOpen] = useState(false)

  useEffect(() => {
    savedRef.current = false
    setElapsed(0)
    if (!videoProvider || !videoId || !iframeHostRef.current) return

    let pollId: ReturnType<typeof setInterval> | null = null
    let cancelled = false

    mountPlayer(iframeHostRef.current, { provider: videoProvider, id: videoId }).then((handle) => {
      if (cancelled) {
        handle?.destroy()
        return
      }
      if (!handle) return
      playerRef.current = handle

      pollId = setInterval(() => {
        const p = playerRef.current
        if (!p) return
        const t = p.getCurrentTime()
        const d = p.getDuration()
        if (d > 0) setDuration(d)
        setElapsed(t)
        if (d > 0 && t / d >= 0.8 && !savedRef.current) {
          savedRef.current = true
          const watchedPct = Math.round((t / d) * 100)
          markDayComplete({
            challengeId: challenge.id,
            dayNumber: currentDayNumber,
            watchedPct,
          })
            .then(({ error }) => {
              if (error) {
                // libera pra tentar de novo no próximo tick do poll
                savedRef.current = false
                console.error('[progress] save rejected:', error)
                return
              }
              // invalida o cache do client router: a tela do desafio volta fresca
              // mesmo via swipe-back (router.back restaura RSC antigo por padrão)
              router.refresh()
            })
            .catch((err) => {
              savedRef.current = false
              console.error('[progress] failed to save:', err)
            })
          track('workout_completed', {
            challenge_id: challenge.id,
            day_number: currentDayNumber,
            watched_pct: watchedPct,
          })
          if (currentDayNumber >= days.length) {
            track('challenge_finished', {
              challenge_id: challenge.id,
              total_days: days.length,
            })
          }
        }
      }, 1000)
    })

    return () => {
      cancelled = true
      if (pollId) clearInterval(pollId)
      try {
        playerRef.current?.destroy()
      } catch {}
      playerRef.current = null
    }
  }, [videoProvider, videoId, challenge.id, currentDayNumber])

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const progressPct = duration > 0 ? elapsed / duration : 0

  function navigate(day: MockDay | undefined) {
    if (!day) return
    router.push(`/${locale}/challenges/${challenge.id}/player/${day.day_number}`)
  }

  const SEGMENTS = 20
  const filledSegments = Math.round(progressPct * SEGMENTS)
  const label = elapsed < duration * 0.15 ? t('warmup') : elapsed < duration * 0.85 ? t('training') : t('cooldown')

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative flex-1 bg-zinc-900 flex items-center justify-center">
        {videoId ? (
          <div ref={iframeHostRef} className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-800 to-zinc-950" />
            <div className="relative z-10 text-center px-6">
              <span className="text-6xl opacity-40 select-none block mb-3">{challenge.thumbnail_emoji}</span>
              <p className="text-white/60 text-sm">{t('videoSoon')}</p>
            </div>
          </>
        )}

        <button
          onClick={() => setTvOpen(true)}
          aria-label={tTv('button')}
          className="absolute top-12 right-16 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center"
        >
          <Tv size={18} className="text-white" />
        </button>
        <button
          onClick={() => router.push(`/${locale}/challenges/${challenge.id}`)}
          className="absolute top-12 right-4 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur flex items-center justify-center"
        >
          <X size={18} className="text-white" />
        </button>
      </div>

      <div className="bg-black px-5 pt-4 pb-8 space-y-4">
        <div className="flex gap-0.5">
          {Array.from({ length: SEGMENTS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 h-1 rounded-full transition-colors duration-300',
                i < filledSegments ? 'bg-white' : 'bg-white/20'
              )}
            />
          ))}
        </div>

        <div className="flex justify-between items-center text-xs text-white/50 font-semibold">
          <div>
            <p className="text-white text-sm tabular-nums">{formatTime(elapsed)}</p>
            <p>{label}</p>
          </div>
          <div className="text-right">
            <p className="text-white text-sm tabular-nums">{formatTime(Math.max(0, duration - elapsed))}</p>
            <p>{t('remaining')}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(prevDay)}
            disabled={!prevDay}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border text-sm font-bold transition-opacity',
              prevDay
                ? 'border-white/20 text-white hover:bg-white/10'
                : 'border-white/10 text-white/20 opacity-40'
            )}
          >
            <SkipBack size={16} />
            {t('previous')}
          </button>
          <button
            onClick={() => navigate(nextDay)}
            disabled={!nextDay}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all',
              nextDay
                ? 'bg-white text-black hover:bg-white/90'
                : 'bg-white/20 text-white/30'
            )}
          >
            {t('next')}
            <SkipForward size={16} />
          </button>
        </div>

        {nextDay && (
          <div className="flex items-center gap-3 bg-white/5 rounded-2xl p-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg">{challenge.thumbnail_emoji}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white/40 text-[10px] font-semibold">{t('upNext')}</p>
              <p className="text-white text-xs font-bold truncate">{nextDay.title}</p>
              {nextDay.duration_minutes && (
                <p className="text-white/40 text-[10px]">{nextDay.duration_minutes} min</p>
              )}
            </div>
          </div>
        )}
      </div>

      <CastTvHelp open={tvOpen} onClose={() => setTvOpen(false)} />
    </div>
  )
}
