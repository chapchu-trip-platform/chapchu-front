export interface TravelStamp {
  stampId: string
  stampName: string
  imageUrl: string | null
  acquired: boolean
  stampCount: number
  firstAcquiredAt: string | null
}

export interface StampCollection {
  acquiredCount: number
  totalCount: number
  stamps: TravelStamp[]
}
