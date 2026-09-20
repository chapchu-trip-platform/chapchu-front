import type { RecommendedCourse } from '@/features/map/types/course'

export interface AlbumPhoto {
  photoId: string
  downloadUrl: string
  takenAt: string | null
  createdAt?: string | null
  externalPlaceId: string | null
  isPublic: boolean
}

export interface AlbumSummary {
  courseId: string
  travelDate: string | null
  petId: string | null
  photos: AlbumPhoto[]
}

export interface AlbumReview {
  reviewId: string
  rating: number
  contents: string
  weather: string | null
  createdAt: string | null
}

export interface AlbumStop {
  coursePlaceId: string
  externalPlaceId: string
  placeName: string
  visitOrder: number
  imageUrl: string | null
  review: AlbumReview | null
  photos: AlbumPhoto[]
}

export interface AlbumDetail {
  summary: AlbumSummary
  course: RecommendedCourse
  stops: AlbumStop[]
}
