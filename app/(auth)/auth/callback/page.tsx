import type { Metadata } from 'next'
import AuthCallbackRoute from '@/features/auth/components/auth-callback-route'

export const metadata: Metadata = {
  referrer: 'no-referrer',
}

export default function AuthCallbackPage() {
  return <AuthCallbackRoute />
}
