'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ProfileScreen from '@/components/screens/profile-screen'
import ProfileSettings, { type SettingsTab } from '@/components/screens/profile-settings-screens'
import { logout } from '@/features/auth/api/auth-api'

export default function ProfileRoute() {
  const router = useRouter()
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null)

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Local auth state is cleared by logout even when the BFF is unavailable.
    } finally {
      router.replace('/login')
    }
  }

  return (
    <>
      <ProfileScreen onLogout={handleLogout} onOpenSettings={setSettingsTab} />
      {settingsTab && (
        <div className="absolute inset-0 z-[60] bg-warm-beige flex flex-col">
          <ProfileSettings
            initialTab={settingsTab}
            onBack={() => setSettingsTab(null)}
          />
        </div>
      )}
    </>
  )
}
