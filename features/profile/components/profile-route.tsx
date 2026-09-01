'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null)
  const [summary, setSummary] = useState<ProfileSummary | null>(null)
  const [status, setStatus] = useState<ProfileLoadStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const loadControllerRef = useRef<AbortController | null>(null)
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
    <>
      <ProfileScreen
        summary={summary}
        pets={pets}
        status={status}
        errorMessage={errorMessage}
        onRetry={retryProfile}
        onLogout={handleLogout}
        onOpenSettings={setSettingsTab}
        onLoadPetOptions={fetchPetOptions}
        onCreatePet={handleCreatePet}
        onUpdatePet={handleUpdatePet}
        onDeletePet={handleDeletePet}
        onWithdraw={handleWithdraw}
      />
      {settingsTab && (
        <div className="absolute inset-0 z-[60] bg-warm-beige flex flex-col">
          <ProfileSettings
            initialTab={settingsTab}
            currentNickname={summary?.nickname ?? ''}
            onNicknameSaved={handleSaveNickname}
            onBack={() => setSettingsTab(null)}
          />
        </div>
      )}
    </>
  )
}
