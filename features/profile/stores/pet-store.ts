import { create } from 'zustand'
import type { ProfilePet } from '@/features/profile/types/profile'

interface PetState {
  pets: ProfilePet[]
  selectedPetId: string | null
  setPets: (pets: ProfilePet[]) => void
  selectPet: (petId: string | null) => void
  upsertPet: (pet: ProfilePet) => void
  removePet: (petId: string) => void
}

export const usePetStore = create<PetState>((set) => ({
  pets: [],
  selectedPetId: null,
  setPets: (pets) =>
    set((state) => ({
      pets,
      selectedPetId:
        state.selectedPetId && pets.some((pet) => pet.id === state.selectedPetId)
          ? state.selectedPetId
          : pets[0]?.id ?? null,
    })),
  selectPet: (selectedPetId) => set({ selectedPetId }),
  upsertPet: (pet) =>
    set((state) => {
      const exists = state.pets.some((item) => item.id === pet.id)
      const pets = exists
        ? state.pets.map((item) => (item.id === pet.id ? pet : item))
        : [...state.pets, pet]

      return {
        pets,
        selectedPetId: state.selectedPetId ?? pet.id,
      }
    }),
  removePet: (petId) =>
    set((state) => {
      const pets = state.pets.filter((pet) => pet.id !== petId)

      return {
        pets,
        selectedPetId: state.selectedPetId === petId ? pets[0]?.id ?? null : state.selectedPetId,
      }
    }),
}))
