'use client'

import { useEffect } from 'react'
import {
  initializeDiagnosticPublisher,
  publishDiagnosticEvent,
  subscribeToAuthStateRequests,
} from '@/features/devtools/lib/dev-diagnostics'
import { useAuthStore } from '@/features/auth/stores/auth-store'

function getAuthSnapshot() {
  const state = useAuthStore.getState()
  return {
    accessToken: state.accessToken ? '[REDACTED]' : null,
    authNotice: state.authNotice,
    registrationToken: state.registrationToken ? '[REDACTED]' : null,
    sessionEpoch: state.sessionEpoch,
    setupStage: state.setupStage,
    status: state.status,
  }
}

function publishAuthSnapshot(summary: string, changedKeys: string[] = []) {
  publishDiagnosticEvent({
    kind: 'state',
    summary,
    details: {
      store: 'auth-store',
      changedKeys,
      state: getAuthSnapshot(),
    },
  })
}

export default function DevDiagnosticsBridge() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return

    initializeDiagnosticPublisher()
    publishAuthSnapshot('STATE auth-store initialized')
    const unsubscribeStore = useAuthStore.subscribe((state, previousState) => {
      const observedKeys = [
        'accessToken',
        'authNotice',
        'registrationToken',
        'sessionEpoch',
        'setupStage',
        'status',
      ] as const
      const changedKeys = observedKeys.filter(
        (key) => state[key] !== previousState[key]
      )
      if (changedKeys.length > 0) {
        publishAuthSnapshot(
          `STATE auth-store changed: ${changedKeys.join(', ')}`,
          [...changedKeys]
        )
      }
    })
    const unsubscribeRequests = subscribeToAuthStateRequests(() => {
      publishAuthSnapshot('STATE auth-store snapshot requested')
    })

    return () => {
      unsubscribeStore()
      unsubscribeRequests()
    }
  }, [])

  return null
}
