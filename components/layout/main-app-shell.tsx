'use client'

import { usePathname, useRouter } from 'next/navigation'
import MobileShell from '@/components/layout/mobile-shell'
import BottomNav, { type NavTab } from '@/components/layout/bottom-nav'

const routeByTab: Record<NavTab, string> = {
  home: '/home',
  board: '/community',
  map: '/map',
  album: '/album',
  profile: '/my',
}

function getActiveTab(pathname: string): NavTab {
  if (pathname.startsWith('/community')) return 'board'
  if (pathname.startsWith('/map')) return 'map'
  if (pathname.startsWith('/album')) return 'album'
  if (pathname.startsWith('/my')) return 'profile'
  return 'home'
}

export default function MainAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const activeTab = getActiveTab(pathname)
  const showBottomNav = !pathname.startsWith('/map')

  return (
    <MobileShell className="h-dvh min-h-0 overflow-hidden">
      {children}
      {showBottomNav && (
        <BottomNav
          active={activeTab}
          onChange={(tab) => router.push(routeByTab[tab])}
        />
      )}
    </MobileShell>
  )
}
