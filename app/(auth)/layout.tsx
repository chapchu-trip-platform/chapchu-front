import MobileShell from '@/components/layout/mobile-shell'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <MobileShell>{children}</MobileShell>
}
