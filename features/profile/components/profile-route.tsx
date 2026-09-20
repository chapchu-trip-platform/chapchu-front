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
  fetchProfilePhoto,
  fetchProfileSummary,
  fetchStampCollection,
  getProfileErrorMessage,
  updateNickname,
  updatePet,
  updatePetPhoto,
  updateProfilePhoto,
  withdrawAccount,
} from '@/features/profile/api/profile-api'
import { savePhotos, uploadPhotoFiles } from '@/features/photos/api/photo-api'
import { isSupportedMetadataSafeImage } from '@/features/photos/lib/sanitize-image-file'
import { usePetStore } from '@/features/profile/stores/pet-store'
import type {
  PetMutationInput,
  ProfileLoadStatus,
  ProfilePhoto,
  ProfileSummary,
} from '@/features/profile/types/profile'

export default function ProfileRoute({ initialSettingsTab }: { initialSettingsTab?: SettingsTab }) {
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(initialSettingsTab ?? null)
  const [settingsLayerActive, setSettingsLayerActive] = useState(Boolean(initialSettingsTab))
  const [summary, setSummary] = useState<ProfileSummary | null>(null)
  const [profilePhoto, setProfilePhoto] = useState<ProfilePhoto | null>(null)
  const [status, setStatus] = useState<ProfileLoadStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const loadControllerRef = useRef<AbortController | null>(null)
  const photoMutationControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(false)
  const settingsPanelRef = useRef<HTMLDivElement | null>(null)
  const settingsTriggerRef = useRef<HTMLElement | null>(null)
  const pets = usePetStore((state) => state.pets)
  const setPets = usePetStore((state) => state.setPets)
  const upsertPet = usePetStore((state) => state.upsertPet)
  const removePet = usePetStore((state) => state.removePet)

  const requestProfile = useCallback((controller: AbortController) => {
    const sessionEpoch = useAuthStore.getState().sessionEpoch
    const isCurrent = () => !controller.signal.aborted &&
      mountedRef.current && useAuthStore.getState().sessionEpoch === sessionEpoch
    loadControllerRef.current?.abort()
    loadControllerRef.current = controller
    setPets([])

    void Promise.all([
      fetchProfileSummary(controller.signal),
      fetchPets(controller.signal),
      fetchProfilePhoto(controller.signal),
    ])
      .then(([nextSummary, nextPets, nextProfilePhoto]) => {
        if (!isCurrent()) return
        setSummary(nextSummary)
        setPets(nextPets)
        setProfilePhoto(nextProfilePhoto)
        setStatus('success')
      })
      .catch((error: unknown) => {
        if (!isCurrent()) return
        setPets([])
        setProfilePhoto(null)
        setErrorMessage(getProfileErrorMessage(error))
        setStatus('error')
      })
  }, [setPets])

  useEffect(() => {
    mountedRef.current = true
    const sessionEpoch = useAuthStore.getState().sessionEpoch
    const controller = new AbortController()
    requestProfile(controller)
    return () => {
      mountedRef.current = false
      loadControllerRef.current?.abort()
      photoMutationControllerRef.current?.abort()
      if (useAuthStore.getState().sessionEpoch === sessionEpoch) {
        usePetStore.getState().setPets([])
      }
    }
  }, [requestProfile])

  const closeSettings = useCallback(() => {
    const closingTab = settingsTab
    setSettingsTab(null)
    if (closingTab === 'posts') router.replace('/my', { scroll: false })
  }, [router, settingsTab])

  const openSettings = useCallback((tab: SettingsTab) => {
    settingsTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    setSettingsLayerActive(true)
    setSettingsTab(tab)
    if (tab === 'posts') router.replace('/my?section=posts', { scroll: false })
  }, [router])

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
      'a[href]:not([tabindex="-1"]), button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

  const assertActiveSession = (sessionEpoch: number) => {
    if (!mountedRef.current || useAuthStore.getState().sessionEpoch !== sessionEpoch) {
      throw new DOMException('Profile session changed.', 'AbortError')
    }
  }

  const handleLogout = async () => {
    // logout revokes the local session synchronously before its remote request.
    const request = logout()
    const logoutEpoch = useAuthStore.getState().sessionEpoch
    usePetStore.getState().setPets([])
    try {
      await request
    } catch {
      // Local auth state is cleared by logout even when the BFF is unavailable.
    } finally {
      if (mountedRef.current && useAuthStore.getState().sessionEpoch === logoutEpoch) {
        usePetStore.getState().setPets([])
        router.replace('/login')
      }
    }
  }

  const handleSaveNickname = async (nickname: string) => {
    const sessionEpoch = useAuthStore.getState().sessionEpoch
    const currentNickname = summary?.nickname ?? ''
    const savedNickname = await updateNickname(currentNickname, nickname)
    assertActiveSession(sessionEpoch)
    setSummary((current) =>
      current ? { ...current, nickname: savedNickname } : current
    )
    return savedNickname
  }

  const handleCreatePet = async (input: PetMutationInput) => {
    const sessionEpoch = useAuthStore.getState().sessionEpoch
    const pet = await createPet(input)
    assertActiveSession(sessionEpoch)
    upsertPet(pet)
    setSummary((current) =>
      current ? { ...current, petCount: current.petCount + 1 } : current
    )
    return pet
  }

  const handleUpdatePet = async (petId: string, input: PetMutationInput) => {
    const sessionEpoch = useAuthStore.getState().sessionEpoch
    const pet = await updatePet(petId, input)
    assertActiveSession(sessionEpoch)
    upsertPet(pet)
    return pet
  }

  const handleDeletePet = async (petId: string) => {
    const sessionEpoch = useAuthStore.getState().sessionEpoch
    await deletePet(petId)
    assertActiveSession(sessionEpoch)
    removePet(petId)
    setSummary((current) =>
      current ? { ...current, petCount: Math.max(0, current.petCount - 1) } : current
    )
  }

  const handleUpdatePetPhoto = async (petId: string, file: File | null) => {
    const sessionEpoch = useAuthStore.getState().sessionEpoch
    if (file && !isSupportedMetadataSafeImage(file)) {
      throw new Error('Pet profile image type was invalid.')
    }
    photoMutationControllerRef.current?.abort()
    const controller = new AbortController()
    photoMutationControllerRef.current = controller
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.sessionEpoch !== sessionEpoch) controller.abort()
    })
    try {
      let photoId: string | null = null
      if (file) {
        const [ticket] = await uploadPhotoFiles([file], 'PROFILE', controller.signal)
        assertActiveSession(sessionEpoch)
        const [savedPhoto] = await savePhotos([{ photoKey: ticket.photoKey }], controller.signal)
        assertActiveSession(sessionEpoch)
        photoId = savedPhoto.id
      }
      const pet = await updatePetPhoto(petId, photoId, controller.signal)
      assertActiveSession(sessionEpoch)
      upsertPet(pet)
      return pet
    } finally {
      unsubscribe()
      if (photoMutationControllerRef.current === controller) {
        photoMutationControllerRef.current = null
      }
    }
  }

  const handleUpdateProfilePhoto = async (file: File | null) => {
    const sessionEpoch = useAuthStore.getState().sessionEpoch
    photoMutationControllerRef.current?.abort()
    const controller = new AbortController()
    photoMutationControllerRef.current = controller
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (state.sessionEpoch !== sessionEpoch) controller.abort()
    })
    try {
      let photoId: string | null = null
      if (file) {
        const [ticket] = await uploadPhotoFiles([file], 'PROFILE', controller.signal)
        assertActiveSession(sessionEpoch)
        const [savedPhoto] = await savePhotos([{ photoKey: ticket.photoKey }], controller.signal)
        assertActiveSession(sessionEpoch)
        photoId = savedPhoto.id
      }
      const nextPhoto = await updateProfilePhoto(photoId, controller.signal)
      assertActiveSession(sessionEpoch)
      setProfilePhoto(nextPhoto)
      return nextPhoto
    } finally {
      unsubscribe()
      if (photoMutationControllerRef.current === controller) {
        photoMutationControllerRef.current = null
      }
    }
  }

  const handleWithdraw = async () => {
    const sessionEpoch = useAuthStore.getState().sessionEpoch
    await withdrawAccount()
    assertActiveSession(sessionEpoch)
    await handleLogout()
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
          profilePhoto={profilePhoto}
          pets={pets}
          status={status}
          errorMessage={errorMessage}
          onRetry={retryProfile}
          onLogout={handleLogout}
          onOpenSettings={openSettings}
          onLoadPetOptions={fetchPetOptions}
          onLoadStamps={fetchStampCollection}
          onCreatePet={handleCreatePet}
          onUpdatePet={handleUpdatePet}
          onUpdatePetPhoto={handleUpdatePetPhoto}
          onDeletePet={handleDeletePet}
          onUpdateProfilePhoto={handleUpdateProfilePhoto}
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
