'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import MobileShell from '@/components/layout/mobile-shell'
import BottomNav, { type NavTab } from '@/components/layout/bottom-nav'
import { refreshAccessToken } from '@/lib/api/client'
import { useAuthStore } from '@/features/auth/stores/auth-store'

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
  const status = useAuthStore((state) => state.status)
  const activeTab = getActiveTab(pathname)
  const showBottomNav = !pathname.startsWith('/map') && pathname !== '/community/write'

  const demoSessionAllowed = status === 'demo' && process.env.NODE_ENV !== 'production'

  useEffect(() => {
    if (status === 'authenticated' || demoSessionAllowed || status === 'restoring') return

    if (status === 'unauthenticated') {
      router.replace('/login')
      return
    }

    useAuthStore.getState().setStatus('restoring')
    refreshAccessToken().catch(() => router.replace('/login'))
  }, [demoSessionAllowed, router, status])

  if (status !== 'authenticated' && !demoSessionAllowed) {
    return (
      <MobileShell className="h-dvh min-h-0 overflow-hidden">
        <div className="flex flex-1 items-center justify-center bg-warm-beige">
          <p className="text-[13px] text-warm-gray">로그인 상태를 확인하고 있어요…</p>
        </div>
      </MobileShell>
    )
  }

  return (
    <MobileShell className="h-dvh min-h-0 overflow-hidden">
      {children}
      {showBottomNav && (
        <BottomNav
          active={activeTab}
          onReselect={(tab) => {
            if (tab === 'home') window.dispatchEvent(new Event('home-return-to-root'))
            if (tab === 'board') window.dispatchEvent(new Event('board-return-to-root'))
            if (tab === 'album') window.dispatchEvent(new Event('album-return-to-root'))
            if (tab === 'profile') window.dispatchEvent(new Event('profile-return-to-root'))
          }}
        />
      )}
    </MobileShell>
  )
}
