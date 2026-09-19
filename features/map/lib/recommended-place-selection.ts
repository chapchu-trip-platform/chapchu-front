import type { RecommendedPlace } from '@/features/map/types/recommended-place'

export function toggleRecommendedPlaceSelection(
  selectedPlaceId: string | null,
  placeId: string
) {
  return selectedPlaceId === placeId ? null : placeId
}

export function getSelectedRecommendedPlace(
  places: RecommendedPlace[],
  selectedPlaceId: string | null
) {
  if (!selectedPlaceId) return null
  return places.find((place) => place.externalPlaceId === selectedPlaceId) ?? null
}
