export interface CreateCourseRequestDto {
  lat: number
  lng: number
  radiusMeters: number
  travelDate: string
  startLocation: string
}

export interface CoursePlaceDto {
  coursePlaceId: string
  externalPlaceId: string
  placeName: string
  visitOrder: number
  finalPlace: boolean
}

export interface CourseDto {
  courseId: string
  travelDate: string
  startLocation: string
  places: CoursePlaceDto[]
}
