import MainAppShell from '@/components/layout/main-app-shell'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <MainAppShell>{children}</MainAppShell>
}
