const PENDING_NAVIGATION_KEY = 'chapchu:written-post-navigation'
const HISTORY_POST_KEY = 'chapchuWrittenPostId'
const NAVIGATION_MAX_AGE_MS = 30_000

export function markWrittenPostNavigation(postId: string) {
  try {
    window.sessionStorage.setItem(PENDING_NAVIGATION_KEY, JSON.stringify({
      postId,
      createdAt: Date.now(),
    }))
  } catch {
    // The detail route safely falls back to the written-post list when storage is unavailable.
  }
}

export function confirmWrittenPostHistory(postId: string) {
  const currentState = window.history.state
  if (currentState && typeof currentState === 'object' && currentState[HISTORY_POST_KEY] === postId) {
    return true
  }

  let pending: unknown
  try {
    const serialized = window.sessionStorage.getItem(PENDING_NAVIGATION_KEY)
    window.sessionStorage.removeItem(PENDING_NAVIGATION_KEY)
    pending = serialized ? JSON.parse(serialized) : null
  } catch {
    return false
  }

  if (!pending || typeof pending !== 'object') return false
  const marker = pending as { postId?: unknown; createdAt?: unknown }
  if (marker.postId !== postId || typeof marker.createdAt !== 'number') return false
  if (Date.now() - marker.createdAt > NAVIGATION_MAX_AGE_MS) return false

  const nextState = currentState && typeof currentState === 'object' ? currentState : {}
  window.history.replaceState({ ...nextState, [HISTORY_POST_KEY]: postId }, '', window.location.href)
  return true
}
