export default function AppLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <h1 className="text-3xl font-black tracking-tighter inline-flex items-baseline animate-pulse">
          Rise<span className="text-base font-bold ml-0.5" style={{ verticalAlign: '-0.1em' }}>Me</span>
        </h1>
        <div className="w-8 h-8 rounded-full border-[3px] border-border border-t-foreground animate-spin" />
      </div>
    </div>
  )
}
