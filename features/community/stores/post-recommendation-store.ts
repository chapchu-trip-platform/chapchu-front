'use client'

import { create } from 'zustand'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { setPostRecommendation } from '@/features/community/api/community-api'

interface RecommendationState {
  value?: boolean
  pending: boolean
}

interface PostRecommendationStore {
  byPost: Record<string, RecommendationState>
  generation: number
  change: (postId: string, enabled: boolean) => Promise<void>
  reset: () => void
}

// The API has no recommended-by-me read field. Keep only confirmed writes in this
// login session; undefined still means unknown, not "not recommended".
export const usePostRecommendationStore = create<PostRecommendationStore>((set, get) => ({
  byPost: {},
  generation: 0,
  reset: () => set(state => ({ byPost: {}, generation: state.generation + 1 })),
  change: async (postId, enabled) => {
    if (get().byPost[postId]?.pending) throw new Error('A recommendation request is already pending.')
    const epoch = useAuthStore.getState().sessionEpoch
    const generation = get().generation
    const sameSession = () => useAuthStore.getState().sessionEpoch === epoch && get().generation === generation
    set(state => ({ byPost: { ...state.byPost, [postId]: { ...state.byPost[postId], pending: true } } }))
    try {
      await setPostRecommendation(postId, enabled)
      // Record success even if the detail has unmounted, before any count refresh.
      if (sameSession()) {
        set(state => ({ byPost: { ...state.byPost, [postId]: { value: enabled, pending: true } } }))
      }
    } finally {
      if (sameSession()) {
        set(state => ({ byPost: { ...state.byPost, [postId]: { ...state.byPost[postId], pending: false } } }))
      }
    }
  },
}))

useAuthStore.subscribe((state, previous) => {
  if (state.sessionEpoch !== previous.sessionEpoch ||
      (state.status !== previous.status && state.status !== 'authenticated' && state.status !== 'demo')) {
    usePostRecommendationStore.getState().reset()
  }
})
