const PET_NAME_MAX_LENGTH = 10

export function formatPetName(name: string | null | undefined) {
  const normalizedName = name?.trim() || '반려동물'
  const characters = Array.from(normalizedName)

  return characters.length > PET_NAME_MAX_LENGTH
    ? `${characters.slice(0, PET_NAME_MAX_LENGTH).join('')}...`
    : normalizedName
}
