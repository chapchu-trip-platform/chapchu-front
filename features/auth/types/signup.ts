export interface NamedOption {
  id: string
  name: string
}

export interface BreedOption {
  id: number
  name: string
}

export interface SignupOptions {
  regions: NamedOption[]
  themes: NamedOption[]
  transportMethods: NamedOption[]
  breeds: BreedOption[]
  activities: NamedOption[]
}

export interface NicknameAvailabilityResponse {
  nickname: string
  available: boolean
}

export type PetSize = 'SMALL' | 'MEDIUM' | 'LARGE'

export interface SignupPetInput {
  petName: string
  breedId: number
  size: PetSize
  age: number
  activityIds: string[]
}

export interface SignupFormValues {
  user: {
    nickname: string
    regionIds: string[]
    themeIds: string[]
    transportMethodIds: string[]
    locationConsent: boolean
  }
  pets: SignupPetInput[]
}

export interface IntegratedSignupRequest extends SignupFormValues {
  registrationToken: string
}

export interface IntegratedSignupResponse {
  userId: string
  nickname: string
  email: string
  petIds: string[]
}
