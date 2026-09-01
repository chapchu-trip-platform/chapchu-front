'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, m, useIsPresent, useReducedMotion } from 'motion/react'
import {
  AlertTriangle,
  Archive,
  Bookmark,
  Check,
  Edit3,
  FileText,
  Heart,
  MessageSquareText,
  PawPrint,
  Plus,
  Stamp,
  Star,
  Trash2,
} from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { InteractiveCard } from '@/components/ui/interactive-card'
import { MenuRow } from '@/components/ui/menu-row'
import { ModalActions } from '@/components/ui/modal-actions'
import { cn } from '@/lib/utils'
import { getProfileErrorMessage } from '@/features/profile/api/profile-api'
import type {
  PetMutationInput,
  PetOptions,
  ProfileLoadStatus,
  ProfilePet,
  ProfileSummary,
} from '@/features/profile/types/profile'
import type { PetSize } from '@/features/auth/types/signup'
import type { SettingsTab } from '@/components/screens/profile-settings-screens'

interface ProfileScreenProps {
  summary: ProfileSummary | null
  pets: ProfilePet[]
  status: ProfileLoadStatus
  errorMessage: string | null
  onRetry: () => void
  onOpenSettings?: (tab: SettingsTab) => void
  onLogout?: () => void | Promise<void>
  onLoadPetOptions: (signal?: AbortSignal) => Promise<PetOptions>
  onCreatePet: (input: PetMutationInput) => Promise<ProfilePet>
  onUpdatePet: (petId: string, input: PetMutationInput) => Promise<ProfilePet>
  onDeletePet: (petId: string) => Promise<void>
  onWithdraw: () => Promise<void>
}

type SubScreen = null | 'pets' | 'stamps' | 'memory-album'

const stamps = [
  { region: '서울', acquired: true, date: '2024.07.04', count: 8, color: '#6FAF8E', mascot: '해치' },
  { region: '제주', acquired: true, date: '2024.06.15', count: 3, color: '#F4A261', mascot: '돌하르방' },
  { region: '강원', acquired: true, date: '2024.05.20', count: 2, color: '#8ECAE6', mascot: '반달곰' },
  { region: '경기', acquired: false, date: null, count: 0, color: '#DDD4C0', mascot: '?' },
  { region: '부산', acquired: false, date: null, count: 0, color: '#DDD4C0', mascot: '?' },
  { region: '제주', acquired: false, date: null, count: 0, color: '#DDD4C0', mascot: '?' },
]

const memoryAlbums = [
  {
    petName: '하루',
    breed: '포메라니안',
    period: '2019.03 ~ 2023.11',
    coverImage: '/images/album-cover.png',
    albumCount: 12,
    note: '영원히 기억할게, 하루야',
  },
]

const sizeLabel: Record<PetSize, string> = {
  SMALL: '소형',
  MEDIUM: '중형',
  LARGE: '대형',
}

const PROFILE_MOTION_EASE = [0.22, 1, 0.36, 1] as const

function ProfilePane({
  children,
  direction,
}: {
  children: ReactNode
  direction: 'forward' | 'back'
}) {
  const prefersReducedMotion = useReducedMotion()
  const isPresent = useIsPresent()
  const enterX = direction === 'forward' ? 28 : -16
  const exitX = direction === 'forward' ? 28 : -20

  return (
    <m.div
      inert={isPresent ? undefined : true}
      aria-hidden={isPresent ? undefined : true}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: enterX }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: exitX }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: PROFILE_MOTION_EASE }}
      className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-warm-beige"
    >
      {children}
    </m.div>
  )
}

function useModalFocus(onClose: () => void, isBlocked = false) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  const isBlockedRef = useRef(isBlocked)

  useEffect(() => {
    onCloseRef.current = onClose
    isBlockedRef.current = isBlocked
  }, [isBlocked, onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    if (!dialog) return

    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusableElements = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))

    focusableElements()[0]?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isBlockedRef.current) {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return

      const elements = focusableElements()
      if (elements.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [])

  return dialogRef
}

