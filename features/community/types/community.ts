export interface Post {
  id: string
  petId: string | null
  photoId: string | null
  courseId: string | null
  title: string
  content: string
  nickname: string
  photoUrl: string | null
  viewCount: number
  recommendationCount: number
  recommended: boolean
  bookmarked: boolean
  commentCount: number
  createdAt: string | null
}

export interface PostPage {
  posts: Post[]
  nextCursor: string | null
}

export interface PostInput {
  petId: string
  photoId: string
  courseId: string
  title: string
  content: string
}

export interface Comment {
  id: string
  postId: string
  parentCommentId: string | null
  depth: number
  commentOrder: number
  content: string
  nickname: string | null
  deleted: boolean
  createdAt: string | null
}

export const REVIEW_WEATHER = ['SUNNY', 'CLOUDY', 'RAINY', 'SNOWY'] as const
export type ReviewWeather = (typeof REVIEW_WEATHER)[number]

export interface ReviewInput {
  placeId: string
  petId: string
  rating: number
  contents: string
  weather?: ReviewWeather | null
  coursePlaceId?: string | null
}

export interface Review extends ReviewInput {
  id: string
  weather: ReviewWeather | null
  coursePlaceId: string | null
  recommendationCount: number
  createdAt: string | null
}
