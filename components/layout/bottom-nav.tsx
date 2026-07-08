'use client'

import { Home, BookOpen, MapPin, Image, User } from 'lucide-react'
import { cn } from '@/lib/utils'

export type NavTab = 'home' | 'board' | 'map' | 'album' | 'profile'

interface BottomNavProps {
  active: NavTab
  onChange: (tab: NavTab) => void
}

const tabs: { id: NavTab; icon: React.ElementType; label: string }[] = [
  { id: 'home', icon: Home, label: '홈' },
  { id: 'board', icon: BookOpen, label: '게시판' },
  { id: 'map', icon: MapPin, label: '지도' },
  { id: 'album', icon: Image, label: '앨범' },
  { id: 'profile', icon: User, label: '내정보' },
]

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
      <div className="w-full max-w-[390px] bg-card-surface border-t border-border">
        <div className="flex items-end justify-around px-2 pb-safe pt-2">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = active === tab.id
            const isMap = tab.id === 'map'

            if (isMap) {
              return (
                <button
                  key={tab.id}
                  onClick={() => onChange(tab.id)}
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
                </button>
              )
            }

            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
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
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