function DeletePetModal({
  pet,
  onClose,
  onDelete,
  onMemory,
}: {
  pet: ProfilePet
  onClose: () => void
  onDelete: () => Promise<void>
  onMemory: () => void
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const dialogRef = useModalFocus(onClose, isDeleting)
  const prefersReducedMotion = useReducedMotion()

  const handleDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    setErrorMessage(null)
    try {
      await onDelete()
    } catch (error) {
      setErrorMessage(getProfileErrorMessage(error))
      setIsDeleting(false)
    }
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
      className="absolute inset-0 z-[70] flex items-end justify-center"
    >
      <m.div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={() => !isDeleting && onClose()} />
      <m.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-pet-title"
        tabIndex={-1}
        initial={prefersReducedMotion ? false : { y: '100%' }}
        animate={{ y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { y: '100%' }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.32, ease: PROFILE_MOTION_EASE }}
        className="relative w-full rounded-t-[24px] bg-card-surface p-5 pb-10"
      >
        <h3 id="delete-pet-title" className="mb-2 text-[16px] font-bold text-deep-brown">{pet.petName} 삭제</h3>
        <p className="mb-5 text-[13px] leading-relaxed text-warm-gray">삭제 방법을 선택해주세요.</p>
        <div className="flex flex-col gap-2">
          <InteractiveCard onClick={onMemory} className="border-sage-green bg-sage-green-light hover:bg-sage-green-light/75">
            <p className="flex items-center gap-2 text-[14px] font-semibold text-sage-green">
              <Archive className="h-4 w-4" />
              추억으로 보관하기
            </p>
            <p className="mt-0.5 text-[12px] text-warm-gray">추억 보관 API 준비 전까지 반려견 정보는 유지돼요</p>
          </InteractiveCard>
          <InteractiveCard
            onClick={handleDelete}
            disabled={isDeleting}
            className="border-danger/30 bg-danger/5 hover:bg-danger/10"
          >
            <p className="flex items-center gap-2 text-[14px] font-semibold text-danger">
              <Trash2 className="h-4 w-4" />
              {isDeleting ? '삭제 중...' : '완전히 삭제하기'}
            </p>
            <p className="mt-0.5 text-[12px] text-warm-gray">반려견 정보를 삭제하며 되돌릴 수 없어요</p>
          </InteractiveCard>
          {errorMessage && <p className="text-[12px] text-danger" role="alert">{errorMessage}</p>}
          <Button onClick={onClose} variant="ghost" fullWidth disabled={isDeleting}>취소</Button>
        </div>
      </m.div>
    </m.div>
  )
}

function WithdrawModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => Promise<void> }) {
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const dialogRef = useModalFocus(onClose, isSubmitting)
  const prefersReducedMotion = useReducedMotion()

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await onConfirm()
    } catch (error) {
      setErrorMessage(getProfileErrorMessage(error))
      setIsSubmitting(false)
    }
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
      className="absolute inset-0 z-[70] flex items-center justify-center p-6"
    >
      <m.div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={() => !isSubmitting && onClose()} />
      <m.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="withdraw-title"
        tabIndex={-1}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.26, ease: PROFILE_MOTION_EASE }}
        className="relative w-full rounded-card bg-card-surface p-6"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10">
          <AlertTriangle className="h-6 w-6 text-danger" />
        </div>
        <h3 id="withdraw-title" className="mb-2 text-center text-[17px] font-bold text-deep-brown">정말 탈퇴하시겠어요?</h3>
        <p className="mb-4 text-center text-[13px] leading-relaxed text-warm-gray">
          계정 상태가 탈퇴로 변경되어 서비스를 이용할 수 없어요.
          <br />
          <span className="font-semibold text-danger">탈퇴 후 복구 정책은 고객지원 확인이 필요합니다.</span>
        </p>
        <button type="button" aria-pressed={agreed} onClick={() => setAgreed(!agreed)} className="mb-4 flex w-full items-center gap-2">
          <div className={cn('flex h-5 w-5 items-center justify-center rounded border-2 transition-all', agreed ? 'border-danger bg-danger' : 'border-border')}>
            {agreed && <Check className="h-3 w-3 text-white" />}
          </div>
          <span className="text-[13px] text-deep-brown">위 내용을 확인했습니다</span>
        </button>
        {errorMessage && <p className="mb-3 text-[12px] text-danger" role="alert">{errorMessage}</p>}
        <ModalActions>
          <Button onClick={onClose} variant="outline" disabled={isSubmitting}>취소</Button>
          <Button onClick={handleConfirm} disabled={!agreed || isSubmitting} variant="destructive">
            {isSubmitting ? '처리 중...' : '탈퇴하기'}
          </Button>
        </ModalActions>
      </m.div>
    </m.div>
  )
}

