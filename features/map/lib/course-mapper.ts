import type { CourseDto } from '@/features/map/types/course-api'
import type { RecommendedCourse } from '@/features/map/types/course'

export function mapCourse(dto: CourseDto): RecommendedCourse {
  return {
    id: dto.courseId,
    travelDate: dto.travelDate,
    startLocation: dto.startLocation.trim(),
    endLocation: dto.endLocation.trim(),
    places: [...dto.places]
      .sort((first, second) => first.visitOrder - second.visitOrder)
      .map((place) => ({
        id: place.coursePlaceId,
        externalPlaceId: place.externalPlaceId,
        name: place.placeName.trim(),
        imageUrl: place.placeImageUrl,
        latitude: place.latitude,
        longitude: place.longitude,
        visitOrder: place.visitOrder,
        isFinal: place.finalPlace,
        ...(place.reason !== undefined ? { reason: place.reason } : {}),
        petPolicy: place.petPolicy,
      })),
  }
}
