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
        // Album detail can read courses created before these optional fields
        // were persisted. The last ordered stop is marked as the destination
        // by the detail screen, so a missing flag safely behaves as false.
        isFinal: place.finalPlace === true,
        ...(place.reason !== undefined ? { reason: place.reason } : {}),
        petPolicy: place.petPolicy ?? null,
      })),
  }
}
