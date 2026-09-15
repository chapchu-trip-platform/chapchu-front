import type { SearchableLocation } from '@/features/location/types/location'

export const RECENT_LOCATIONS_STORAGE_KEY = 'chapchu.location.recent-searches.v1'
export const MAX_RECENT_LOCATIONS = 10
export const RECENT_LOCATION_RETENTION_MS = 30 * 24 * 60 * 60 * 1_000

const MAX_ID_LENGTH = 200
const MAX_NAME_LENGTH = 200
const MAX_ADDRESS_LENGTH = 500

export interface RecentLocation {
  id: string
  name: string
  address: string
  savedAt: number
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLength
  )
}

function isRecentLocation(value: unknown): value is RecentLocation {
  if (!value || typeof value !== 'object') return false
  const location = value as Partial<RecentLocation>
  return (
    isBoundedString(location.id, MAX_ID_LENGTH) &&
    isBoundedString(location.name, MAX_NAME_LENGTH) &&
    isBoundedString(location.address, MAX_ADDRESS_LENGTH) &&
    typeof location.savedAt === 'number' &&
    Number.isFinite(location.savedAt)
  )
}

export function toRecentLocation(
  location: SearchableLocation,
  savedAt = Date.now()
): RecentLocation {
  return {
    id: location.id,
    name: location.name,
    address: location.address,
    savedAt,
  }
}

export function loadRecentLocations(now = Date.now()): RecentLocation[] {
  if (typeof window === 'undefined') return []

  try {
    const serialized = window.localStorage.getItem(RECENT_LOCATIONS_STORAGE_KEY)
    if (!serialized) return []
    const parsed: unknown = JSON.parse(serialized)
    if (!Array.isArray(parsed)) return []

    const seenIds = new Set<string>()
    return parsed
      .filter(isRecentLocation)
      .filter((location) => {
        if (
          location.savedAt > now ||
          now - location.savedAt > RECENT_LOCATION_RETENTION_MS ||
          seenIds.has(location.id)
        ) {
          return false
        }
        seenIds.add(location.id)
        return true
      })
      .slice(0, MAX_RECENT_LOCATIONS)
  } catch {
    return []
  }
}

export function saveRecentLocations(locations: RecentLocation[]) {
  if (typeof window === 'undefined') return

  try {
    if (locations.length === 0) {
      window.localStorage.removeItem(RECENT_LOCATIONS_STORAGE_KEY)
      return
    }
    window.localStorage.setItem(
      RECENT_LOCATIONS_STORAGE_KEY,
      JSON.stringify(locations.slice(0, MAX_RECENT_LOCATIONS))
    )
  } catch {
    // Search remains usable when storage is unavailable or full.
  }
}
