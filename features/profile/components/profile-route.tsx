'use client'

import { useState } from 'react'
import ProfileScreen from '@/components/screens/profile-screen'
import ProfileSettings, { type SettingsTab } from '@/components/screens/profile-settings-screens'

export default function ProfileRoute() {
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null)

  return (
    <>
      <ProfileScreen onOpenSettings={setSettingsTab} />
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
