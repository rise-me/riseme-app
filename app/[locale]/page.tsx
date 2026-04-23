import { redirect } from 'next/navigation'

// Root locale page — redirect to home
export default function LocalePage() {
  redirect('./home')
}
