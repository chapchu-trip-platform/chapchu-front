// Optional presentation data; the current course creation API does not supply it.
export interface CoursePlaceDetails {
  address?: string
  hours?: string
  rating?: number
  reviewCount?: number
  category?: string
  petFriendly?: boolean
  reviews?: { author: string; text: string; rating: number }[]
}

export interface RecommendedCoursePlace {
  id: string
  externalPlaceId: string
  name: string
  imageUrl: string | null
  latitude: number
  longitude: number
  visitOrder: number
  isFinal: boolean
  reason?: string | null
  petPolicy: unknown
  details?: CoursePlaceDetails
}

export interface RecommendedCourse {
  id: string
  travelDate: string
  startLocation: string
  endLocation: string
  places: RecommendedCoursePlace[]
}
