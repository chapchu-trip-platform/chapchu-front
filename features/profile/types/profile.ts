import type { BreedOption, NamedOption, PetSize } from '@/features/auth/types/signup'

export type ProfileLoadStatus = 'loading' | 'success' | 'error'

export interface ProfileSummary {
  nickname: string
  email: string
  petCount: number
}

export interface ProfilePet {
  id: string
  petName: string
  breedId: number | null
  breedName: string
  size: PetSize
  age: number
  activities: NamedOption[]
}

export interface PetOptions {
  breeds: BreedOption[]
  activities: NamedOption[]
}

export interface PetMutationInput {
  petName: string
  breedId: number
  size: PetSize
  age: number
  activityIds: string[]
}

export interface ProfilePost {
  id: string
  title: string
  content: string
  viewCount: number
  recommendationCount: number
  commentCount: number
  nickname: string
  photoUrl: string | null
  createdAt: string | null
}

export interface WishlistPlace {
  placeId: string
  createdAt: string | null
  placeName: string
  address: string
  rating: number
  reviewCount: number
}

export interface ProfileReview {
  id: string
  placeId: string
  petId: string
  rating: number
  contents: string
  weather: 'SUNNY' | 'CLOUDY' | 'RAINY' | 'SNOWY' | null
  recommendationCount: number
  createdAt: string | null
  coursePlaceId: string | null
}

interface ProfileStampBase {
  id: string
  region: string
  color: string
  mascot: string
}

export type ProfileStamp = ProfileStampBase &
  (
    | { acquired: true; date: string; count: number }
    | { acquired: false; date: null; count: 0 }
  )

export interface ProfileMemoryAlbum {
  id: string
  petName: string
  breed: string
  period: string
  coverImage: string
  albumCount: number
  note: string
}
