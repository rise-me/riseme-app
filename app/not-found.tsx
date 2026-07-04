import Link from 'next/link'

// 404 raiz — fora do contexto de idioma (ex.: locale inválido na URL),
// então o texto é multilíngue fixo.
export default function RootNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center space-y-6 bg-background">
      <h1 className="text-4xl font-black tracking-tighter inline-flex items-baseline">
        Rise<span className="text-lg font-bold ml-0.5" style={{ verticalAlign: '-0.1em' }}>Me</span>
      </h1>
      <div className="space-y-1">
        <p className="text-lg font-bold">Página no encontrada</p>
        <p className="text-sm text-muted-foreground">Sayfa bulunamadı · Página não encontrada · Page not found</p>
      </div>
      <Link
        href="/home"
        className="px-6 py-3 bg-foreground text-background rounded-2xl text-sm font-bold"
      >
        Ir al inicio
      </Link>
    </div>
  )
}
