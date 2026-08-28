export type HomeDataStatus = 'loading' | 'success' | 'error'

export interface HomeSummary {
  nickname: string
  petNames: string[]
}

export interface HotPost {
  id: string
  title: string
  content: string
  viewCount: number
  recommendationCount: number
  createdAt: string | null
  hasPhoto: boolean
}

export function formatPetCompanion(petNames: string[]) {
  const names = petNames.map((name) => name.trim()).filter(Boolean)
  if (names.length === 0) return '반려동물과 함께'
  if (names.length === 1) return `${names[0]}와 함께`
  return `${names[0]}와 ${names.length - 1}마리`
}
