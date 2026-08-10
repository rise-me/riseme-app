'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChefHat, Clock, Flame, Lock, Plus, ArrowLeft, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PaywallModal } from '@/components/subscription/PaywallModal'
import type { Cardapio, PerfilCardapio } from '@/lib/diet/tipos'
import { RESTRICOES, PREFERENCIAS, CONDICOES } from '@/lib/diet/tipos'
import type { Cota } from '@/lib/diet/quota'

// "Mi menú": lista de cardápios → formulário (1 tela) → geração (~1 min) → leitor.
// A cota REAL é checada no servidor; aqui ela só orienta a UI (esconder botão,
// abrir paywall). Vitalícia sem cota → paywall de assinatura (upgrade).

interface MenuSalvo {
  id: number
  created_at: string
  menu: Cardapio
}

interface Props {
  locale: string
  unlocked: boolean
  menus: MenuSalvo[]
  cota: Cota | null
}

type Tela = 'lista' | 'form' | 'gerando' | 'ver'

const ATIVIDADES = ['sedentary', 'light', 'moderate', 'active', 'very_active'] as const
const OBJETIVOS = ['lose', 'maintain', 'gain'] as const
const CUSTOS = ['barata', 'moderada', 'cara'] as const

export function MenuClient({ locale, unlocked, menus: menusIniciais, cota: cotaInicial }: Props) {
  const t = useTranslations('menu')
  const router = useRouter()

  const [tela, setTela] = useState<Tela>('lista')
  const [menus, setMenus] = useState<MenuSalvo[]>(menusIniciais)
  const [cota, setCota] = useState<Cota | null>(cotaInicial)
  const [aberto, setAberto] = useState<MenuSalvo | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [paywallOpen, setPaywallOpen] = useState(false)

  // Formulário
  const [sex, setSex] = useState<'female' | 'male'>('female')
  const [age, setAge] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [activity, setActivity] = useState<(typeof ATIVIDADES)[number]>('light')
  const [objective, setObjective] = useState<(typeof OBJETIVOS)[number]>('lose')
  const [numRefeicoes, setNumRefeicoes] = useState(4)
  const [incluiCafe, setIncluiCafe] = useState(true)
  const [restricoes, setRestricoes] = useState<string[]>([])
  const [preferencias, setPreferencias] = useState<string[]>([])
  const [condicoes, setCondicoes] = useState<string[]>([])
  const [custo, setCusto] = useState<(typeof CUSTOS)[number]>('moderada')
  const [observacao, setObservacao] = useState('')

  function toggle(list: string[], setList: (v: string[]) => void, item: string) {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item])
  }

  function novoCardapio() {
    setErro(null)
    if (!cota || cota.restantes <= 0) {
      if (cota && !cota.renova) setPaywallOpen(true)
      return
    }
    setTela('form')
  }

  async function gerar() {
    setErro(null)
    setTela('gerando')
    try {
      const res = await fetch('/api/menu/gerar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sex,
          age: Number(age),
          weightKg: Number(weightKg),
          heightCm: Number(heightCm),
          activity,
          objective,
          numRefeicoes,
          incluiCafe,
          restricoes,
          preferencias,
          condicoes,
          custo,
          observacao,
        }),
      })
      const body = await res.json().catch(() => null)
      if (!res.ok) {
        if (res.status === 403 && body?.error === 'quota_exceeded' && !body?.renova) {
          setTela('lista')
          setPaywallOpen(true)
          return
        }
        throw new Error(body?.error ?? 'error')
      }
      const salvo: MenuSalvo = { id: body.id, created_at: body.created_at, menu: body.menu }
      setMenus([salvo, ...menus])
      if (cota) setCota({ ...cota, usados: cota.usados + 1, restantes: body.restantes })
      setAberto(salvo)
      setTela('ver')
      router.refresh()
    } catch {
      setErro(t('errorGenerating'))
      setTela('form')
    }
  }

  // ---- bloqueada (não comprou nada) ----
  if (!unlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
          <Lock size={24} className="text-muted-foreground" />
        </div>
        <h1 className="text-xl font-black mb-2">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t('lockedDesc')}</p>
        <button
          onClick={() => setPaywallOpen(true)}
          className="px-6 py-3 bg-foreground text-background rounded-2xl text-sm font-bold"
        >
          {t('unlock')}
        </button>
        <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} challengeTitle={t('title')} />
      </div>
    )
  }

  // ---- gerando ----
  if (tela === 'gerando') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center mb-5 animate-pulse">
          <ChefHat size={26} className="text-background" />
        </div>
        <h1 className="text-lg font-black mb-2">{t('generating')}</h1>
        <p className="text-sm text-muted-foreground max-w-xs">{t('generatingHint')}</p>
      </div>
    )
  }

  // ---- leitor de um cardápio ----
  if (tela === 'ver' && aberto) {
    const m = aberto.menu
    return (
      <div className="min-h-screen pb-24">
        <div className="bg-foreground text-background pt-14 pb-6 px-4">
          <button
            onClick={() => setTela('lista')}
            className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center mb-4"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-black leading-tight mb-1">{t('title')}</h1>
          <p className="text-background/60 text-sm">
            {new Date(aberto.created_at).toLocaleDateString(locale)}
          </p>
          <div className="flex gap-2 mt-4">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-background/15 px-2.5 py-1 rounded-full">
              <Flame size={11} /> {m.kcalDia} kcal
            </span>
            <span className="text-[11px] font-semibold bg-background/15 px-2.5 py-1 rounded-full">
              P {m.macros.proteina_g}g · C {m.macros.carbo_g}g · G {m.macros.gordura_g}g
            </span>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-5">
          <p className="text-xs text-muted-foreground">{t('swapHint')}</p>
          {m.refeicoes.map((ref) => (
            <div key={ref.momento}>
              <h2 className="font-bold text-sm uppercase tracking-wide text-muted-foreground mb-2">
                {t(`momento.${ref.momento}`)}
              </h2>
              <div className="space-y-2">
                {ref.opcoes.map((op, i) => (
                  <div key={i} className="bg-card border border-border rounded-2xl p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-sm leading-tight">{op.nome}</p>
                      <span className="text-[11px] font-semibold text-muted-foreground flex-shrink-0">
                        {op.kcal} kcal
                      </span>
                    </div>
                    <ul className="mt-2 space-y-0.5">
                      {op.ingredientes.map((ing, j) => (
                        <li key={j} className="text-xs text-muted-foreground">
                          {ing.qtd} · {ing.item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ---- formulário ----
  if (tela === 'form') {
    const podeEnviar = Number(age) > 0 && Number(weightKg) > 0 && Number(heightCm) > 0
    const campo = 'w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm'
    const chip = (ativo: boolean) =>
      cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
        ativo ? 'bg-foreground text-background border-foreground' : 'bg-card text-muted-foreground border-border'
      )
    return (
      <div className="min-h-screen pb-24 px-4">
        <div className="pt-14 pb-4">
          <button
            onClick={() => setTela('lista')}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center mb-4"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-2xl font-black leading-tight">{t('formTitle')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('formSubtitle')}</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <input inputMode="numeric" placeholder={t('age')} value={age} onChange={(e) => setAge(e.target.value)} className={campo} />
            <input inputMode="numeric" placeholder={t('weight')} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className={campo} />
            <input inputMode="numeric" placeholder={t('height')} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className={campo} />
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('sex')}</p>
            <div className="flex gap-2">
              {(['female', 'male'] as const).map((s) => (
                <button key={s} onClick={() => setSex(s)} className={chip(sex === s)}>{t(`sexo.${s}`)}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('objective')}</p>
            <div className="flex gap-2 flex-wrap">
              {OBJETIVOS.map((o) => (
                <button key={o} onClick={() => setObjective(o)} className={chip(objective === o)}>{t(`objetivo.${o}`)}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('activity')}</p>
            <div className="flex gap-2 flex-wrap">
              {ATIVIDADES.map((a) => (
                <button key={a} onClick={() => setActivity(a)} className={chip(activity === a)}>{t(`atividade.${a}`)}</button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('meals')}</p>
            <div className="flex gap-2 items-center flex-wrap">
              {[3, 4, 5, 6].map((n) => (
                <button key={n} onClick={() => setNumRefeicoes(n)} className={chip(numRefeicoes === n)}>{n}</button>
              ))}
              <button onClick={() => setIncluiCafe(!incluiCafe)} className={chip(incluiCafe)}>
                {t('includeBreakfast')}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('restrictions')}</p>
            <div className="flex gap-2 flex-wrap">
              {RESTRICOES.map((r) => (
                <button key={r} onClick={() => toggle(restricoes, setRestricoes, r)} className={chip(restricoes.includes(r))}>
                  {t(`restricao.${r}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('preferences')}</p>
            <div className="flex gap-2 flex-wrap">
              {PREFERENCIAS.map((p) => (
                <button key={p} onClick={() => toggle(preferencias, setPreferencias, p)} className={chip(preferencias.includes(p))}>
                  {t(`preferencia.${p}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('conditions')}</p>
            <div className="flex gap-2 flex-wrap">
              {CONDICOES.map((c) => (
                <button key={c} onClick={() => toggle(condicoes, setCondicoes, c)} className={chip(condicoes.includes(c))}>
                  {t(`condicao.${c}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{t('budget')}</p>
            <div className="flex gap-2">
              {CUSTOS.map((c) => (
                <button key={c} onClick={() => setCusto(c)} className={chip(custo === c)}>{t(`custo.${c}`)}</button>
              ))}
            </div>
          </div>

          <textarea
            placeholder={t('notesPlaceholder')}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value.slice(0, 500))}
            rows={2}
            className={campo}
          />

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            onClick={gerar}
            disabled={!podeEnviar}
            className={cn(
              'w-full py-3.5 rounded-2xl text-sm font-bold tracking-wide',
              podeEnviar ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground'
            )}
          >
            {t('generateCta')}
          </button>
        </div>
      </div>
    )
  }

  // ---- lista ----
  return (
    <div className="min-h-screen pb-24 px-4">
      <div className="pt-14 pb-4">
        <h1 className="text-2xl font-black leading-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {cota && (
        <div className="bg-card border border-border rounded-2xl p-3.5 mb-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {cota.restantes > 0
              ? t('remaining', { count: cota.restantes })
              : cota.renova
                ? t(cota.plano === 'annual' ? 'quotaWeeklyDone' : 'quotaMonthlyDone')
                : t('quotaLifetimeDone')}
          </p>
          {cota.restantes <= 0 && !cota.renova && (
            <button
              onClick={() => setPaywallOpen(true)}
              className="text-xs font-bold bg-foreground text-background px-3 py-1.5 rounded-full flex-shrink-0"
            >
              {t('upgrade')}
            </button>
          )}
        </div>
      )}

      {menus.length === 0 ? (
        <div className="flex flex-col items-center text-center pt-10 px-4">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
            <Sparkles size={24} className="text-foreground" />
          </div>
          <h2 className="font-bold text-lg mb-2">{t('emptyTitle')}</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">{t('emptyDesc')}</p>
          {cota && cota.restantes > 0 && (
            <button
              onClick={novoCardapio}
              className="px-6 py-3 bg-foreground text-background rounded-2xl text-sm font-bold"
            >
              {t('createFirst')}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {menus.map((m) => (
            <button
              key={m.id}
              onClick={() => { setAberto(m); setTela('ver') }}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-3.5 text-left transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <ChefHat size={20} className="text-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{m.menu.kcalDia} kcal</p>
                <div className="flex items-center gap-1 mt-0.5 text-muted-foreground">
                  <Clock size={11} />
                  <span className="text-xs">{new Date(m.created_at).toLocaleDateString(locale)}</span>
                </div>
              </div>
            </button>
          ))}

          {cota && cota.restantes > 0 && (
            <button
              onClick={novoCardapio}
              className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-2xl p-3.5 text-sm font-semibold text-muted-foreground"
            >
              <Plus size={16} /> {t('create')}
            </button>
          )}
        </div>
      )}

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} challengeTitle={t('title')} />
    </div>
  )
}
