'use client'

import Link from 'next/link'
import { Home, BookOpen, MapPin, Image, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavTab = 'home' | 'board' | 'map' | 'album' | 'profile'

interface BottomNavProps {
  active: NavTab
  onReselect?: (tab: NavTab) => void
}

const tabs: { id: NavTab; icon: React.ElementType; label: string; href: string }[] = [
  { id: 'home', icon: Home, label: '홈', href: '/home' },
  { id: 'board', icon: BookOpen, label: '게시판', href: '/community' },
  { id: 'map', icon: MapPin, label: '지도', href: '/map' },
  { id: 'album', icon: Image, label: '앨범', href: '/album' },
  { id: 'profile', icon: User, label: '내정보', href: '/my' },
]

export default function BottomNav({ active, onReselect }: BottomNavProps) {
  return (
    <nav data-bottom-nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div className="w-full max-w-[430px] border-t border-border bg-card-surface">
        <div className="safe-bottom-nav flex items-end justify-around px-2 pt-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = active === tab.id
            const isMap = tab.id === 'map'

            if (isMap) {
              return (
                <Link
                  key={tab.id}
                  href={tab.href}
                  onClick={(event) => {
                    if (!isActive) return
                    onReselect?.(tab.id)
                    if (tab.id === 'album' || tab.id === 'profile') event.preventDefault()
                  }}
                  className="flex flex-col items-center -mt-5"
                  aria-label={tab.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <div
                    className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all',
                      isActive
                        ? 'bg-sage-green shadow-sage-green/30'
                        : 'bg-sage-green shadow-sage-green/20'
                    )}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span
                    className={cn(
                      'text-[10px] mt-1 font-medium',
                      isActive ? 'text-sage-green' : 'text-warm-gray'
                    )}
                  >
                    {tab.label}
                  </span>
                </Link>
              )
            }

            return (
              <Link
                key={tab.id}
                href={tab.href}
                onClick={(event) => {
                  if (!isActive) return
                  onReselect?.(tab.id)
                  if (tab.id === 'album' || tab.id === 'profile') event.preventDefault()
                }}
                className="flex flex-col items-center gap-1 py-1 px-3"
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors',
                    isActive ? 'text-sage-green' : 'text-warm-gray'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-medium transition-colors',
                    isActive ? 'text-sage-green' : 'text-warm-gray'
                  )}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