function PetEditor({
  pet,
  options,
  onClose,
  onSubmit,
}: {
  pet: ProfilePet | null
  options: PetOptions
  onClose: () => void
  onSubmit: (input: PetMutationInput) => Promise<void>
}) {
  const inferredBreedId =
    pet?.breedId ?? options.breeds.find((breed) => breed.name === pet?.breedName)?.id
  const [petName, setPetName] = useState(pet?.petName ?? '')
  const [breedId, setBreedId] = useState(String(inferredBreedId ?? ''))
  const [size, setSize] = useState<PetSize>(pet?.size ?? 'SMALL')
  const [age, setAge] = useState(String(pet?.age ?? ''))
  const [activityIds, setActivityIds] = useState<string[]>(pet?.activities.map((item) => item.id) ?? [])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const dialogRef = useModalFocus(onClose, isSaving)
  const prefersReducedMotion = useReducedMotion()

  const parsedAge = Number(age)
  const canSubmit =
    petName.trim().length > 0 &&
    breedId.length > 0 &&
    age.trim().length > 0 &&
    Number.isSafeInteger(parsedAge) &&
    parsedAge >= 0 &&
    parsedAge <= 100

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSaving(true)
    setErrorMessage(null)
    try {
      await onSubmit({
        petName: petName.trim(),
        breedId: Number(breedId),
        size,
        age: parsedAge,
        activityIds,
      })
    } catch (error) {
      setErrorMessage(getProfileErrorMessage(error))
      setIsSaving(false)
    }
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
      className="absolute inset-0 z-[70] flex items-end justify-center"
    >
      <m.div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={() => !isSaving && onClose()} />
      <m.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-editor-title"
        tabIndex={-1}
        initial={prefersReducedMotion ? false : { y: '100%' }}
        animate={{ y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { y: '100%' }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.34, ease: PROFILE_MOTION_EASE }}
        className="relative max-h-[88%] w-full overflow-y-auto rounded-t-[24px] bg-card-surface p-5 pb-10"
      >
        <h3 id="pet-editor-title" className="mb-4 text-[17px] font-bold text-deep-brown">{pet ? '반려견 정보 수정' : '반려견 등록'}</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="pet-name" className="mb-1 block text-[12px] font-semibold text-deep-brown">이름</label>
            <Input id="pet-name" value={petName} onChange={(event) => setPetName(event.target.value)} maxLength={30} placeholder="반려견 이름" />
          </div>
          <div>
            <label htmlFor="pet-breed" className="mb-1 block text-[12px] font-semibold text-deep-brown">견종</label>
            <select
              id="pet-breed"
              aria-label="견종"
              value={breedId}
              onChange={(event) => setBreedId(event.target.value)}
              className="h-12 w-full rounded-card border border-border bg-card px-4 text-[14px] text-deep-brown outline-none focus:ring-2 focus:ring-sage-green/50"
            >
              <option value="" disabled>견종을 선택해주세요</option>
              {options.breeds.map((breed) => <option key={breed.id} value={breed.id}>{breed.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="pet-size" className="mb-1 block text-[12px] font-semibold text-deep-brown">크기</label>
              <select
                id="pet-size"
                aria-label="크기"
                value={size}
                onChange={(event) => setSize(event.target.value as PetSize)}
                className="h-12 w-full rounded-card border border-border bg-card px-3 text-[14px] text-deep-brown outline-none focus:ring-2 focus:ring-sage-green/50"
              >
                {Object.entries(sizeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="pet-age" className="mb-1 block text-[12px] font-semibold text-deep-brown">나이</label>
              <Input id="pet-age" type="number" min={0} max={100} value={age} onChange={(event) => setAge(event.target.value)} placeholder="3" />
            </div>
          </div>
          <fieldset>
            <legend className="mb-2 text-[12px] font-semibold text-deep-brown">선호 활동</legend>
            <div className="flex flex-wrap gap-2">
              {options.activities.map((activity) => {
                const selected = activityIds.includes(activity.id)
                return (
                  <button
                    key={activity.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setActivityIds((items) => selected ? items.filter((id) => id !== activity.id) : [...items, activity.id])}
                    className={cn('rounded-full border px-3 py-1.5 text-[12px] font-medium', selected ? 'border-sage-green bg-sage-green-light text-sage-green' : 'border-border bg-card text-warm-gray')}
                  >
                    {activity.name}
                  </button>
                )
              })}
            </div>
          </fieldset>
          {errorMessage && <p className="text-[12px] text-danger" role="alert">{errorMessage}</p>}
          <ModalActions>
            <Button variant="outline" onClick={onClose} disabled={isSaving}>취소</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || isSaving}>{isSaving ? '저장 중...' : '저장하기'}</Button>
          </ModalActions>
        </div>
      </m.div>
    </m.div>
  )
}

function PetsSubScreen({
  pets,
  onBack,
  onLoadOptions,
  onCreate,
  onUpdate,
  onDelete,
}: {
  pets: ProfilePet[]
  onBack: () => void
  onLoadOptions: (signal?: AbortSignal) => Promise<PetOptions>
  onCreate: (input: PetMutationInput) => Promise<ProfilePet>
  onUpdate: (petId: string, input: PetMutationInput) => Promise<ProfilePet>
  onDelete: (petId: string) => Promise<void>
}) {
  const [deleteTarget, setDeleteTarget] = useState<ProfilePet | null>(null)
  const [editorPet, setEditorPet] = useState<ProfilePet | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [options, setOptions] = useState<PetOptions | null>(null)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const [optionsRequestKey, setOptionsRequestKey] = useState(0)
  const [memoryNotice, setMemoryNotice] = useState<string | null>(null)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (!showEditor || options) return
    const controller = new AbortController()
    void onLoadOptions(controller.signal)
      .then(setOptions)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setOptionsError(getProfileErrorMessage(error))
      })
    return () => controller.abort()
  }, [onLoadOptions, options, optionsRequestKey, showEditor])

  const openEditor = (pet: ProfilePet | null) => {
    setEditorPet(pet)
    setShowEditor(true)
    setOptionsError(null)
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="반려동물 관리" showBack onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24 pt-4">
        <AnimatePresence initial={false}>
          {memoryNotice && (
            <m.p
              initial={{ opacity: 0, height: 0, y: prefersReducedMotion ? 0 : -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
              className="mb-3 rounded-card bg-sage-green-light p-3 text-[12px] text-sage-green"
              role="status"
            >
              {memoryNotice}
            </m.p>
          )}
        </AnimatePresence>
        {pets.length === 0 && <p className="py-8 text-center text-[13px] text-warm-gray">등록된 반려견이 없습니다.</p>}
        <AnimatePresence initial={false}>
          {pets.map((pet) => (
          <m.div
            layout={!prefersReducedMotion}
            key={pet.id}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -24, height: 0, marginBottom: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: PROFILE_MOTION_EASE }}
            className="mb-3 overflow-hidden rounded-card border border-border bg-card-surface p-4 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-full border-2 border-sage-green/30">
                <Image src="/images/dog-hero.png" alt={pet.petName} fill className="object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-bold text-deep-brown">{pet.petName}</p>
                  <div className="flex gap-1">
                    <IconButton aria-label={`${pet.petName} 수정`} size="sm" onClick={() => openEditor(pet)}>
                      <Edit3 className="h-4 w-4 text-warm-gray" />
                    </IconButton>
                    <IconButton aria-label={`${pet.petName} 삭제`} size="sm" variant="danger" onClick={() => setDeleteTarget(pet)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </IconButton>
                  </div>
                </div>
                <p className="text-[13px] text-warm-gray">{pet.breedName} · {sizeLabel[pet.size]} · {pet.age}살</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {pet.activities.map((activity) => <span key={activity.id} className="rounded-full bg-soft-orange/15 px-2 py-0.5 text-[11px] font-medium text-soft-orange">{activity.name}</span>)}
                </div>
              </div>
            </div>
          </m.div>
          ))}
        </AnimatePresence>
        <m.div whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}>
          <Button variant="outline" fullWidth size="lg" className="rounded-card border-2 border-dashed text-warm-gray" onClick={() => openEditor(null)}>
            <Plus className="h-4 w-4" />
            <span className="text-[14px] font-medium">반려동물 추가하기</span>
          </Button>
        </m.div>
        <AnimatePresence initial={false}>
          {showEditor && !options && (
          <m.div
            initial={{ opacity: 0, height: 0, y: prefersReducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
            className="mt-3 overflow-hidden rounded-card border border-border bg-card-surface p-4 text-center"
          >
            {optionsError ? (
              <>
                <p className="mb-3 text-[12px] text-danger" role="alert">{optionsError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOptionsError(null)
                    setOptionsRequestKey((key) => key + 1)
                  }}
                >
                  다시 시도
                </Button>
              </>
            ) : (
              <p className="text-[12px] text-warm-gray" role="status">견종과 활동 정보를 불러오는 중...</p>
            )}
          </m.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {deleteTarget && (
          <DeletePetModal
            key={`delete-${deleteTarget.id}`}
            pet={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onDelete={async () => {
              await onDelete(deleteTarget.id)
              setDeleteTarget(null)
            }}
            onMemory={() => {
              setDeleteTarget(null)
              setMemoryNotice('추억 보관 API가 준비되면 연결할 예정입니다.')
            }}
          />
        )}
        {showEditor && options && (
          <PetEditor
            key={editorPet ? `edit-${editorPet.id}` : 'create-pet'}
            pet={editorPet}
            options={options}
            onClose={() => setShowEditor(false)}
            onSubmit={async (input) => {
              if (editorPet) await onUpdate(editorPet.id, input)
              else await onCreate(input)
              setShowEditor(false)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function StampsSubScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="여행 스탬프" showBack onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24 pt-4">
        <p className="mb-1 text-[13px] text-warm-gray">방문한 지역의 스탬프를 모아보세요!</p>
        <p className="mb-4 text-[11px] text-warm-gray">스탬프 API 연결 전 예시 데이터입니다.</p>
        <div className="grid grid-cols-3 gap-3">
          {stamps.map((stamp, index) => (
            <div key={`${stamp.region}-${index}`} className={cn('flex flex-col items-center rounded-card border p-3 shadow-sm', stamp.acquired ? 'border-border bg-card-surface' : 'border-border bg-muted opacity-50')}>
              <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white shadow-sm" style={{ backgroundColor: stamp.acquired ? stamp.color : '#DDD4C0' }}>
                <span className="text-[20px] font-black text-white">{stamp.acquired ? stamp.mascot[0] : '?'}</span>
              </div>
              <p className="text-[13px] font-bold text-deep-brown">{stamp.region}</p>
              {stamp.acquired ? <><p className="mt-0.5 text-[10px] text-warm-gray">{stamp.count}회 방문</p><p className="text-[9px] text-warm-gray">{stamp.date}</p></> : <p className="mt-0.5 text-[10px] text-warm-gray">미획득</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MemoryAlbumSubScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="추억 앨범" showBack onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24 pt-4">
        <p className="mb-1 text-[13px] leading-relaxed text-warm-gray">무지개 다리를 건넌 소중한 반려동물과의 추억이 여기 보관되어 있어요.</p>
        <p className="mb-5 text-[11px] text-warm-gray">추억 보관 API 연결 전 예시 데이터입니다.</p>
        {memoryAlbums.map((album) => (
          <div key={album.petName} className="mb-4 overflow-hidden rounded-card border border-border bg-card-surface shadow-sm">
            <div className="relative h-44">
              <Image src={album.coverImage} alt={album.petName} fill className="object-cover opacity-85" />
              <div className="absolute inset-0 bg-gradient-to-t from-deep-brown/70 to-transparent" />
              <div className="absolute bottom-4 left-4"><p className="text-[20px] font-bold text-white">{album.petName}</p><p className="text-[12px] text-white/80">{album.breed}</p></div>
            </div>
            <div className="p-4">
              <p className="mb-1 text-[13px] text-warm-gray">{album.period}</p>
              <p className="text-[15px] font-semibold italic text-deep-brown">&ldquo;{album.note}&rdquo;</p>
              <p className="mt-3 text-[12px] text-warm-gray">{album.albumCount}개의 여행 앨범</p>
              <Button className="mt-3" variant="soft" fullWidth disabled><Heart className="h-4 w-4" />API 준비 중</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProfileScreen({
  summary,
  pets,
  status,
  errorMessage,
  onRetry,
  onLogout,
  onOpenSettings,
  onLoadPetOptions,
  onCreatePet,
  onUpdatePet,
  onDeletePet,
  onWithdraw,
}: ProfileScreenProps) {
  const [subScreen, setSubScreen] = useState<SubScreen>(null)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const firstPet = pets[0]
  const menuItems = useMemo(() => [
    { icon: PawPrint, iconColor: 'text-sage-green', label: '반려동물 관리', sub: 'pets' as const, desc: firstPet ? `${firstPet.petName} · ${summary?.petCount ?? pets.length}마리` : '등록된 반려견 없음' },
    { icon: Stamp, iconColor: 'text-soft-orange', label: '스탬프', sub: 'stamps' as const, desc: 'API 준비 중' },
    { icon: Heart, iconColor: 'text-danger', label: '추억 앨범', sub: 'memory-album' as const, desc: 'API 준비 중' },
    { icon: FileText, iconColor: 'text-warm-gray', label: '작성한 글', tab: 'posts' as const, desc: '내 작성글 보기' },
    { icon: Star, iconColor: 'text-soft-orange', label: '장소 위시리스트', tab: 'wishlist' as const, desc: '저장한 장소 보기' },
    { icon: Bookmark, iconColor: 'text-sky-blue', label: '북마크', tab: 'bookmarks' as const, desc: '저장한 게시글 보기' },
    { icon: MessageSquareText, iconColor: 'text-sage-green', label: '작성한 리뷰', tab: 'reviews' as const, desc: '내 리뷰 보기' },
  ], [firstPet, pets.length, summary?.petCount])

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-warm-beige">
    <AnimatePresence initial={false} mode="wait">
      {subScreen === 'pets' ? (
        <ProfilePane key="pets" direction="forward">
          <PetsSubScreen pets={pets} onBack={() => setSubScreen(null)} onLoadOptions={onLoadPetOptions} onCreate={onCreatePet} onUpdate={onUpdatePet} onDelete={onDeletePet} />
        </ProfilePane>
      ) : subScreen === 'stamps' ? (
        <ProfilePane key="stamps" direction="forward">
          <StampsSubScreen onBack={() => setSubScreen(null)} />
        </ProfilePane>
      ) : subScreen === 'memory-album' ? (
        <ProfilePane key="memory-album" direction="forward">
          <MemoryAlbumSubScreen onBack={() => setSubScreen(null)} />
        </ProfilePane>
      ) : (
    <ProfilePane key="profile-main" direction="back">
      <TopBar title="내정보" rightAction={<span />} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <AnimatePresence initial={false}>
          {status === 'error' && errorMessage && (
          <m.div
            initial={{ opacity: 0, height: 0, y: prefersReducedMotion ? 0 : -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
            className="mx-4 mt-4 overflow-hidden rounded-card border border-danger/20 bg-danger/5 p-3"
            role="alert"
          >
            <p className="text-[12px] text-danger">{errorMessage}</p>
            <Button className="mt-2" variant="outline" size="sm" onClick={onRetry}>다시 불러오기</Button>
          </m.div>
          )}
        </AnimatePresence>
        <m.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.03, ease: PROFILE_MOTION_EASE }}
          className="mx-4 mt-4 rounded-card border border-border bg-card-surface p-4 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-sage-green/30">
              <Image src="/images/dog-hero.png" alt="프로필" fill className="object-cover" loading="eager" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-bold text-deep-brown">{status === 'loading' ? '불러오는 중...' : summary?.nickname || '내정보'}</h2>
                <IconButton aria-label="닉네임 수정" size="sm" disabled={!summary} onClick={() => onOpenSettings?.('nickname')}><Edit3 className="h-4 w-4 text-warm-gray" /></IconButton>
              </div>
              <p className="text-[12px] text-warm-gray">{summary?.email ?? '이메일 정보 없음'}</p>
              <div className="mt-2 flex gap-4">
                {[{ val: '—', label: '여행km' }, { val: '—', label: '방문지' }, { val: '—', label: '스탬프' }].map((item) => <div key={item.label} className="text-center"><p className="text-[15px] font-bold text-deep-brown">{item.val}</p><p className="text-[10px] text-warm-gray">{item.label}</p></div>)}
              </div>
            </div>
          </div>
        </m.div>

        <m.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.08, ease: PROFILE_MOTION_EASE }}
          className="mx-4 mt-4 rounded-card border border-border bg-card-surface p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between"><p className="text-[14px] font-semibold text-deep-brown">나의 반려동물</p><Button onClick={() => setSubScreen('pets')} variant="link" size="sm" className="h-auto p-0 text-[12px] no-underline">관리</Button></div>
          {firstPet ? <div className="flex items-center gap-3"><div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-border"><Image src="/images/dog-hero.png" alt={firstPet.petName} fill className="object-cover" /></div><div><p className="text-[14px] font-semibold text-deep-brown">{firstPet.petName}</p><p className="text-[12px] text-warm-gray">{firstPet.breedName} · {sizeLabel[firstPet.size]} · {firstPet.age}살</p></div></div> : <p className="text-[12px] text-warm-gray">등록된 반려견이 없습니다.</p>}
        </m.div>

        <m.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.13, ease: PROFILE_MOTION_EASE }}
          className="mx-4 mt-4 overflow-hidden rounded-card border border-border bg-card-surface shadow-sm"
        >
          {menuItems.map((item) => (
            <m.div key={item.label} whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}>
              <MenuRow label={item.label} description={item.desc} icon={<item.icon className={cn('h-5 w-5', item.iconColor)} />} onClick={() => item.sub ? setSubScreen(item.sub) : item.tab ? onOpenSettings?.(item.tab) : undefined} />
            </m.div>
          ))}
        </m.div>

        <m.div
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.25, delay: prefersReducedMotion ? 0 : 0.18 }}
          className="mx-4 mb-4 mt-4 flex items-center gap-4"
        >
          {onLogout && <Button onClick={onLogout} variant="link" size="sm" className="h-auto p-0 text-[13px] text-warm-gray underline underline-offset-2">로그아웃</Button>}
          <Button onClick={() => setShowWithdraw(true)} variant="link" size="sm" className="h-auto p-0 text-[13px] text-warm-gray/60 underline underline-offset-2">회원 탈퇴</Button>
        </m.div>
      </div>
      <AnimatePresence initial={false}>
        {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} onConfirm={onWithdraw} />}
      </AnimatePresence>
    </ProfilePane>
      )}
    </AnimatePresence>
    </div>
  )
}
