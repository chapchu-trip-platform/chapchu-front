'use client'

import { useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { ChoiceChip } from '@/components/ui/choice-chip'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { BreedCombobox } from '@/features/auth/components/breed-combobox'
import LocationConsentStep from '@/features/auth/components/location-consent-step'
import { RequiredFieldsModal } from '@/features/auth/components/required-fields-modal'
import type {
  PetSize,
  NicknameAvailabilityResponse,
  SignupFormValues,
  SignupOptions,
} from '@/features/auth/types/signup'
import { cn } from '@/lib/utils'

interface SignupScreenProps {
  options: SignupOptions
  onCheckNickname: (nickname: string) => Promise<NicknameAvailabilityResponse>
  onSubmit: (values: SignupFormValues) => Promise<void>
}

type NicknameCheckStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'failed'

interface PetDraft {
  petName: string
  breedId: number | null
  size: PetSize
  age: string
  activityIds: string[]
}

const sizes: Array<{ value: PetSize; label: string }> = [
  { value: 'SMALL', label: '소형' },
  { value: 'MEDIUM', label: '중형' },
  { value: 'LARGE', label: '대형' },
]

const createEmptyPet = (): PetDraft => ({
  petName: '',
  breedId: null,
  size: 'SMALL',
  age: '',
  activityIds: [],
})

function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-1 text-danger">
      *
    </span>
  )
}

