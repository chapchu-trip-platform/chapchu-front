export interface RecommendedPlace {
  externalPlaceId: string
  name: string
  imageUrl: string | null
  latitude: number
  longitude: number
  address: string
  category: string
  indoorOutdoorType: string
  allowedPetSize: string | null
  leashRequired: boolean | null
  carrierRequired: boolean | null
  caution: string | null
}

export interface RecommendedPlaceDetails {
  address?: string | null
  businessHours: string | null
  category?: string | null
  phoneNumber: string | null
  rating: number | null
  reviewCount: number | null
  visitCount: number | null
  petPolicy: unknown | null
}
