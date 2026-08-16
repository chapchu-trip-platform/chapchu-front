'use client'

import { useRef, useState } from 'react'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { ChoiceChip } from '@/components/ui/choice-chip'
import { IconButton } from '@/components/ui/icon-button'
import { Input, inputVariants } from '@/components/ui/input'
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

function hasPetInput(pet: PetDraft) {
  return (
    Boolean(pet.petName.trim()) ||
    pet.breedId !== null ||
    Boolean(pet.age.trim()) ||
    pet.activityIds.length > 0
  )
}

function isCompletePet(pet: PetDraft, options: SignupOptions) {
  const age = Number(pet.age)
  return (
    Boolean(pet.petName.trim()) &&
    pet.breedId !== null &&
    options.breeds.some((breed) => breed.id === pet.breedId) &&
    pet.age.trim() !== '' &&
    Number.isInteger(age) &&
    age >= 0
  )
}

export default function SignupScreen({
  options,
  onCheckNickname,
  onSubmit,
}: SignupScreenProps) {
  const [step, setStep] = useState<'user' | 'pet'>('user')
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
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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
    if (nicknameCheckStatus !== 'available') {
      setFormError('닉네임 중복 확인을 완료해주세요.')
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

  const handleComplete = async () => {
    const enteredPets = pets.filter(hasPetInput)
    if (enteredPets.some((pet) => !isCompletePet(pet, options))) {
      setFormError('입력 중인 반려동물의 이름, 견종, 나이를 모두 확인해주세요.')
      return
    }

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
        },
        pets: enteredPets.map((pet) => ({
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar
        title={step === 'user' ? '기본 정보 입력' : '반려동물 정보'}
        showBack={step === 'pet'}
        onBack={() => {
          setFormError(null)
          setStep('user')
        }}
        rightAction={
          <span className="text-[12px] text-warm-gray">
            {step === 'user' ? '1/2' : '2/2'}
          </span>
        }
      />

      <div className="px-4 py-2">
        <div className="flex gap-1">
          <div className="h-1 flex-1 rounded-full bg-sage-green" />
          <div
            className={cn(
              'h-1 flex-1 rounded-full',
              step === 'pet' ? 'bg-sage-green' : 'bg-border'
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
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  id="signup-nickname"
                  value={nickname}
                  onChange={(event) => handleNicknameChange(event.target.value)}
                  placeholder="사용할 닉네임을 입력하세요"
                  maxLength={30}
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
              </label>
              <div className="flex flex-wrap gap-2">
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
              </label>
              <div className="flex flex-wrap gap-2">
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
              </label>
              <div className="flex flex-wrap gap-2">
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
        ) : (
          <div className="flex flex-col gap-5 pt-4">
            <p className="text-[12px] leading-relaxed text-warm-gray">
              반려동물 정보는 선택 사항입니다. 등록하지 않으려면 비워두고 완료할 수 있어요.
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
              <label className="mb-2 block text-[13px] font-semibold text-deep-brown">
                이름
              </label>
              <Input
                type="text"
                value={pet.petName}
                onChange={(event) =>
                  updatePet(activePetIdx, 'petName', event.target.value)
                }
                placeholder="반려동물 이름"
              />
            </div>

            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <label className="mb-2 block text-[13px] font-semibold text-deep-brown">
                  견종
                </label>
                <div className="relative">
                  <select
                    aria-label="견종"
                    value={pet.breedId ?? ''}
                    onChange={(event) =>
                      updatePet(
                        activePetIdx,
                        'breedId',
                        event.target.value ? Number(event.target.value) : null
                      )
                    }
                    className={cn(
                      inputVariants({ size: 'default' }),
                      'appearance-none pr-10'
                    )}
                  >
                    <option value="">견종 선택</option>
                    {options.breeds.map((breed) => (
                      <option key={breed.id} value={breed.id}>
                        {breed.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-gray" />
                </div>
              </div>
              <div className="w-24">
                <label className="mb-2 block text-[13px] font-semibold text-deep-brown">
                  나이
                </label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={pet.age}
                  onChange={(event) =>
                    updatePet(activePetIdx, 'age', event.target.value)
                  }
                  placeholder="3"
                  className="px-3"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[13px] font-semibold text-deep-brown">
                크기
              </label>
              <div className="flex gap-2">
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
              </label>
              <div className="flex flex-wrap gap-2">
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
            disabled={nicknameCheckStatus !== 'available' || submitting}
            fullWidth
            size="lg"
          >
            다음 — 반려동물 등록
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={submitting}
            fullWidth
            size="lg"
          >
            {submitting ? '가입 중…' : '완료 — 회원가입하기'}
          </Button>
        )}
      </div>
    </div>
  )
}
