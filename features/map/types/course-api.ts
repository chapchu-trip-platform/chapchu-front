export interface CreateCourseRequestDto {
  petId: string
  travelDate: string
  startLocation: string
  startLat: number
  startLng: number
  endLocation: string
  endLat: number
  endLng: number
  intermediateStopCount: number
  temperature?: number
  humidity?: number
  weatherStatus?: string
}

export interface CoursePlaceDto {
  coursePlaceId: string
  externalPlaceId: string
  placeName: string
  placeImageUrl: string | null
  latitude: number
  longitude: number
  visitOrder: number
  finalPlace: boolean
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
