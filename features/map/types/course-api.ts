export interface CreateCourseRequestDto {
  petId: string
  travelDate: string
  startLocation: string
  startLat: number
  startLng: number
  destination: RecommendedPlaceDto
  temperature?: number
  humidity?: number
  weatherStatus?: string
}

export interface RecommendedPlacesRequestDto {
  petId: string
  lat: number
  lng: number
  radiusMeters: number
  limit: number
  temperature?: number
  humidity?: number
  weatherStatus?: string
}

export interface RecommendedPlaceDto {
  externalPlaceId: string
  placeName: string
  placeImageUrl: string | null
  latitude: number
  longitude: number
  address: string
  categoryLabel: string
  indoorOutdoorType: string
  allowedPetSize: string | null
  leashRequired: boolean | null
  carrierRequired: boolean | null
  placeCaution: string | null
}

export interface CoursePlaceDto {
  coursePlaceId: string
  externalPlaceId: string | null
  placeName: string
  placeImageUrl: string | null
  latitude: number
  longitude: number
  visitOrder: number
  finalPlace: boolean
  reason?: string | null
  petPolicy: unknown
}

export interface CourseDto {
  courseId: string
  travelDate: string
  startLocation: string
  endLocation: string
  places: CoursePlaceDto[]
}

export interface CourseWeatherInput {
  temperature?: number
  humidity?: number
  weatherStatus?: string
}
