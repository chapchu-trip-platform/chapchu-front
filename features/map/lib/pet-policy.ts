export interface DisplayPetPolicy {
  labels: string[]
  text: string | null
}

function normalizePolicyText(value: string) {
  const normalized = value
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+(?=-[ \t]*)/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')

  return normalized || null
}

export function parsePetPolicy(policy: unknown): DisplayPetPolicy {
  if (typeof policy === 'string') {
    return { labels: [], text: normalizePolicyText(policy) }
  }

  if (Array.isArray(policy)) {
    const text = policy
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .join('\n')

    return { labels: [], text: text || null }
  }

  if (!policy || typeof policy !== 'object') {
    return { labels: [], text: null }
  }

  const value = policy as Record<string, unknown>
  const labels = [
    typeof value.allowedPetSize === 'string' && value.allowedPetSize.trim()
      ? `허용 크기 ${value.allowedPetSize.trim()}`
      : null,
    value.leashRequired === true ? '목줄 필수' : null,
    value.carrierRequired === true ? '이동장 필수' : null,
  ].filter((label): label is string => Boolean(label))
  const textKeys = ['placeCaution', 'caution', 'description', 'policy', 'note']
  const rawText = textKeys
    .map((key) => value[key])
    .find((item): item is string => typeof item === 'string' && Boolean(item.trim()))

  return { labels, text: rawText ? normalizePolicyText(rawText) : null }
}
