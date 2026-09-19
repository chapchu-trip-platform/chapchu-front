'use client'

import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

const VISIT_REQUEST_TIMEOUT_MS = 10_000

export async function visitCoursePlace(
  coursePlaceId: string,
  position: { latitude: number; longitude: number },
  signal?: AbortSignal
) {
  const normalizedCoursePlaceId = coursePlaceId.trim()
  if (!normalizedCoursePlaceId) {
    throw new Error('Course place ID is required.')
  }

  if (
    !Number.isFinite(position.latitude) ||
    !Number.isFinite(position.longitude)
  ) {
    throw new Error('Course place visit coordinates are invalid.')
  }

  await apiClient.patch(
    API_ENDPOINTS.coursePlaces.visit(normalizedCoursePlaceId),
    {
      lat: position.latitude,
      lng: position.longitude,
    },
    {
      signal,
      timeout: VISIT_REQUEST_TIMEOUT_MS,
      replayAfterAuthRefresh: true,
    }
  )
}
