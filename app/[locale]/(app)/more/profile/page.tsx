import { ArrowLeft, Camera } from 'lucide-react'
import Link from 'next/link'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/more`}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-xl font-bold">Meu perfil</h1>
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-black">
            B
          </div>
          <button className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-foreground flex items-center justify-center border-2 border-background">
            <Camera size={13} className="text-background" />
          </button>
        </div>
        <p className="text-base font-bold">Bruno</p>
        <p className="text-sm text-muted-foreground">brunobarros119@gmail.com</p>
      </div>

      {/* Campos */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest px-1">
          Detalhes pessoais
        </p>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          <ProfileField label="Nome" value="Bruno" />
          <ProfileField label="E-mail" value="brunobarros119@gmail.com" />
          <ProfileField label="Nível físico" value="Iniciante" />
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest px-1">
          Legal e privacidade
        </p>
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          <ProfileField label="Termos de uso" />
          <ProfileField label="Política de privacidade" />
        </div>
      </section>
    </div>
  )
}

function ProfileField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <span className="text-sm font-medium">{label}</span>
      {value && <span className="text-sm text-muted-foreground">{value}</span>}
    </div>
  )
}
