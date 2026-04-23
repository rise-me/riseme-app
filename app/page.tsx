import { redirect } from 'next/navigation'

// Root page — proxy.ts redirects to locale automatically
export default function RootPage() {
  redirect('/home')
}
