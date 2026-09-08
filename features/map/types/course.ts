export interface RecommendedCoursePlace {
  id: string
  externalPlaceId: string
  name: string
  imageUrl: string | null
  latitude: number
  longitude: number
  visitOrder: number
  isFinal: boolean
  petPolicy: unknown
}

export interface RecommendedCourse {
  id: string
  travelDate: string
  startLocation: string
  endLocation: string
  places: RecommendedCoursePlace[]
}
