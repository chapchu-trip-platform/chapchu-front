'use client'

import { create } from 'zustand'

export type AuthStatus =
  | 'idle'
  | 'restoring'
  | 'authenticated'
  | 'unauthenticated'
  | 'demo'

interface AuthState {
  accessToken: string | null
  authNotice: 'logout-failed' | null
  registrationToken: string | null
  sessionEpoch: number
  setupStage: 'registration' | 'pet' | null
  status: AuthStatus
  setAccessToken: (accessToken: string) => void
  setAuthNotice: (authNotice: 'logout-failed' | null) => void
  setRegistrationToken: (registrationToken: string | null) => void
  setSetupStage: (setupStage: 'registration' | 'pet' | null) => void
  setStatus: (status: AuthStatus) => void
  startDemoSession: () => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  authNotice: null,
  registrationToken: null,
  sessionEpoch: 0,
  setupStage: null,
  status: 'idle',
  setAccessToken: (accessToken) =>
    set({
      accessToken,
      authNotice: null,
      registrationToken: null,
      setupStage: null,
      status: 'authenticated',
    }),
  setAuthNotice: (authNotice) => set({ authNotice }),
  setRegistrationToken: (registrationToken) => set({ registrationToken }),
  setSetupStage: (setupStage) => set({ setupStage }),
  setStatus: (status) => set({ status }),
  startDemoSession: () =>
    set((state) => ({
      accessToken: null,
      authNotice: null,
      registrationToken: null,
      sessionEpoch: state.sessionEpoch + 1,
      setupStage: null,
      status: 'demo',
    })),
  clearSession: () =>
    set((state) => ({
      accessToken: null,
      registrationToken: null,
      sessionEpoch: state.sessionEpoch + 1,
      setupStage: null,
      status: 'unauthenticated',
    })),
}))
