'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { FileText, ChevronRight, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PaywallModal } from '@/components/subscription/PaywallModal'

interface BonusItem {
  id: string
  emoji: string
  pageCount: number
  title: string
  description: string
  unlocked: boolean
  coverUrl: string | null
}

// Produto comprado à parte. Vale o mesmo que um desafio (o Metabolik Protokol
// custa as mesmas 990 TRY da Calistenia), então NÃO pode parecer brinde: ganha a
// capa real do PDF, mais respiro e um fio dourado. Só aparece pra quem comprou —
// por isso nunca tem estado bloqueado aqui.
function ProdutoCard({ item, locale }: { item: BonusItem; locale: string }) {
  const t = useTranslations('bonus')
  return (
    <Link href={`/${locale}/bonus/${item.id}`} className="block">
      <div className="flex gap-4 bg-card rounded-2xl p-3 border border-[rgba(193,145,55,0.4)] transition-all active:scale-[0.98]">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl}
            alt=""
            className="w-24 flex-shrink-0 rounded-lg border border-border object-cover object-top bg-secondary"
            style={{ aspectRatio: '595 / 842' }}
          />
        ) : (
          <div
            className="w-24 flex-shrink-0 rounded-lg border border-border bg-secondary flex items-center justify-center text-3xl"
            style={{ aspectRatio: '595 / 842' }}
          >
            {item.emoji}
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
          <p className="font-bold text-[15px] leading-tight">{item.title}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{item.description}</p>
          <div className="flex items-center gap-1 mt-2 text-muted-foreground">
            <FileText size={12} />
            <span className="text-[11px] font-medium">{t('pageCount', { count: item.pageCount })}</span>
          </div>
        </div>

        <div className="flex items-center flex-shrink-0">
          <ChevronRight size={18} className="text-muted-foreground" />
        </div>
      </div>
    </Link>
  )
}

// Brinde da compra: fileira compacta com emoji. O contraste com o ProdutoCard é
// a mensagem — dá pra ver num relance o que ela pagou e o que ganhou junto.
function BonusCard({
  item,
  locale,
  onLocked,
}: {
  item: BonusItem
  locale: string
  onLocked: () => void
}) {
  const t = useTranslations('bonus')
  const card = (
    <div
      className={cn(
        'flex items-center gap-4 bg-card rounded-2xl p-4 border border-border transition-all active:scale-[0.98]',
        !item.unlocked && 'opacity-75'
      )}
    >
      <div
        className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-secondary',
          !item.unlocked && 'grayscale'
        )}
      >
        {item.emoji}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm leading-tight">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
        <div className="flex items-center gap-1 mt-1 text-muted-foreground">
          <FileText size={12} />
          <span className="text-[11px] font-medium">{t('pageCount', { count: item.pageCount })}</span>
        </div>
      </div>

      <div className="flex-shrink-0">
        {item.unlocked ? (
          <ChevronRight size={18} className="text-muted-foreground" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center lock-glow">
            <Lock size={14} className="text-foreground" />
          </div>
        )}
      </div>
    </div>
  )

  return item.unlocked ? (
    <Link href={`/${locale}/bonus/${item.id}`}>{card}</Link>
  ) : (
    <button className="w-full text-left" onClick={onLocked}>
      {card}
    </button>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
      {children}
    </h2>
  )
}

export function BonusList({
  produtos,
  bonuses,
  locale,
  hasAnyAccess,
}: {
  produtos: BonusItem[]
  bonuses: BonusItem[]
  locale: string
  hasAnyAccess: boolean
}) {
  const t = useTranslations('bonus')
  const [paywallOpen, setPaywallOpen] = useState(false)
  const vazio = produtos.length === 0 && bonuses.length === 0

  return (
    <>
      <div className="px-4 pt-12 pb-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {hasAnyAccess ? t('subtitle') : t('lockedSubtitle')}
          </p>
        </div>

        {vazio && <p className="text-sm text-muted-foreground pt-8 text-center">{t('emptyState')}</p>}

        {produtos.length > 0 && (
          <section className="space-y-2.5">
            <SectionTitle>{t('sectionProducts')}</SectionTitle>
            {produtos.map((item) => (
              <ProdutoCard key={item.id} item={item} locale={locale} />
            ))}
          </section>
        )}

        {bonuses.length > 0 && (
          <section className="space-y-2.5">
            {/* só rotula "Bônus" quando há produto comprado com que contrastar */}
            {produtos.length > 0 && <SectionTitle>{t('sectionBonuses')}</SectionTitle>}
            {bonuses.map((item) => (
              <BonusCard
                key={item.id}
                item={item}
                locale={locale}
                onLocked={() => setPaywallOpen(true)}
              />
            ))}
          </section>
        )}
      </div>

      <PaywallModal open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  )
}
