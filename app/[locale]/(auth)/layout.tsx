export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      {children}
    </div>
  )
}
