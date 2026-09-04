'use client'

import { create } from 'zustand'
import { useAuthStore } from '@/features/auth/stores/auth-store'

export const POST_TITLE_LIMIT = 500
export const POST_CONTENT_LIMIT = 20_000

interface PostDraftState {
  title: string
  content: string
  update: (draft: Partial<Pick<PostDraftState, 'title' | 'content'>>) => void
  clear: () => void
}

// Deliberately memory-only: never carry unpublished content across login sessions.
export const usePostDraftStore = create<PostDraftState>((set) => ({
  title: '',
  content: '',
  update: (draft) => set(draft),
  clear: () => set({ title: '', content: '' }),
}))

useAuthStore.subscribe((state, previous) => {
  if (state.sessionEpoch !== previous.sessionEpoch ||
      (state.status !== previous.status && state.status !== 'authenticated' && state.status !== 'demo')) {
    usePostDraftStore.getState().clear()
  }
})
