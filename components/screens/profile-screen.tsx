'use client'

import Image from 'next/image'
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, m, useIsPresent, useReducedMotion } from 'motion/react'
import {
  AlertTriangle,
  Archive,
  Bookmark,
  Camera,
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
import { PhotoImage } from '@/components/common/photo-image'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import { InteractiveCard } from '@/components/ui/interactive-card'
import { MenuRow } from '@/components/ui/menu-row'
import { ModalActions } from '@/components/ui/modal-actions'
import { cn } from '@/lib/utils'
import {
  isSupportedMetadataSafeImage,
  METADATA_SAFE_IMAGE_ACCEPT,
} from '@/features/photos/lib/sanitize-image-file'
import { getProfileErrorMessage } from '@/features/profile/api/profile-api'
import {
  isCommonPetProfileImage,
  PET_PROFILE_IMAGE_ACCEPT,
} from '@/features/profile/lib/pet-profile-image'
import { getStampRegion } from '@/features/stamps/constants/regions'
import type { StampCollection } from '@/features/stamps/types/stamp'
import type {
  PetMutationInput,
  PetOptions,
  ProfileLoadStatus,
  ProfilePet,
  ProfilePhoto,
  ProfileSummary,
} from '@/features/profile/types/profile'
import type { PetSize } from '@/features/auth/types/signup'
import type { SettingsTab } from '@/components/screens/profile-settings-screens'

interface ProfileScreenProps {
  summary: ProfileSummary | null
  profilePhoto: ProfilePhoto | null
  pets: ProfilePet[]
  status: ProfileLoadStatus
  errorMessage: string | null
  onRetry: () => void
  onOpenSettings?: (tab: SettingsTab) => void
  onLogout?: () => void | Promise<void>
  onLoadPetOptions: (signal?: AbortSignal) => Promise<PetOptions>
  onLoadStamps: (signal?: AbortSignal) => Promise<StampCollection>
  onCreatePet: (input: PetMutationInput) => Promise<ProfilePet>
  onUpdatePet: (petId: string, input: PetMutationInput) => Promise<ProfilePet>
  onUpdatePetPhoto: (petId: string, file: File | null) => Promise<ProfilePet>
  onDeletePet: (petId: string) => Promise<void>
  onUpdateProfilePhoto: (file: File | null) => Promise<ProfilePhoto>
  onWithdraw: () => Promise<void>
}

type SubScreen = null | 'pets' | 'stamps' | 'memory-album'

const sizeLabel: Record<PetSize, string> = {
  SMALL: '소형',
  MEDIUM: '중형',
  LARGE: '대형',
}

const PROFILE_MOTION_EASE = [0.22, 1, 0.36, 1] as const

interface ModalIsolationState {
  count: number
  inert: string | null
  hidden: string | null
}

const modalIsolationStates = new WeakMap<HTMLElement, ModalIsolationState>()

function isolateModalBackground(element: HTMLElement) {
  const current = modalIsolationStates.get(element)
  if (current) {
    current.count += 1
    return
  }

  modalIsolationStates.set(element, {
    count: 1,
    inert: element.getAttribute('inert'),
    hidden: element.getAttribute('aria-hidden'),
  })
  element.setAttribute('inert', '')
  element.setAttribute('aria-hidden', 'true')
}

function restoreModalBackground(element: HTMLElement) {
  const current = modalIsolationStates.get(element)
  if (!current) return

  current.count -= 1
  if (current.count > 0) return

  if (current.inert === null) element.removeAttribute('inert')
  else element.setAttribute('inert', current.inert)
  if (current.hidden === null) element.removeAttribute('aria-hidden')
  else element.setAttribute('aria-hidden', current.hidden)
  modalIsolationStates.delete(element)
}

function ProfileLoadingBar({
  className,
  prefersReducedMotion,
}: {
  className: string
  prefersReducedMotion: boolean | null
}) {
  return (
    <m.span
      aria-hidden="true"
      className={cn('block rounded-full bg-muted', className)}
      animate={prefersReducedMotion ? { opacity: 0.7 } : { opacity: [0.45, 0.85, 0.45] }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 1.35, ease: 'easeInOut', repeat: Infinity }
      }
    />
  )
}

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
      className="absolute inset-0 flex min-h-0 flex-col overflow-hidden bg-warm-beige has-[[aria-modal=true]]:z-[60]"
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

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null
    if (!dialog) return

    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const focusableElements = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))

    dialog.focus({ preventScroll: true })

    // Isolate the overlay, not just the focusable dialog. The backdrop stays
    // clickable while ancestor siblings (including navigation) become inert.
    const isolated: HTMLElement[] = []
    let overlay = dialog.parentElement
    while (overlay && overlay !== document.body) {
      const parent = overlay.parentElement
      if (!parent) break
      for (const sibling of parent.children) {
        if (sibling === overlay || !(sibling instanceof HTMLElement)) continue
        isolated.push(sibling)
        isolateModalBackground(sibling)
      }
      overlay = parent
    }

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
        dialog.focus({ preventScroll: true })
        return
      }
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (document.activeElement === dialog) {
        event.preventDefault()
        const focusTarget = event.shiftKey ? last : first
        focusTarget.focus({ preventScroll: true })
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus({ preventScroll: true })
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus({ preventScroll: true })
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      for (const element of isolated) {
        restoreModalBackground(element)
      }
      previouslyFocused?.focus({ preventScroll: true })
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
          <InteractiveCard onClick={onMemory} disabled={isDeleting} className="border-sage-green bg-sage-green-light hover:bg-sage-green-light/75">
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
        <button type="button" aria-pressed={agreed} disabled={isSubmitting} onClick={() => setAgreed(!agreed)} className="mb-4 flex w-full items-center gap-2">
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
  onUpdatePhoto,
  onDelete,
}: {
  pets: ProfilePet[]
  onBack: () => void
  onLoadOptions: (signal?: AbortSignal) => Promise<PetOptions>
  onCreate: (input: PetMutationInput) => Promise<ProfilePet>
  onUpdate: (petId: string, input: PetMutationInput) => Promise<ProfilePet>
  onUpdatePhoto: (petId: string, file: File | null) => Promise<ProfilePet>
  onDelete: (petId: string) => Promise<void>
}) {
  const [deleteTarget, setDeleteTarget] = useState<ProfilePet | null>(null)
  const [editorPet, setEditorPet] = useState<ProfilePet | null>(null)
  const [photoEditorPet, setPhotoEditorPet] = useState<ProfilePet | null>(null)
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
      .then((nextOptions) => {
        if (!controller.signal.aborted) setOptions(nextOptions)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setOptionsError(getProfileErrorMessage(error))
      })
    return () => controller.abort()
  }, [onLoadOptions, options, optionsRequestKey, showEditor])

  const openEditor = (pet: ProfilePet | null) => {
    setPhotoEditorPet(null)
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
              <button
                type="button"
                aria-label={`${pet.petName} 프로필 사진 ${pet.profilePhoto ? '수정' : '등록'}`}
                className="relative h-14 w-14 flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-green focus-visible:ring-offset-2"
                onClick={() => {
                  setShowEditor(false)
                  setOptionsError(null)
                  setDeleteTarget(null)
                  setPhotoEditorPet(pet)
                }}
              >
                <PhotoImage
                  src={pet.profilePhoto?.downloadUrl}
                  photoId={pet.profilePhoto?.photoId}
                  alt={`${pet.petName} 프로필 사진`}
                  className="h-full w-full rounded-full border-2 border-sage-green/30"
                  fallbackSrc="/images/dog-hero.png"
                  fallbackAlt={`${pet.petName} 기본 프로필 사진`}
                  sizes="56px"
                />
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card-surface bg-sage-green text-white">
                  <Camera aria-hidden="true" className="h-2.5 w-2.5" />
                </span>
              </button>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-bold text-deep-brown">{pet.petName}</p>
                  <div className="flex gap-1">
                    <IconButton aria-label={`${pet.petName} 수정`} size="sm" onClick={() => openEditor(pet)}>
                      <Edit3 className="h-4 w-4 text-warm-gray" />
                    </IconButton>
                    <IconButton aria-label={`${pet.petName} 삭제`} size="sm" variant="danger" onClick={() => {
                      setPhotoEditorPet(null)
                      setShowEditor(false)
                      setOptionsError(null)
                      setDeleteTarget(pet)
                    }}>
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
        {photoEditorPet && (
          <ProfilePhotoEditor
            key={`photo-${photoEditorPet.id}`}
            currentPhoto={photoEditorPet.profilePhoto}
            title={`${photoEditorPet.petName} 프로필 사진 ${photoEditorPet.profilePhoto ? '수정' : '등록'}`}
            currentPhotoAlt={`${photoEditorPet.petName} 현재 프로필 사진`}
            inputLabel={`${photoEditorPet.petName} 새 프로필 사진 선택`}
            accept={PET_PROFILE_IMAGE_ACCEPT}
            isValidFile={isCommonPetProfileImage}
            invalidFileMessage="JPG, PNG, WebP 이미지 파일만 선택할 수 있어요."
            onClose={() => setPhotoEditorPet(null)}
            onSave={(file) => onUpdatePhoto(photoEditorPet.id, file)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function formatStampDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return ''
  return `${Number(match[1])}. ${Number(match[2])}. ${Number(match[3])}.`
}

function StampBookLoading() {
  return (
    <div aria-hidden="true">
      <div className="mt-4 h-28 animate-pulse rounded-card border border-border bg-card-surface" />
      <div className="mt-6 grid grid-cols-3 gap-x-2 gap-y-5">
        {Array.from({ length: 9 }, (_, index) => (
          <div key={index} className="flex flex-col items-center">
            <div className="h-[92px] w-[92px] animate-pulse rounded-full bg-muted" />
            <div className="mt-2 h-3 w-10 animate-pulse rounded-full bg-muted" />
            <div className="mt-1.5 h-2.5 w-14 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}

function StampsSubScreen({
  onBack,
  onLoad,
}: {
  onBack: () => void
  onLoad: (signal?: AbortSignal) => Promise<StampCollection>
}) {
  const [collection, setCollection] = useState<StampCollection | null>(null)
  const [status, setStatus] = useState<ProfileLoadStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [requestVersion, setRequestVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    void onLoad(controller.signal)
      .then((nextCollection) => {
        if (controller.signal.aborted) return
        setCollection(nextCollection)
        setStatus('success')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setCollection(null)
        setErrorMessage(getProfileErrorMessage(error))
        setStatus('error')
      })

    return () => controller.abort()
  }, [onLoad, requestVersion])

  const progress = collection && collection.totalCount > 0
    ? Math.round((collection.acquiredCount / collection.totalCount) * 100)
    : 0
  const remainingCount = collection
    ? Math.max(collection.totalCount - collection.acquiredCount, 0)
    : 0

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="여행 스탬프" showBack onBack={onBack} />
      <div
        className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24 pt-4"
        aria-busy={status === 'loading'}
      >
        <p className="text-[13px] text-warm-gray">방문한 지역의 스탬프를 모아보세요!</p>
        <span className="sr-only" role="status">
          {status === 'loading'
            ? '스탬프 도감을 불러오는 중'
            : status === 'success'
              ? '스탬프 도감 불러오기 완료'
              : '스탬프 도감을 불러오지 못했습니다'}
        </span>

        {status === 'loading' ? (
          <StampBookLoading />
        ) : status === 'error' ? (
          <section
            aria-labelledby="stamps-error-title"
            className="mt-4 rounded-card border border-danger/20 bg-card-surface px-4 py-8 text-center shadow-sm"
            role="alert"
          >
            <Stamp aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-soft-orange" />
            <h2 id="stamps-error-title" className="text-[14px] font-semibold text-deep-brown">
              스탬프를 불러오지 못했어요
            </h2>
            <p className="mt-2 text-[12px] leading-relaxed text-warm-gray">{errorMessage}</p>
            <Button
              className="mt-4"
              variant="outline"
              size="sm"
              onClick={() => {
                setCollection(null)
                setStatus('loading')
                setErrorMessage(null)
                setRequestVersion((version) => version + 1)
              }}
            >
              다시 불러오기
            </Button>
          </section>
        ) : collection ? (
          <>
            <section
              aria-labelledby="stamp-progress-title"
              className="mt-4 rounded-card border border-border bg-card-surface p-4 shadow-sm"
            >
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 id="stamp-progress-title" className="text-[14px] font-semibold text-deep-brown">
                    수집 현황
                  </h2>
                  <p className="mt-1 text-[11px] text-warm-gray">
                    {collection.totalCount === 0
                      ? '등록된 지역 정보를 기다리고 있어요'
                      : remainingCount === 0
                      ? '모든 지역의 스탬프를 모았어요!'
                      : `${remainingCount}개 지역을 더 방문해보세요`}
                  </p>
                </div>
                <p className="shrink-0 text-[24px] font-bold leading-none text-soft-orange">
                  {collection.acquiredCount}
                  <span className="ml-1 text-[13px] font-semibold text-warm-gray">
                    / {collection.totalCount}
                  </span>
                </p>
              </div>
              <div
                className="mt-4 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label="스탬프 수집률"
                aria-valuemin={0}
                aria-valuemax={Math.max(collection.totalCount, 1)}
                aria-valuenow={collection.acquiredCount}
              >
                <div
                  className="h-full rounded-full bg-soft-orange transition-[width] duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </section>

            <section aria-labelledby="regional-stamps-title" className="mt-6">
              <div className="flex items-center justify-between">
                <h2 id="regional-stamps-title" className="text-[15px] font-bold text-deep-brown">
                  지역 스탬프
                </h2>
                <span className="text-[11px] text-warm-gray">총 {collection.totalCount}개 지역</span>
              </div>
              {collection.stamps.length > 0 ? (
                <ul className="mt-4 grid grid-cols-3 gap-x-2 gap-y-5">
                  {collection.stamps.map((stamp, index) => {
                    const region = getStampRegion(stamp.stampName)
                    if (!region) return null
                    const state = stamp.acquired ? 'achieved' : 'unachieved'
                    const formattedDate = stamp.firstAcquiredAt
                      ? formatStampDate(stamp.firstAcquiredAt)
                      : ''
                    return (
                      <li
                        key={stamp.stampId}
                        className="flex min-w-0 flex-col items-center text-center"
                        aria-label={`${stamp.stampName} ${stamp.acquired ? `${stamp.stampCount}회 방문` : '미획득'}`}
                      >
                        <Image
                          src={`/stamps/${state}/${region.slug}.png`}
                          alt={`${stamp.stampName} 스탬프 ${stamp.acquired ? '획득' : '미획득'}`}
                          width={104}
                          height={104}
                          className="h-auto w-full max-w-[104px]"
                          priority={index < 6}
                        />
                        <p className="mt-1 text-[13px] font-bold text-deep-brown">{stamp.stampName}</p>
                        <p className={cn(
                          'mt-0.5 text-[10px] font-semibold',
                          stamp.acquired ? 'text-soft-orange' : 'text-warm-gray'
                        )}>
                          {stamp.acquired ? `${stamp.stampCount}회 방문` : '미획득'}
                        </p>
                        {formattedDate && (
                          <time
                            dateTime={stamp.firstAcquiredAt ?? undefined}
                            className="mt-0.5 text-[9px] text-warm-gray"
                          >
                            {formattedDate}
                          </time>
                        )}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-4 rounded-card border border-border bg-card-surface px-4 py-8 text-center text-[12px] text-warm-gray">
                  아직 등록된 지역 스탬프가 없어요.
                </p>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}

function MemoryAlbumSubScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-warm-beige">
      <TopBar title="추억 앨범" showBack onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-24 pt-4">
        <p className="mb-1 text-[13px] leading-relaxed text-warm-gray">소중한 반려동물과의 추억을 간직할 공간이에요.</p>
        <section aria-labelledby="memory-albums-unavailable-title" className="mt-4 rounded-card border border-border bg-card-surface px-4 py-8 text-center shadow-sm">
          <Heart aria-hidden="true" className="mx-auto mb-3 h-8 w-8 text-danger" />
          <h2 id="memory-albums-unavailable-title" className="text-[14px] font-semibold text-deep-brown">추억 앨범 기능을 준비하고 있어요</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-warm-gray">아직 추억 앨범 정보를 불러올 수 없어요. 기능이 연결되면 이곳에서 확인할 수 있어요.</p>
        </section>
      </div>
    </div>
  )
}

function ProfilePhotoEditor({
  currentPhoto,
  title = '프로필 사진 수정',
  currentPhotoAlt = '현재 프로필 사진',
  inputLabel = '새 프로필 사진 선택',
  accept = METADATA_SAFE_IMAGE_ACCEPT,
  isValidFile = isSupportedMetadataSafeImage,
  invalidFileMessage = '이미지 파일만 선택할 수 있어요.',
  onClose,
  onSave,
}: {
  currentPhoto: ProfilePhoto | null
  title?: string
  currentPhotoAlt?: string
  inputLabel?: string
  accept?: string
  isValidFile?: (file: File) => boolean
  invalidFileMessage?: string
  onClose: () => void
  onSave: (file: File | null) => Promise<unknown>
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useModalFocus(onClose, isSaving)
  const prefersReducedMotion = useReducedMotion()

  const save = async (file: File | null) => {
    if (isSaving) return
    if (file && !isValidFile(file)) {
      setErrorMessage(invalidFileMessage)
      return
    }
    setIsSaving(true)
    setErrorMessage(null)
    try {
      await onSave(file)
      onClose()
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
        aria-labelledby="profile-photo-editor-title"
        tabIndex={-1}
        initial={prefersReducedMotion ? false : { y: '100%' }}
        animate={{ y: 0 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { y: '100%' }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.34, ease: PROFILE_MOTION_EASE }}
        className="relative w-full rounded-t-[24px] bg-card-surface p-5 pb-10"
      >
        <h3 id="profile-photo-editor-title" className="text-[17px] font-bold text-deep-brown">{title}</h3>
        <p className="mt-1 text-[12px] text-warm-gray">새 사진을 선택하거나 기본 프로필로 돌아갈 수 있어요.</p>
        <PhotoImage
          src={currentPhoto?.photoId ? currentPhoto.downloadUrl : '/images/default-profile.svg'}
          alt={currentPhotoAlt}
          className="mx-auto mt-5 h-24 w-24 rounded-full border-2 border-sage-green/30"
          fallbackSrc="/images/default-profile.svg"
          fallbackAlt="기본 프로필"
          sizes="96px"
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          aria-label={inputLabel}
          disabled={isSaving}
          onChange={(event) => {
            const file = event.target.files?.[0] ?? null
            event.target.value = ''
            if (file) void save(file)
          }}
        />
        {errorMessage && <p className="mt-4 text-[12px] text-danger" role="alert">{errorMessage}</p>}
        <div className="mt-5 space-y-2">
          <Button fullWidth disabled={isSaving} onClick={() => inputRef.current?.click()}>
            <Camera className="h-4 w-4" />{isSaving ? '저장 중…' : '사진 선택'}
          </Button>
          <Button fullWidth variant="outline" disabled={isSaving || !currentPhoto?.photoId} onClick={() => void save(null)}>기본 프로필로 변경</Button>
          <Button fullWidth variant="ghost" disabled={isSaving} onClick={onClose}>닫기</Button>
        </div>
      </m.div>
    </m.div>
  )
}

export default function ProfileScreen({
  summary,
  profilePhoto,
  pets,
  status,
  errorMessage,
  onRetry,
  onLogout,
  onOpenSettings,
  onLoadPetOptions,
  onLoadStamps,
  onCreatePet,
  onUpdatePet,
  onUpdatePetPhoto,
  onDeletePet,
  onUpdateProfilePhoto,
  onWithdraw,
}: ProfileScreenProps) {
  const [subScreen, setSubScreen] = useState<SubScreen>(null)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showProfilePhotoEditor, setShowProfilePhotoEditor] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const visiblePets = pets.slice(0, 3)
  const totalPetCount = pets.length
  const remainingPetCount = Math.max(totalPetCount - visiblePets.length, 0)
  const visiblePetNames = visiblePets.map((pet) => pet.petName).join(' · ')
  const menuItems = useMemo(() => [
    { icon: PawPrint, iconColor: 'text-sage-green', label: '반려동물 관리', sub: 'pets' as const, desc: status === 'loading' ? '반려동물 정보를 불러오는 중' : status === 'error' ? '반려동물 정보를 불러오지 못함' : '추가 · 수정 · 삭제' },
    { icon: Stamp, iconColor: 'text-soft-orange', label: '스탬프', sub: 'stamps' as const, desc: '17개 지역 도감' },
    { icon: Heart, iconColor: 'text-danger', label: '추억 앨범', sub: 'memory-album' as const, desc: 'API 준비 중' },
    { icon: FileText, iconColor: 'text-warm-gray', label: '작성한 글', tab: 'posts' as const, desc: '내 작성글 보기' },
    { icon: Star, iconColor: 'text-soft-orange', label: '장소 위시리스트', tab: 'wishlist' as const, desc: '저장한 장소 보기' },
    { icon: Bookmark, iconColor: 'text-sky-blue', label: '북마크', tab: 'bookmarks' as const, desc: '저장한 게시글 보기' },
    { icon: MessageSquareText, iconColor: 'text-sage-green', label: '작성한 리뷰', tab: 'reviews' as const, desc: '내 리뷰 보기' },
  ], [status])

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden bg-warm-beige">
    <AnimatePresence initial={false} mode="wait">
      {subScreen === 'pets' ? (
        <ProfilePane key="pets" direction="forward">
          <PetsSubScreen pets={pets} onBack={() => setSubScreen(null)} onLoadOptions={onLoadPetOptions} onCreate={onCreatePet} onUpdate={onUpdatePet} onUpdatePhoto={onUpdatePetPhoto} onDelete={onDeletePet} />
        </ProfilePane>
      ) : subScreen === 'stamps' ? (
        <ProfilePane key="stamps" direction="forward">
          <StampsSubScreen onBack={() => setSubScreen(null)} onLoad={onLoadStamps} />
        </ProfilePane>
      ) : subScreen === 'memory-album' ? (
        <ProfilePane key="memory-album" direction="forward">
          <MemoryAlbumSubScreen onBack={() => setSubScreen(null)} />
        </ProfilePane>
      ) : (
    <ProfilePane key="profile-main" direction="back">
      <TopBar title="내정보" rightAction={<span />} />
      <div
        role="region"
        aria-label="내정보 콘텐츠"
        aria-busy={status === 'loading'}
        className="flex-1 overflow-y-auto no-scrollbar pb-24"
      >
        <span className="sr-only" role="status">
          {status === 'loading'
            ? '내정보와 반려동물 정보를 불러오는 중'
            : status === 'success'
              ? '내정보 불러오기 완료'
              : '내정보를 불러오지 못했습니다'}
        </span>
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
            <button
              type="button"
              aria-label="프로필 사진 수정"
              disabled={status !== 'success'}
              onClick={() => setShowProfilePhotoEditor(true)}
              className="relative h-16 w-16 flex-shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-green focus-visible:ring-offset-2 disabled:cursor-default"
            >
              <PhotoImage
                src={profilePhoto?.photoId ? profilePhoto.downloadUrl : '/images/default-profile.svg'}
                alt="프로필"
                className="h-16 w-16 rounded-full border-2 border-sage-green/30"
                fallbackSrc="/images/default-profile.svg"
                fallbackAlt="기본 프로필"
                sizes="64px"
                priority
              />
              {status === 'success' && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card-surface bg-sage-green text-white">
                  <Camera className="h-3 w-3" aria-hidden="true" />
                </span>
              )}
            </button>
            <div className="relative min-h-24 flex-1">
              <AnimatePresence initial={false}>
                {status === 'loading' ? (
                  <m.div
                    key="profile-summary-loading"
                    aria-hidden="true"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
                    className="absolute inset-0 flex flex-col justify-center"
                  >
                    <ProfileLoadingBar className="h-5 w-28" prefersReducedMotion={prefersReducedMotion} />
                    <ProfileLoadingBar className="mt-2 h-3 w-40" prefersReducedMotion={prefersReducedMotion} />
                    <div className="mt-3 flex gap-4">
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="space-y-1.5">
                          <ProfileLoadingBar className="h-3 w-7" prefersReducedMotion={prefersReducedMotion} />
                          <ProfileLoadingBar className="h-2 w-9" prefersReducedMotion={prefersReducedMotion} />
                        </div>
                      ))}
                    </div>
                  </m.div>
                ) : status === 'success' ? (
                  <m.div
                    key="profile-summary-ready"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: PROFILE_MOTION_EASE }}
                    className="relative"
                  >
                    <div className="flex items-center gap-2">
                      <h2 className="text-[18px] font-bold text-deep-brown">{summary?.nickname || '내정보'}</h2>
                      <IconButton aria-label="닉네임 수정" size="sm" disabled={!summary} onClick={() => onOpenSettings?.('nickname')}><Edit3 className="h-4 w-4 text-warm-gray" /></IconButton>
                    </div>
                    <p className="text-[12px] text-warm-gray">{summary?.email ?? '이메일 정보 없음'}</p>
                    <div className="mt-2 flex gap-4">
                      {[{ val: '—', label: '여행km' }, { val: '—', label: '방문지' }, { val: '—', label: '스탬프' }].map((item) => <div key={item.label} className="text-center"><p className="text-[15px] font-bold text-deep-brown">{item.val}</p><p className="text-[10px] text-warm-gray">{item.label}</p></div>)}
                    </div>
                  </m.div>
                ) : (
                  <m.div
                    key="profile-summary-error"
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                    className="relative flex min-h-24 flex-col justify-center"
                  >
                    <p className="text-[14px] font-semibold text-deep-brown">프로필 정보를 표시할 수 없어요</p>
                    <p className="mt-1 text-[12px] text-warm-gray">위의 다시 불러오기를 눌러주세요.</p>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </m.div>

        <m.section
          aria-labelledby="my-pets-summary-title"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.08, ease: PROFILE_MOTION_EASE }}
          className="mx-4 mt-4 rounded-card border border-border bg-card-surface p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 id="my-pets-summary-title" className="text-[14px] font-semibold text-deep-brown">나의 반려동물</h3>
            {status === 'success' && (
              <span className="rounded-full bg-sage-green/10 px-2 py-1 text-[11px] font-semibold text-sage-green">
                총 {totalPetCount}마리
              </span>
            )}
          </div>
          <div className="relative min-h-28">
            <AnimatePresence initial={false}>
              {status === 'loading' ? (
                <m.div
                  key="pet-summary-loading"
                  aria-hidden="true"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
                  className="absolute inset-0 grid grid-cols-3 gap-2"
                >
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="flex flex-col items-center justify-center rounded-card bg-muted/40 px-2 py-2">
                      <ProfileLoadingBar className="h-10 w-10 flex-shrink-0 rounded-full" prefersReducedMotion={prefersReducedMotion} />
                      <ProfileLoadingBar className="mt-2 h-3 w-12" prefersReducedMotion={prefersReducedMotion} />
                    </div>
                  ))}
                </m.div>
              ) : status === 'success' && visiblePets.length > 0 ? (
                <m.div
                  key="pet-summary-ready"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.22, ease: PROFILE_MOTION_EASE }}
                  className="relative"
                >
                  <div className="grid grid-cols-3 gap-2">
                    {visiblePets.map((pet) => (
                      <div key={pet.id} className="flex min-w-0 flex-col items-center rounded-card bg-muted/40 px-2 py-2 text-center">
                        <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-border">
                          <PhotoImage
                            src={pet.profilePhoto?.downloadUrl}
                            photoId={pet.profilePhoto?.photoId}
                            alt=""
                            className="h-full w-full"
                            fallbackSrc="/images/dog-hero.png"
                            fallbackAlt=""
                            sizes="40px"
                            priority
                          />
                        </div>
                        <p className="mt-1.5 max-w-full truncate text-[12px] font-semibold text-deep-brown">{pet.petName}</p>
                      </div>
                    ))}
                  </div>
                  {remainingPetCount > 0 && (
                    <p className="mt-2 flex min-w-0 items-center justify-center gap-1 text-center text-[11px] text-warm-gray">
                      <span className="sr-only">{visiblePetNames} 외 {remainingPetCount}마리</span>
                      <span aria-hidden="true" className="min-w-0 truncate">{visiblePetNames}</span>
                      <span aria-hidden="true" className="shrink-0">외 {remainingPetCount}마리</span>
                    </p>
                  )}
                </m.div>
              ) : status === 'success' ? (
                <m.p key="pet-summary-empty" initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="relative flex min-h-28 items-center justify-center text-[12px] text-warm-gray">등록된 반려견이 없습니다.</m.p>
              ) : (
                <m.p key="pet-summary-error" initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="relative flex min-h-28 items-center justify-center text-[12px] text-warm-gray">반려동물 정보를 표시할 수 없어요.</m.p>
              )}
            </AnimatePresence>
          </div>
        </m.section>

        <m.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.13, ease: PROFILE_MOTION_EASE }}
          className="mx-4 mt-4 overflow-hidden rounded-card border border-border bg-card-surface shadow-sm"
        >
          {menuItems.map((item) => {
            const isPetMenuDisabled = status !== 'success' && item.sub === 'pets'
            return (
              <m.div key={item.label} className="border-b border-border last:border-0" whileTap={prefersReducedMotion || isPetMenuDisabled ? undefined : { scale: 0.985 }}>
                <MenuRow disabled={isPetMenuDisabled} label={item.label} description={item.desc} icon={<item.icon className={cn('h-5 w-5', item.iconColor)} />} onClick={() => item.sub ? setSubScreen(item.sub) : item.tab ? onOpenSettings?.(item.tab) : undefined} />
              </m.div>
            )
          })}
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
        {showProfilePhotoEditor && (
          <ProfilePhotoEditor
            currentPhoto={profilePhoto}
            onClose={() => setShowProfilePhotoEditor(false)}
            onSave={onUpdateProfilePhoto}
          />
        )}
        {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} onConfirm={onWithdraw} />}
      </AnimatePresence>
    </ProfilePane>
      )}
    </AnimatePresence>
    </div>
  )
}