export default function SignupScreen({
  options,
  onCheckNickname,
  onSubmit,
}: SignupScreenProps) {
  const [step, setStep] = useState<'user' | 'pet' | 'location'>('user')
  const [nickname, setNickname] = useState('')
  const [nicknameCheckStatus, setNicknameCheckStatus] =
    useState<NicknameCheckStatus>('idle')
  const [nicknameCheckMessage, setNicknameCheckMessage] = useState<string | null>(
    null
  )
  const nicknameRequestSequence = useRef(0)
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([])
  const [selectedRegionIds, setSelectedRegionIds] = useState<string[]>([])
  const [selectedTransportMethodIds, setSelectedTransportMethodIds] = useState<
    string[]
  >([])
  const [pets, setPets] = useState<PetDraft[]>([createEmptyPet()])
  const [activePetIdx, setActivePetIdx] = useState(0)
  const [locationCollectionConsent, setLocationCollectionConsent] =
    useState(false)
  const [locationThirdPartyConsent, setLocationThirdPartyConsent] =
    useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [missingRequiredFields, setMissingRequiredFields] = useState<string[]>([])

  const toggleId = (
    current: string[],
    id: string,
    setter: (ids: string[]) => void
  ) => {
    setter(
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id]
    )
  }

  const updatePet = <K extends keyof PetDraft>(
    index: number,
    field: K,
    value: PetDraft[K]
  ) => {
    setPets((currentPets) =>
      currentPets.map((pet, petIndex) =>
        petIndex === index ? { ...pet, [field]: value } : pet
      )
    )
  }

  const addPet = () => {
    setPets((currentPets) => [...currentPets, createEmptyPet()])
    setActivePetIdx(pets.length)
  }

  const removePet = (index: number) => {
    if (pets.length === 1) return

    setPets((currentPets) =>
      currentPets.filter((_, petIndex) => petIndex !== index)
    )
    setActivePetIdx((currentIndex) => {
      if (currentIndex > index) return currentIndex - 1
      if (currentIndex === index) return Math.min(index, pets.length - 2)
      return currentIndex
    })
  }

  const handleUserContinue = () => {
    const missingFields: string[] = []
    if (!nickname.trim()) missingFields.push('닉네임')
    else if (nicknameCheckStatus !== 'available') {
      missingFields.push('닉네임 중복 확인')
    }
    if (
      !selectedThemeIds.some((id) =>
        options.themes.some((option) => option.id === id)
      )
    ) {
      missingFields.push('선호 테마')
    }
    if (
      !selectedRegionIds.some((id) =>
        options.regions.some((option) => option.id === id)
      )
    ) {
      missingFields.push('선호 지역')
    }
    if (
      !selectedTransportMethodIds.some((id) =>
        options.transportMethods.some((option) => option.id === id)
      )
    ) {
      missingFields.push('선호 이동수단')
    }

    if (missingFields.length > 0) {
      setFormError(null)
      setMissingRequiredFields(missingFields)
      return
    }
    setFormError(null)
    setStep('pet')
  }

  const handleNicknameChange = (value: string) => {
    nicknameRequestSequence.current += 1
    setNickname(value)
    setNicknameCheckStatus('idle')
    setNicknameCheckMessage(null)
    setFormError(null)
  }

  const handleNicknameCheck = async () => {
    const requestedNickname = nickname.trim()
    if (!requestedNickname) {
      setNicknameCheckStatus('failed')
      setNicknameCheckMessage('닉네임을 입력해주세요.')
      return
    }

    const requestSequence = nicknameRequestSequence.current + 1
    nicknameRequestSequence.current = requestSequence
    setNicknameCheckStatus('checking')
    setNicknameCheckMessage('닉네임을 확인하고 있어요…')
    setFormError(null)

    try {
      const result = await onCheckNickname(requestedNickname)
      if (nicknameRequestSequence.current !== requestSequence) return

      const matchesCurrentNickname =
        nickname.trim() === requestedNickname &&
        result.nickname.trim() === requestedNickname
      if (!matchesCurrentNickname) {
        setNicknameCheckStatus('failed')
        setNicknameCheckMessage('닉네임 확인 결과가 일치하지 않습니다. 다시 확인해주세요.')
        return
      }

      if (result.available) {
        setNicknameCheckStatus('available')
        setNicknameCheckMessage('사용할 수 있는 닉네임이에요.')
      } else {
        setNicknameCheckStatus('unavailable')
        setNicknameCheckMessage('이미 사용 중인 닉네임이에요.')
      }
    } catch (error) {
      if (nicknameRequestSequence.current !== requestSequence) return
      setNicknameCheckStatus('failed')
      setNicknameCheckMessage(
        error instanceof Error
          ? error.message
          : '닉네임을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.'
      )
    }
  }

  const handlePetContinue = () => {
    const missingFields: string[] = []
    let firstIncompletePetIndex = -1

    pets.forEach((currentPet, index) => {
      const petLabel = currentPet.petName.trim() || `반려동물 ${index + 1}`
      const age = Number(currentPet.age)
      const petMissingFields: string[] = []

      if (!currentPet.petName.trim()) petMissingFields.push(`${petLabel} 이름`)
      if (
        currentPet.breedId === null ||
        !options.breeds.some((breed) => breed.id === currentPet.breedId)
      ) {
        petMissingFields.push(`${petLabel} 견종`)
      }
      if (
        currentPet.age.trim() === '' ||
        !Number.isInteger(age) ||
        age < 0
      ) {
        petMissingFields.push(`${petLabel} 나이 (0 이상의 정수)`)
      }
      if (
        !currentPet.activityIds.some((id) =>
          options.activities.some((activity) => activity.id === id)
        )
      ) {
        petMissingFields.push(`${petLabel} 선호 활동`)
      }

      if (petMissingFields.length > 0 && firstIncompletePetIndex < 0) {
        firstIncompletePetIndex = index
      }
      missingFields.push(...petMissingFields)
    })

    if (missingFields.length > 0) {
      if (firstIncompletePetIndex >= 0) {
        setActivePetIdx(firstIncompletePetIndex)
      }
      setFormError(null)
      setMissingRequiredFields(missingFields)
      return
    }

    setFormError(null)
    setStep('location')
  }

  const handleComplete = async () => {
    if (!locationCollectionConsent || !locationThirdPartyConsent) return

    setSubmitting(true)
    setFormError(null)

    try {
      await onSubmit({
        user: {
          nickname: nickname.trim(),
          regionIds: selectedRegionIds.filter((id) =>
            options.regions.some((option) => option.id === id)
          ),
          themeIds: selectedThemeIds.filter((id) =>
            options.themes.some((option) => option.id === id)
          ),
          transportMethodIds: selectedTransportMethodIds.filter((id) =>
            options.transportMethods.some((option) => option.id === id)
          ),
          locationConsent:
            locationCollectionConsent && locationThirdPartyConsent,
        },
        pets: pets.map((pet) => ({
          petName: pet.petName.trim(),
          breedId: pet.breedId as number,
          size: pet.size,
          age: Number(pet.age),
          activityIds: pet.activityIds.filter((id) =>
            options.activities.some((option) => option.id === id)
          ),
        })),
      })
    } catch (error) {
      const signupError = error as Error & { status?: number }
      if (signupError.status === 409) {
        nicknameRequestSequence.current += 1
        setNicknameCheckStatus('unavailable')
        setNicknameCheckMessage(
          '가입 처리 중 닉네임이 사용되었습니다. 다른 닉네임을 입력하고 다시 확인해주세요.'
        )
        setFormError(null)
        setStep('user')
        return
      }
      setFormError(
        error instanceof Error
          ? error.message
          : '회원가입을 완료하지 못했습니다. 다시 시도해주세요.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const pet = pets[activePetIdx]
  const stepTitle =
    step === 'user'
      ? '기본 정보 입력'
      : step === 'pet'
        ? '반려동물 정보'
        : '위치정보 이용 동의'
  const stepNumber = step === 'user' ? '1/3' : step === 'pet' ? '2/3' : '3/3'

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar
        title={stepTitle}
        showBack={step !== 'user' && !submitting}
        onBack={() => {
          setFormError(null)
          setStep(step === 'location' ? 'pet' : 'user')
        }}
        rightAction={
          <span className="text-[12px] text-warm-gray">
            {stepNumber}
          </span>
        }
      />
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        회원가입 {stepNumber}, {stepTitle}
      </p>

      <div className="px-4 py-2">
        <div className="flex gap-1">
          <div className="h-1 flex-1 rounded-full bg-sage-green" />
          <div
            className={cn(
              'h-1 flex-1 rounded-full',
              step !== 'user' ? 'bg-sage-green' : 'bg-border'
            )}
          />
          <div
            className={cn(
              'h-1 flex-1 rounded-full',
              step === 'location' ? 'bg-sage-green' : 'bg-border'
            )}
          />
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-28">
        {step === 'user' ? (
          <div className="flex flex-col gap-6 pt-4">
            <div>
              <label
                htmlFor="signup-nickname"
                className="mb-2 block text-[13px] font-semibold text-deep-brown"
              >
                닉네임
                <RequiredMark />
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  id="signup-nickname"
                  value={nickname}
                  onChange={(event) => handleNicknameChange(event.target.value)}
                  placeholder="사용할 닉네임을 입력하세요"
                  maxLength={30}
                  required
                  aria-describedby="nickname-check-message"
                  aria-invalid={
                    nicknameCheckStatus === 'unavailable' ||
                    nicknameCheckStatus === 'failed'
                  }
                  className="min-w-0 flex-1"
                />
                <Button
                  type="button"
                  onClick={() => void handleNicknameCheck()}
                  disabled={
                    !nickname.trim() ||
                    nicknameCheckStatus === 'checking' ||
                    nicknameCheckStatus === 'available'
                  }
                  variant={
                    nicknameCheckStatus === 'available' ? 'secondary' : 'outline'
                  }
                  className="flex-none px-3"
                >
                  {nicknameCheckStatus === 'checking'
                    ? '확인 중…'
                    : nicknameCheckStatus === 'available'
                      ? '확인 완료'
                      : '중복 확인'}
                </Button>
              </div>
              <p
                id="nickname-check-message"
                role={
                  nicknameCheckStatus === 'unavailable' ||
                  nicknameCheckStatus === 'failed'
                    ? 'alert'
                    : 'status'
                }
                className={cn(
                  'mt-2 min-h-4 text-[12px]',
                  nicknameCheckStatus === 'available'
                    ? 'text-[#2f6b50]'
                    : nicknameCheckStatus === 'unavailable' ||
                        nicknameCheckStatus === 'failed'
                      ? 'text-[#a63f2c]'
                      : 'text-warm-gray'
                )}
              >
                {nicknameCheckMessage ?? '중복 확인 후 다음 단계로 이동할 수 있어요.'}
              </p>
            </div>

            <div>
              <label className="mb-3 block text-[13px] font-semibold text-deep-brown">
                선호 테마
                <RequiredMark />
              </label>
              <div
                role="group"
                aria-label="선호 테마 (필수)"
                className="flex flex-wrap gap-2"
              >
                {options.themes.map((theme) => (
                  <ChoiceChip
                    key={theme.id}
                    onClick={() =>
                      toggleId(
                        selectedThemeIds,
                        theme.id,
                        setSelectedThemeIds
                      )
                    }
                    selected={selectedThemeIds.includes(theme.id)}
                  >
                    {theme.name}
                  </ChoiceChip>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-[13px] font-semibold text-deep-brown">
                선호 지역
                <RequiredMark />
              </label>
              <div
                role="group"
                aria-label="선호 지역 (필수)"
                className="flex flex-wrap gap-2"
              >
                {options.regions.map((region) => (
                  <ChoiceChip
                    key={region.id}
                    onClick={() =>
                      toggleId(
                        selectedRegionIds,
                        region.id,
                        setSelectedRegionIds
                      )
                    }
                    selected={selectedRegionIds.includes(region.id)}
                  >
                    {region.name}
                  </ChoiceChip>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-[13px] font-semibold text-deep-brown">
                선호 이동수단
                <RequiredMark />
              </label>
              <div
                role="group"
                aria-label="선호 이동수단 (필수)"
                className="flex flex-wrap gap-2"
              >
                {options.transportMethods.map((transportMethod) => (
                  <ChoiceChip
                    key={transportMethod.id}
                    onClick={() =>
                      toggleId(
                        selectedTransportMethodIds,
                        transportMethod.id,
                        setSelectedTransportMethodIds
                      )
                    }
                    selected={selectedTransportMethodIds.includes(
                      transportMethod.id
                    )}
                    tone="orange"
                  >
                    {transportMethod.name}
                  </ChoiceChip>
                ))}
              </div>
            </div>
          </div>
        ) : step === 'pet' ? (
          <div className="flex flex-col gap-5 pt-4">
            <p className="text-[12px] leading-relaxed text-warm-gray">
              반려동물 정보는 필수 사항입니다. 모든 항목을 입력한 후 다음 단계로
              이동해주세요.
            </p>

            {pets.length > 1 && (
              <div className="flex items-center gap-2">
                <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
                  {pets.map((currentPet, index) => (
                    <ChoiceChip
                      key={index}
                      onClick={() => setActivePetIdx(index)}
                      selected={activePetIdx === index}
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      {currentPet.petName || `반려동물 ${index + 1}`}
                    </ChoiceChip>
                  ))}
                  <IconButton
                    onClick={addPet}
                    variant="muted"
                    size="sm"
                    aria-label="반려동물 추가"
                  >
                    <Plus className="h-4 w-4 text-warm-gray" />
                  </IconButton>
                </div>
                <Button
                  onClick={() => removePet(activePetIdx)}
                  variant="ghost"
                  size="sm"
                  className="h-8 flex-shrink-0 rounded-full px-2.5 text-[12px] text-danger"
                  aria-label={`${pet.petName || `반려동물 ${activePetIdx + 1}`} 추가 취소`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  추가 취소
                </Button>
              </div>
            )}

            <div>
              <label
                htmlFor={`signup-pet-name-${activePetIdx}`}
                className="mb-2 block text-[13px] font-semibold text-deep-brown"
              >
                이름
                <RequiredMark />
              </label>
              <Input
                type="text"
                id={`signup-pet-name-${activePetIdx}`}
                value={pet.petName}
                onChange={(event) =>
                  updatePet(activePetIdx, 'petName', event.target.value)
                }
                placeholder="반려동물 이름"
                required
              />
            </div>

            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <label
                  htmlFor={`signup-pet-breed-${activePetIdx}`}
                  className="mb-2 block text-[13px] font-semibold text-deep-brown"
                >
                  견종
                  <RequiredMark />
                </label>
                <BreedCombobox
                  key={activePetIdx}
                  id={`signup-pet-breed-${activePetIdx}`}
                  breeds={options.breeds}
                  value={pet.breedId}
                  onChange={(breedId) =>
                    updatePet(activePetIdx, 'breedId', breedId)
                  }
                />
              </div>
              <div className="w-24">
                <label
                  htmlFor={`signup-pet-age-${activePetIdx}`}
                  className="mb-2 block text-[13px] font-semibold text-deep-brown"
                >
                  나이
                  <RequiredMark />
                </label>
                <Input
                  type="number"
                  id={`signup-pet-age-${activePetIdx}`}
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={pet.age}
                  onChange={(event) =>
                    updatePet(activePetIdx, 'age', event.target.value)
                  }
                  placeholder="3"
                  required
                  className="px-3"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold text-deep-brown">
                크기
                <RequiredMark />
              </label>
              <div
                role="group"
                aria-label="반려동물 크기 (필수)"
                className="flex gap-2"
              >
                {sizes.map((size) => (
                  <ChoiceChip
                    key={size.value}
                    onClick={() =>
                      updatePet(activePetIdx, 'size', size.value)
                    }
                    selected={pet.size === size.value}
                    size="segment"
                    shape="card"
                  >
                    {size.label}
                  </ChoiceChip>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold text-deep-brown">
                선호 활동
                <RequiredMark />
              </label>
              <div
                role="group"
                aria-label="선호 활동 (필수)"
                className="flex flex-wrap gap-2"
              >
                {options.activities.map((activity) => (
                  <ChoiceChip
                    key={activity.id}
                    onClick={() =>
                      toggleId(
                        pet.activityIds,
                        activity.id,
                        (activityIds) =>
                          updatePet(activePetIdx, 'activityIds', activityIds)
                      )
                    }
                    selected={pet.activityIds.includes(activity.id)}
                    tone="orange"
                  >
                    {activity.name}
                  </ChoiceChip>
                ))}
              </div>
            </div>

            {pets.length === 1 && (
              <Button
                onClick={addPet}
                variant="link"
                size="sm"
                className="h-auto self-start px-0 py-2 text-[13px] no-underline"
              >
                <Plus className="h-4 w-4" />
                반려동물 추가하기
              </Button>
            )}
          </div>
        ) : (
          <LocationConsentStep
            collectionConsent={locationCollectionConsent}
            disabled={submitting}
            thirdPartyConsent={locationThirdPartyConsent}
            onCollectionConsentChange={(checked) => {
              setLocationCollectionConsent(checked)
              setFormError(null)
            }}
            onThirdPartyConsentChange={(checked) => {
              setLocationThirdPartyConsent(checked)
              setFormError(null)
            }}
          />
        )}

        {formError && (
          <p role="alert" className="mt-5 text-[12px] leading-relaxed text-danger">
            {formError}
          </p>
        )}
      </div>

      <div className="safe-bottom-cta fixed bottom-0 left-1/2 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-warm-beige px-4 pt-4">
        {step === 'user' ? (
          <Button
            onClick={handleUserContinue}
            disabled={submitting}
            fullWidth
            size="lg"
          >
            다음 — 반려동물 등록
          </Button>
        ) : step === 'pet' ? (
          <Button
            onClick={handlePetContinue}
            disabled={submitting}
            fullWidth
            size="lg"
          >
            다음 — 위치정보 동의
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={
              submitting ||
              !locationCollectionConsent ||
              !locationThirdPartyConsent
            }
            fullWidth
            size="lg"
          >
            {submitting ? '가입 중…' : '완료 — 회원가입하기'}
          </Button>
        )}
      </div>

      {missingRequiredFields.length > 0 && (
        <RequiredFieldsModal
          fields={missingRequiredFields}
          onConfirm={() => setMissingRequiredFields([])}
        />
      )}
    </div>
  )
}
