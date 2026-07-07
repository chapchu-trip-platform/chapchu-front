// Common types for PawRoute app

export interface Pet {
  id: string
  name: string
  breed: string
  size: 'small' | 'medium' | 'large'
  age: number
  activities: string[]
  image?: string
}

export interface Place {
  id: string
  name: string
  address: string
  image: string
  rating: number
  reviews: number
  distance: string
  tags: string[]
  hours?: string
  petFriendlyScore?: number
  weatherScore?: number
  reason?: string
}

export interface Waypoint {
  id: string
  place: Place
  arrival: string
  departure: string
  note?: string
  photos?: Photo[]
  rating?: number
}

export interface Photo {
  id: string
  url: string
  title?: string
  content?: string
  location?: string
  timestamp: string
}

export interface Trip {
  id: string
  title: string
  startPlace: Place
  endPlace: Place
  pet: Pet
  waypoints: Waypoint[]
  distance: number
  duration: string
  weather: string
  temperature: number
  photos: Photo[]
  notes: string
}

export interface Post {
  id: string
  title: string
  author: string
  authorImage?: string
  content: string
  featuredImage: string
  views: number
  likes: number
  comments: number
  bookmarks: number
  date: string
  waypoints: Place[]
  pet: Pet
  route: string
  board: string
  locationPrivacy: 'precise' | 'approximate' | 'none'
}

export interface Album {
  id: string
  trip: Trip
  createdAt: string
  photoCount: number
  featured: Photo
}

export interface CourseDetail {
  from: string
  to: string
  distance: string
  duration: string
  route: string
  photos: Photo[]
}

export type AppScreen = 'splash' | 'onboarding' | 'login' | 'signup' | 'main'
export type MapFlow = null | 'setup' | 'route' | 'progress' | 'end' | 'error' | 'sharing'
export type NavTab = 'home' | 'map' | 'board' | 'album' | 'profile'
export type ErrorType =
  | 'location-denied'
  | 'location-request'
  | 'weather-failed'
  | 'no-routes'
  | 'no-places'
  | 'upload-failed'
  | 'session-expired'
