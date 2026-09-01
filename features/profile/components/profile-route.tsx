'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, LazyMotion, domMax, m, useReducedMotion } from 'motion/react'
import ProfileScreen from '@/components/screens/profile-screen'
import ProfileSettings, { type SettingsTab } from '@/components/screens/profile-settings-screens'
import { logout } from '@/features/auth/api/auth-api'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import {
  createPet,
  deletePet,
  fetchPetOptions,
  fetchPets,
  fetchProfileSummary,
  getProfileErrorMessage,
  updateNickname,
  updatePet,
  withdrawAccount,
} from '@/features/profile/api/profile-api'
import { usePetStore } from '@/features/profile/stores/pet-store'
import type {
  PetMutationInput,
  ProfileLoadStatus,
  ProfileSummary,
} from '@/features/profile/types/profile'

export default function ProfileRoute() {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null)
  const [settingsLayerActive, setSettingsLayerActive] = useState(false)
  const [summary, setSummary] = useState<ProfileSummary | null>(null)
  const [status, setStatus] = useState<ProfileLoadStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const loadControllerRef = useRef<AbortController | null>(null)
  const settingsPanelRef = useRef<HTMLDivElement | null>(null)
  const settingsTriggerRef = useRef<HTMLElement | null>(null)
  const pets = usePetStore((state) => state.pets)
  const setPets = usePetStore((state) => state.setPets)
  const upsertPet = usePetStore((state) => state.upsertPet)
  const removePet = usePetStore((state) => state.removePet)

  const requestProfile = useCallback((controller: AbortController) => {
    loadControllerRef.current?.abort()
    loadControllerRef.current = controller
    setPets([])

    void Promise.all([
      fetchProfileSummary(controller.signal),
      fetchPets(controller.signal),
    ])
      .then(([nextSummary, nextPets]) => {
        if (controller.signal.aborted) return
        setSummary(nextSummary)
        setPets(nextPets)
        setStatus('success')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setPets([])
        setErrorMessage(getProfileErrorMessage(error))
        setStatus('error')
      })
  }, [setPets])

  useEffect(() => {
    const controller = new AbortController()
    requestProfile(controller)
    return () => {
      loadControllerRef.current?.abort()
      usePetStore.getState().setPets([])
    }
  }, [requestProfile])

  const closeSettings = useCallback(() => setSettingsTab(null), [])

  const openSettings = useCallback((tab: SettingsTab) => {
    settingsTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    setSettingsLayerActive(true)
    setSettingsTab(tab)
  }, [])

  useEffect(() => {
    if (!settingsLayerActive) return
    const bottomNav = document.querySelector<HTMLElement>('[data-bottom-nav]')
    const previousAriaHidden = bottomNav?.getAttribute('aria-hidden')
    bottomNav?.setAttribute('inert', '')
    bottomNav?.setAttribute('aria-hidden', 'true')

    return () => {
      bottomNav?.removeAttribute('inert')
      if (previousAriaHidden === null) bottomNav?.removeAttribute('aria-hidden')
      else if (previousAriaHidden !== undefined) {
        bottomNav?.setAttribute('aria-hidden', previousAriaHidden)
      }
    }
  }, [settingsLayerActive])

  useEffect(() => {
    if (settingsLayerActive || settingsTab || !settingsTriggerRef.current) return
    const trigger = settingsTriggerRef.current
    settingsTriggerRef.current = null
    trigger.focus()
  }, [settingsLayerActive, settingsTab])

  useEffect(() => {
    if (!settingsTab) return
    const panel = settingsPanelRef.current
    if (!panel) return

    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusableElements = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector))
    focusableElements()[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeSettings()
        return
      }
      if (event.key !== 'Tab') return

      const elements = focusableElements()
      if (elements.length === 0) return
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [closeSettings, settingsTab])

  const retryProfile = useCallback(() => {
    setStatus('loading')
    setErrorMessage(null)
    requestProfile(new AbortController())
  }, [requestProfile])

  const handleLogout = async () => {
    try {
      await logout()
    } catch {
      // Local auth state is cleared by logout even when the BFF is unavailable.
    } finally {
      usePetStore.getState().setPets([])
      router.replace('/login')
    }
  }

  const handleSaveNickname = async (nickname: string) => {
    const currentNickname = summary?.nickname ?? ''
    const savedNickname = await updateNickname(currentNickname, nickname)
    setSummary((current) =>
      current ? { ...current, nickname: savedNickname } : current
    )
    return savedNickname
  }

  const handleCreatePet = async (input: PetMutationInput) => {
    const pet = await createPet(input)
    upsertPet(pet)
    setSummary((current) =>
      current ? { ...current, petCount: current.petCount + 1 } : current
    )
    return pet
  }

  const handleUpdatePet = async (petId: string, input: PetMutationInput) => {
    const pet = await updatePet(petId, input)
    upsertPet(pet)
    return pet
  }

  const handleDeletePet = async (petId: string) => {
    await deletePet(petId)
    removePet(petId)
    setSummary((current) =>
      current ? { ...current, petCount: Math.max(0, current.petCount - 1) } : current
    )
  }

  const handleWithdraw = async () => {
    await withdrawAccount()
    try {
      await logout()
    } catch {
      // The local session remains revoked even if the cookie logout request fails.
      useAuthStore.getState().clearSession()
    } finally {
      usePetStore.getState().setPets([])
      router.replace('/login')
    }
  }

  return (
    <LazyMotion features={domMax}>
      <div
        className="contents"
        aria-hidden={settingsLayerActive || undefined}
        inert={settingsLayerActive || undefined}
      >
        <ProfileScreen
          summary={summary}
          pets={pets}
          status={status}
          errorMessage={errorMessage}
          onRetry={retryProfile}
          onLogout={handleLogout}
          onOpenSettings={openSettings}
          onLoadPetOptions={fetchPetOptions}
          onCreatePet={handleCreatePet}
          onUpdatePet={handleUpdatePet}
          onDeletePet={handleDeletePet}
          onWithdraw={handleWithdraw}
        />
      </div>
      <AnimatePresence
        initial={false}
        onExitComplete={() => {
          setSettingsLayerActive(false)
        }}
      >
        {settingsTab && (
          <m.div
            ref={settingsPanelRef}
            key={settingsTab}
            role="dialog"
            aria-modal="true"
            aria-label="내정보 설정"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: '100%' }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-0 z-[60] flex flex-col bg-warm-beige"
          >
            <ProfileSettings
              initialTab={settingsTab}
              currentNickname={summary?.nickname ?? ''}
              onNicknameSaved={handleSaveNickname}
              onBack={closeSettings}
            />
          </m.div>
        )}
      </AnimatePresence>
    </LazyMotion>
  )
}
