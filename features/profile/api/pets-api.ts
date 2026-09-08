'use client'

import { apiClient } from '@/lib/api/client'
import { API_ENDPOINTS } from '@/lib/api/endpoints'

export interface SelectablePet {
  id: string
  name: string
}

const MAX_PETS = 100
const MAX_STRING_LENGTH = 500

function isBoundedString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= MAX_STRING_LENGTH
  )
}

function isPetListItem(value: unknown): value is { id: string; petName: string } {
  if (!value || typeof value !== 'object') return false
  const pet = value as { id?: unknown; petName?: unknown }
  return isBoundedString(pet.id) && isBoundedString(pet.petName)
}

export async function fetchSelectablePets(signal?: AbortSignal): Promise<SelectablePet[]> {
  const { data }: { data: unknown } = await apiClient.get(API_ENDPOINTS.pets.list, {
    signal,
  })
  if (!Array.isArray(data) || data.length > MAX_PETS || !data.every(isPetListItem)) {
    throw new Error('Pets response was invalid.')
  }

  return data.map((pet) => ({
    id: pet.id.trim(),
    name: pet.petName.trim(),
  }))
}
