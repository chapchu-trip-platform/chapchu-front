export interface RecommendedCoursePlace {
  id: string
  externalPlaceId: string
  name: string
  visitOrder: number
  isFinal: boolean
}

export interface RecommendedCourse {
  id: string
  travelDate: string
  startLocation: string
  places: RecommendedCoursePlace[]
}
