'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, ImagePlus, LockKeyhole, X } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { createPost, fetchMyPosts, fetchPost, updatePost } from '@/features/community/api/community-api'
import { uploadPhotoFiles, type SuccessfulPhotoUpload } from '@/features/photos/api/photo-api'
import {
  isSupportedMetadataSafeImage,
  METADATA_SAFE_IMAGE_ACCEPT,
} from '@/features/photos/lib/sanitize-image-file'
import { useCommunityAction, useCommunityQuery } from '@/features/community/hooks/use-community-request'
import { communityErrorMessage } from '@/features/community/lib/community-model'
import { publishDiagnosticEvent } from '@/features/devtools/lib/dev-diagnostics'
import { POST_CONTENT_LIMIT, POST_TITLE_LIMIT, usePostDraftStore } from '@/features/community/stores/post-draft-store'
import type { Post } from '@/features/community/types/community'
import { CommunityFeedback, CommunityPhoto, communityTextAreaClass, QueryFeedback } from './community-shared'
import { CommunityNoticeProvider, useCommunityNotice } from './community-notice-provider'

const MAX_POST_PHOTO_BYTES = 250 * 1024 * 1024

type NewSelectedPhoto = {
  kind: 'new'
  file: File
  previewUrl: string
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error'
  uploadedPhoto: SuccessfulPhotoUpload | null
}

type ExistingSelectedPhoto = {
  kind: 'existing'
  photoId: string
  photoKey: string | null
  downloadUrl: string | null
}

type SelectedPhoto = ExistingSelectedPhoto | NewSelectedPhoto

const isNewPhoto = (photo: SelectedPhoto): photo is NewSelectedPhoto => photo.kind === 'new'

export default function PostEditor({ editPostId, returnToPrevious = false }: { editPostId?: string; returnToPrevious?: boolean }) {
  const epoch = useAuthStore(state => state.sessionEpoch)
  return <CommunityNoticeProvider key={`${epoch}:${editPostId ?? 'new'}`}>
    {editPostId ? <EditPostLoader postId={editPostId} returnToPrevious={returnToPrevious} /> : <Editor />}
  </CommunityNoticeProvider>
}

function EditPostLoader({ postId, returnToPrevious }: { postId: string; returnToPrevious: boolean }) {
  const router = useRouter()
  const request = useCallback(async (signal: AbortSignal) => {
    const [post, myPosts] = await Promise.all([
      fetchPost(postId, signal),
      fetchMyPosts(signal),
    ])
    return { post, owned: myPosts.some(ownedPost => ownedPost.id === post.id) }
  }, [postId])
  const query = useCommunityQuery(request)
  const returnToPost = () => {
    if (returnToPrevious) router.back()
    else router.replace(`/community?post=${encodeURIComponent(postId)}&tab=free`)
  }

  if (query.data?.owned) return <Editor initialPost={query.data.post} returnToPrevious={returnToPrevious} />
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
    <TopBar title="게시글 수정" showBack onBack={returnToPost} />
    <div className="flex-1 overflow-y-auto p-4">
      {query.data && !query.data.owned ? (
        <div className="space-y-3 rounded-card border border-border bg-card-surface p-4" role="alert">
          <p className="text-[14px] font-semibold text-deep-brown">본인이 작성한 게시글만 수정할 수 있어요.</p>
          <p className="text-[12px] leading-relaxed text-warm-gray">게시글 상세 화면으로 돌아가 내용을 확인해 주세요.</p>
          <Button variant="outline" size="sm" onClick={returnToPost}>게시글 상세로 돌아가기</Button>
        </div>
      ) : (
        <QueryFeedback loading={query.loading} error={query.error} onRetry={query.reload} />
      )}
    </div>
  </div>
}

function postPublishErrorMessage(error: unknown) {
  const failure = error as {
    cause?: unknown
    name?: unknown
    uploadedPhotoCount?: unknown
    stage?: unknown
    reason?: unknown
  }
  if (failure?.name === 'PostPublishError' && failure.stage === 'post-create') {
    return `사진 업로드는 완료됐지만 게시글 등록에 실패했어요. 초안과 선택한 사진은 유지했어요. ${communityErrorMessage(failure.cause)}`
  }
  if (failure?.name !== 'PhotoUploadError') return communityErrorMessage(error)
  if (failure.stage === 'metadata-sanitization') {
    return '사진의 위치·촬영 정보 등 개인정보를 안전하게 제거하지 못했어요. 다른 사진을 선택해 주세요.'
  }
  if (failure.stage === 'upload-ticket') {
    if (failure.reason === 'contract') {
      return '사진 업로드 준비 응답을 확인하지 못했어요. 개발 진단 화면에서 응답 계약 기록을 확인해 주세요.'
    }
    return '사진 업로드 준비 요청에 실패했어요. 잠시 후 다시 시도해 주세요.'
  }
  if (failure.reason === 'timeout') {
    return '사진 업로드 응답이 늦어 중단했어요. 네트워크 상태를 확인해 주세요.'
  }
  if (failure.reason === 'connection-or-cors') {
    return '사진 저장소 연결이 차단됐어요. 개발 진단 화면에서 CORS 후보 기록을 확인해 주세요.'
  }
  return '사진 업로드를 완료하지 못했어요. 개발 진단 화면에서 저장소 응답 상태를 확인해 주세요.'
}

class PostPublishError extends Error {
  override readonly name = 'PostPublishError'
  readonly stage = 'post-create'

  constructor(readonly uploadedPhotoCount: number, options: ErrorOptions) {
    super('Post creation failed after photo upload.', options)
  }
}

function recordPostCreateFailure(error: unknown, uploadedPhotoCount: number) {
  const failure = error && typeof error === 'object'
    ? error as { status?: unknown; type?: unknown }
    : {}
  const details = {
    phase: 'error',
    stage: 'post-create',
    uploadedPhotoCount,
    photoUploadCompleted: uploadedPhotoCount > 0,
    status:
      typeof failure.status === 'number' && Number.isInteger(failure.status)
        ? failure.status
        : undefined,
    type:
      typeof failure.type === 'string' &&
      ['network', 'timeout', 'validation', 'unauthorized', 'forbidden', 'not-found', 'server', 'unknown'].includes(failure.type)
        ? failure.type
        : 'unknown',
  }
  publishDiagnosticEvent({
    kind: 'network',
    summary: 'POST_PUBLISH post creation failed',
    details,
  })
  if (process.env.NODE_ENV !== 'production') {
    console.error('[post-publish] request failed', details)
  }
}

function isUncertainMutationFailure(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const type = (error as { type?: unknown }).type
  return type === 'network' || type === 'timeout'
}

function postMatchesUpdate(post: Post, title: string, content: string, photos?: Array<{ photoKey: string }>) {
  if (post.title !== title || post.content !== content) return false
  if (!photos) return true
  return post.photos.length === photos.length && post.photos.every((photo, index) =>
    photo.photoKey === photos[index]?.photoKey
  )
}

function ReadOnlyPostPhotos({ post, preview = false }: { post: Post; preview?: boolean }) {
  const photos = post.photos.length > 0
    ? [
        ...post.photos.filter(photo => photo.photoId === post.photoId),
        ...post.photos.filter(photo => photo.photoId !== post.photoId),
      ]
    : post.photoId
      ? [{ photoId: post.photoId, photoKey: null, downloadUrl: post.photoUrl }]
      : []

  if (photos.length === 0) {
    return <p className="mt-3 text-[12px] text-warm-gray">등록된 사진이 없어요.</p>
  }

  return <div
    className={preview
      ? 'mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-xl no-scrollbar'
      : 'mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar'}
    aria-label={`기존 사진 ${photos.length}장`}
  >
    {photos.map((photo, index) => <CommunityPhoto
      key={photo.photoId}
      url={photo.downloadUrl ?? (photo.photoId === post.photoId ? post.photoUrl : null)}
      title={`기존 사진 ${index + 1}`}
      className={preview
        ? 'h-52 w-full flex-shrink-0 snap-center rounded-xl'
        : 'h-20 w-20 flex-shrink-0 rounded-xl border border-border'}
      imageClassName="object-cover"
    />)}
  </div>
}

function Editor({ initialPost, returnToPrevious = false }: { initialPost?: Post; returnToPrevious?: boolean }) {
  const router = useRouter()
  const editing = Boolean(initialPost)
  const authenticated = useAuthStore(state => state.status === 'authenticated')
  const createDraft = usePostDraftStore()
  const [editTitle, setEditTitle] = useState(initialPost?.title ?? '')
  const [editContent, setEditContent] = useState(initialPost?.content ?? '')
  const title = editing ? editTitle : createDraft.title
  const content = editing ? editContent : createDraft.content
  const updateDraft = (draft: { title?: string; content?: string }) => {
    if (editing) {
      if (draft.title !== undefined) setEditTitle(draft.title)
      if (draft.content !== undefined) setEditContent(draft.content)
      return
    }
    createDraft.update(draft)
  }
  const [preview, setPreview] = useState(false)
  const [selectedPhotos, setSelectedPhotos] = useState<SelectedPhoto[]>(() =>
    initialPost?.photos.map(photo => ({ kind: 'existing', ...photo })) ?? []
  )
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [publishStage, setPublishStage] = useState<string | null>(null)
  const action = useCommunityAction()
  const showNotice = useCommunityNotice()
  const saveDraft = () => showNotice('작성 중인 글을 이 탭에 임시 저장했어요. 아직 게시되지 않았어요.', document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const previewRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const pendingRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const selectedPhotosRef = useRef(selectedPhotos)
  const photoEditingAvailable = !initialPost || (
    (!initialPost.photoId || initialPost.photos.length > 0) &&
    initialPost.photos.every(photo => Boolean(photo.photoKey))
  )
  const photosChanged = Boolean(initialPost) && (
    selectedPhotos.length !== initialPost?.photos.length ||
    selectedPhotos.some((photo, index) =>
      photo.kind === 'new' || photo.photoId !== initialPost?.photos[index]?.photoId
    )
  )
  const hasDraft = Boolean(title || content || selectedPhotos.length)
  const hasChanges = editing
    ? title !== initialPost?.title || content !== initialPost?.content || photosChanged
    : hasDraft
  const valid = Boolean(title.trim() && title.length <= POST_TITLE_LIMIT && content.trim() && content.length <= POST_CONTENT_LIMIT)
  const newPhotos = selectedPhotos.filter(isNewPhoto)
  const uploadedPhotoCount = newPhotos.filter(({ uploadStatus }) => uploadStatus === 'success').length
  const totalPhotoBytes = newPhotos.reduce((total, { file }) => total + file.size, 0)
  const returnFromEdit = () => {
    if (!initialPost) return
    if (returnToPrevious) router.back()
    else router.replace(`/community?post=${encodeURIComponent(initialPost.id)}&tab=free`)
  }

  async function preparePhotoInputs(signal: AbortSignal, isCurrent: () => boolean) {
    const uploadsByIndex = new Map<number, SuccessfulPhotoUpload>()
    selectedPhotos.forEach((photo, index) => {
      if (photo.kind === 'new' && photo.uploadedPhoto) uploadsByIndex.set(index, photo.uploadedPhoto)
    })
    const pendingPhotos = selectedPhotos
      .map((photo, originalIndex) => ({ photo, originalIndex }))
      .filter((entry): entry is { photo: NewSelectedPhoto; originalIndex: number } =>
        entry.photo.kind === 'new' && entry.photo.uploadedPhoto === null
      )

    try {
      const uploadedTickets = pendingPhotos.length > 0
        ? await uploadPhotoFiles(
            pendingPhotos.map(({ photo }) => photo.file),
            'POST',
            signal,
            ({ photoIndex, status }) => {
              if (!isCurrent()) return
              const originalIndex = pendingPhotos[photoIndex]?.originalIndex
              if (originalIndex === undefined) return
              setSelectedPhotos(current => current.map((photo, index) =>
                index === originalIndex && photo.kind === 'new'
                  ? { ...photo, uploadStatus: status }
                  : photo
              ))
            }
          )
        : []
      uploadedTickets.forEach((ticket, index) => {
        uploadsByIndex.set(pendingPhotos[index].originalIndex, {
          photoKey: ticket.photoKey,
          fileName: ticket.fileName,
        })
      })
      if (uploadedTickets.length > 0 && isCurrent()) {
        setSelectedPhotos(current => current.map((photo, index) => {
          const uploadedPhoto = uploadsByIndex.get(index)
          return photo.kind === 'new' && uploadedPhoto
            ? { ...photo, uploadStatus: 'success', uploadedPhoto }
            : photo
        }))
      }
    } catch (error) {
      const uploadFailure = error && typeof error === 'object'
        ? error as { failedPhotoIndexes?: unknown; successfulUploads?: unknown }
        : {}
      const successfulUploads = Array.isArray(uploadFailure.successfulUploads)
        ? uploadFailure.successfulUploads as Array<SuccessfulPhotoUpload | null>
        : []
      const failedPhotoIndexes = Array.isArray(uploadFailure.failedPhotoIndexes)
        ? new Set(uploadFailure.failedPhotoIndexes.filter(index => typeof index === 'number'))
        : new Set(pendingPhotos.map((_, index) => index))
      if (isCurrent()) {
        setSelectedPhotos(current => current.map((photo, originalIndex) => {
          if (photo.kind !== 'new') return photo
          const localIndex = pendingPhotos.findIndex(entry => entry.originalIndex === originalIndex)
          if (localIndex < 0) return photo
          const successfulUpload = successfulUploads[localIndex]
          if (successfulUpload) {
            return { ...photo, uploadStatus: 'success', uploadedPhoto: successfulUpload }
          }
          return failedPhotoIndexes.has(localIndex)
            ? { ...photo, uploadStatus: 'error' }
            : photo
        }))
      }
      throw error
    }

    return selectedPhotos.map((photo, index) => {
      const photoKey = photo.kind === 'existing' ? photo.photoKey : uploadsByIndex.get(index)?.photoKey
      if (!photoKey) throw new Error('Photo upload state was incomplete.')
      return { photoKey }
    })
  }

  function releasePreviewUrls() {
    selectedPhotosRef.current.filter(isNewPhoto).forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
  }

  function publish() {
    if (!valid || !authenticated || action.busy) return
    if (editing && initialPost) {
      void action.run(
        async ({ signal, isCurrent }) => {
          try {
            setPublishStage(photosChanged && newPhotos.length > 0 ? '사진 업로드' : '게시글을 수정하고 있어요…')
            const photos = photosChanged ? await preparePhotoInputs(signal, isCurrent) : undefined
            if (isCurrent()) setPublishStage('게시글을 수정하고 있어요…')
            const nextTitle = title.trim()
            const nextContent = content.trim()
            try {
              return await updatePost(initialPost.id, {
                title: nextTitle,
                content: nextContent,
                ...(photosChanged ? { photos } : {}),
              }, signal)
            } catch (error) {
              if (isUncertainMutationFailure(error)) {
                try {
                  const refreshed = await fetchPost(initialPost.id, signal)
                  if (postMatchesUpdate(refreshed, nextTitle, nextContent, photos)) return refreshed
                } catch {
                  // Preserve the original mutation failure when verification is unavailable.
                }
              }
              throw error
            }
          } catch (error) {
            if (isCurrent()) setPublishStage(null)
            throw error
          }
        },
        () => {
          releasePreviewUrls()
          selectedPhotosRef.current = []
          setPublishStage(null)
          returnFromEdit()
        },
        undefined,
        postPublishErrorMessage,
      )
      return
    }
    void action.run(
      async ({ signal, isCurrent }) => {
        try {
          setPublishStage(newPhotos.length > 0 ? '사진 업로드' : '게시글을 등록하고 있어요…')
          const uploads = newPhotos.length > 0 ? await preparePhotoInputs(signal, isCurrent) : []
          if (isCurrent()) setPublishStage('게시글을 등록하고 있어요…')
          try {
            await createPost({
              title: title.trim(),
              content: content.trim(),
              ...(uploads.length > 0 ? { photos: uploads } : {}),
            }, signal)
          } catch (error) {
            recordPostCreateFailure(error, uploads.length)
            if (uploads.length > 0) throw new PostPublishError(uploads.length, { cause: error })
            throw error
          }
        } catch (error) {
          if (isCurrent()) setPublishStage(null)
          throw error
        }
      },
      () => {
        releasePreviewUrls()
        selectedPhotosRef.current = []
        setSelectedPhotos([])
        setPublishStage(null)
        createDraft.clear()
        router.replace('/community?tab=free')
      },
      undefined,
      postPublishErrorMessage,
    )
  }

  const selectPhotos = (files: FileList | null) => {
    if (!files) return
    const candidates = Array.from(files)
    const images = candidates.filter(isSupportedMetadataSafeImage)
    if (images.length !== candidates.length) {
      setPhotoError('이미지 파일만 첨부할 수 있어요.')
      return
    }
    const nextTotalBytes = totalPhotoBytes + images.reduce((total, file) => total + file.size, 0)
    if (images.some((file) => file.size > MAX_POST_PHOTO_BYTES) || nextTotalBytes > MAX_POST_PHOTO_BYTES) {
      setPhotoError('사진은 한 장과 전체 첨부 합계 모두 250MB 이하여야 해요.')
      return
    }
    const available = 10 - selectedPhotos.length
    if (images.length > available) {
      setPhotoError('사진은 최대 10장까지 첨부할 수 있어요.')
      return
    }
    setPhotoError(null)
    setSelectedPhotos((current) => [
      ...current,
      ...images.map((file) => ({
        kind: 'new' as const,
        file,
        previewUrl: URL.createObjectURL(file),
        uploadStatus: 'idle' as const,
        uploadedPhoto: null,
      })),
    ])
  }

  const removePhoto = (index: number) => {
    setSelectedPhotos((current) => {
      const target = current[index]
      if (target?.kind === 'new') URL.revokeObjectURL(target.previewUrl)
      return current.filter((_, photoIndex) => photoIndex !== index)
    })
    setPhotoError(null)
  }

  const movePhoto = (index: number, direction: -1 | 1) => {
    setSelectedPhotos(current => {
      const destination = index + direction
      if (destination < 0 || destination >= current.length) return current
      const next = [...current]
      const [photo] = next.splice(index, 1)
      next.splice(destination, 0, photo)
      return next
    })
    setPhotoError(null)
  }

  useEffect(() => {
    selectedPhotosRef.current = selectedPhotos
  }, [selectedPhotos])

  useEffect(() => () => {
    selectedPhotosRef.current.filter(isNewPhoto).forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl))
  }, [])

  useEffect(() => {
    if (!hasChanges) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [hasChanges])

  useEffect(() => {
    if (preview) previewRef.current?.focus()
    else titleRef.current?.focus()
  }, [preview])

  useEffect(() => {
    if (action.busy) pendingRef.current?.focus()
  }, [action.busy])

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
    {action.busy && <div ref={pendingRef} tabIndex={-1} className="fixed inset-0 z-[60] flex cursor-wait items-center justify-center bg-black/10 px-4 outline-none" role="status" aria-live="polite">
      <p className="rounded-full bg-card-surface px-4 py-2 text-[13px] font-medium text-deep-brown shadow-md">{newPhotos.length > 0 && publishStage?.includes('업로드') ? `${publishStage}: ${uploadedPhotoCount}/${newPhotos.length}장 완료` : publishStage ?? '게시글을 등록하고 있어요…'}</p>
    </div>}
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" inert={action.busy ? true : undefined}>
      <TopBar title={preview ? (editing ? '수정 미리보기' : '글 미리보기') : (editing ? '게시글 수정' : '자유게시판 글쓰기')} showBack backDisabled={action.busy} onBack={() => {
      if (action.busy) return
      if (preview) setPreview(false)
      else if (editing && initialPost) returnFromEdit()
      else router.replace('/community?tab=free')
    }} rightAction={
      <Button size="sm" variant="ghost" className="text-sage-green" disabled={!valid || action.busy} onClick={() => setPreview(!preview)}>{preview ? '편집' : '미리보기'}</Button>
    } />
    <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-28 pt-4">
      {preview ? <div ref={previewRef} tabIndex={-1} aria-label="게시글 미리보기" className="space-y-4 rounded-card border border-border bg-card-surface p-4 outline-none">
        <span className="rounded-full bg-sage-green-light px-2 py-1 text-[11px] font-semibold text-sage-green">자유게시판 · 미리보기</span>
        <h1 className="break-words text-[20px] font-bold leading-snug text-deep-brown">{title.trim()}</h1>
        {selectedPhotos.length > 0 ? (
          <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-xl no-scrollbar" aria-label={`첨부 사진 ${selectedPhotos.length}장`}>
            {selectedPhotos.map((photo, index) => (
              <div key={photo.kind === 'existing' ? photo.photoId : `${photo.file.name}-${photo.file.lastModified}-${index}`} className="relative h-52 w-full flex-shrink-0 snap-center overflow-hidden rounded-xl bg-sage-green-light">
                {photo.kind === 'existing' ? (
                  <CommunityPhoto url={photo.downloadUrl} title={`첨부 사진 ${index + 1}`} className="h-full" />
                ) : (
                  <Image src={photo.previewUrl} alt={`첨부 사진 ${index + 1}`} fill unoptimized className="object-cover" />
                )}
                {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-sage-green px-2 py-1 text-[10px] font-semibold text-white">대표 사진</span>}
              </div>
            ))}
          </div>
        ) : (
          <CommunityPhoto url={null} title="사진 없는 게시글" className="h-52 rounded-xl" />
        )}
        <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-deep-brown">{content.trim()}</p>
        <p className="text-[12px] text-warm-gray">{editing ? '수정 내용을 저장하기 전 미리보기예요.' : '아직 게시되지 않은 글이에요.'}</p>
      </div> : <form id="post-draft-form" className="space-y-5" onSubmit={event => {
        event.preventDefault()
        publish()
      }}>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5"><label htmlFor="post-title" className="text-[13px] font-semibold text-deep-brown">제목</label><span aria-hidden="true" className="text-[11px] font-medium text-soft-orange">필수</span></div>
          <Input ref={titleRef} id="post-title" value={title} maxLength={POST_TITLE_LIMIT} required disabled={action.busy} placeholder="어떤 이야기를 나누고 싶으세요?" onChange={event => updateDraft({ title: event.target.value })} aria-describedby="post-title-count" />
          <p id="post-title-count" className="text-right text-[11px] text-warm-gray">{title.length} / {POST_TITLE_LIMIT}</p>
          {title.length > POST_TITLE_LIMIT && <p role="alert">기존 제목을 {POST_TITLE_LIMIT}자 이내로 줄여 주세요. 작성 내용은 유지돼요.</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5"><label htmlFor="post-content" className="text-[13px] font-semibold text-deep-brown">내용</label><span aria-hidden="true" className="text-[11px] font-medium text-soft-orange">필수</span></div>
          <textarea id="post-content" value={content} maxLength={POST_CONTENT_LIMIT} required disabled={action.busy} placeholder="반려동물과의 일상이나 궁금한 이야기를 자유롭게 적어 주세요." onChange={event => updateDraft({ content: event.target.value })} aria-describedby="post-content-count" className={`${communityTextAreaClass} min-h-64`} />
          <p id="post-content-count" className="text-right text-[11px] text-warm-gray">{content.length.toLocaleString()} / {POST_CONTENT_LIMIT.toLocaleString()}</p>
          {content.length > POST_CONTENT_LIMIT && <p role="alert">기존 내용을 임시 제한인 {POST_CONTENT_LIMIT}자 이내로 줄여 주세요. 작성 내용은 유지돼요.</p>}
        </div>
        <div className="rounded-card border border-dashed border-border bg-card-surface p-4" aria-label={editing ? '게시글 사진 편집' : '게시글 사진 첨부'}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[13px] font-medium text-deep-brown"><ImagePlus className="h-4 w-4 text-sage-green" />{editing ? '사진 수정' : '사진 첨부'}</p>
              <p className="mt-1 text-[11px] text-warm-gray">{selectedPhotos.length} / 10장</p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={!photoEditingAvailable || selectedPhotos.length >= 10 || action.busy} onClick={() => photoInputRef.current?.click()}>사진 선택</Button>
            <input
              ref={photoInputRef}
              type="file"
              accept={METADATA_SAFE_IMAGE_ACCEPT}
              multiple
              className="sr-only"
              aria-label="게시글 사진 선택"
              disabled={!photoEditingAvailable || action.busy}
              onChange={(event) => {
                selectPhotos(event.target.files)
                event.target.value = ''
              }}
            />
          </div>
          {!photoEditingAvailable && initialPost ? (
            <div className="mt-3 rounded-xl bg-muted p-3">
              <p className="flex items-center gap-1.5 text-[12px] font-medium text-deep-brown"><LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />기존 사진 정보를 확인할 수 없어 사진 수정이 잠겨 있어요.</p>
              <ReadOnlyPostPhotos post={initialPost} />
              <p className="mt-2 text-[11px] leading-relaxed text-warm-gray">사진을 잃지 않도록 제목과 내용만 저장할 수 있어요.</p>
            </div>
          ) : selectedPhotos.length > 0 ? (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar" aria-label={`편집 중인 사진 ${selectedPhotos.length}장`}>
              {selectedPhotos.map((photo, index) => {
                const label = photo.kind === 'existing' ? `기존 사진 ${index + 1}` : photo.file.name
                return <div key={photo.kind === 'existing' ? photo.photoId : `${photo.file.name}-${photo.file.lastModified}-${index}`} className="w-24 flex-shrink-0">
                  <div className="relative h-20 w-24 overflow-hidden rounded-xl border border-border">
                    {photo.kind === 'existing' ? (
                      <CommunityPhoto url={photo.downloadUrl} title={label} className="h-full" />
                    ) : (
                      <Image src={photo.previewUrl} alt={`선택한 사진 ${index + 1}`} fill unoptimized className="object-cover" />
                    )}
                    {index === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-sage-green px-1.5 py-0.5 text-[9px] font-semibold text-white">대표</span>}
                    {photo.kind === 'new' && photo.uploadStatus !== 'idle' && (
                      <span className="absolute bottom-1 right-1 rounded-full bg-black/65 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                        {photo.uploadStatus === 'uploading' ? '업로드 중' : photo.uploadStatus === 'success' ? '완료' : '실패'}
                      </span>
                    )}
                    <button type="button" aria-label={`${label} 삭제`} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white" onClick={() => removePhoto(index)}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-1 flex justify-center gap-1">
                    <button type="button" aria-label={`${label} 왼쪽으로 이동`} disabled={index === 0} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-warm-gray disabled:opacity-30" onClick={() => movePhoto(index, -1)}><ChevronLeft className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label={`${label} 오른쪽으로 이동`} disabled={index === selectedPhotos.length - 1} className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-warm-gray disabled:opacity-30" onClick={() => movePhoto(index, 1)}><ChevronRight className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-xl bg-sage-green-light p-3 text-center text-[12px] text-warm-gray">첨부된 사진이 없어요.</p>
          )}
          {photoError && <p className="mt-2 text-[12px] text-danger" role="alert">{photoError}</p>}
          {!action.busy && selectedPhotos.some(photo => photo.kind === 'new' && photo.uploadStatus === 'error') && (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={publish}>
              사진 업로드 다시 시도
            </Button>
          )}
          <p className="mt-2 text-[11px] text-warm-gray">{(totalPhotoBytes / 1024 / 1024).toFixed(1)}MB / 250MB</p>
          <p className="mt-2 text-[12px] leading-relaxed text-warm-gray">첫 번째 사진이 목록의 대표 사진으로 표시돼요.</p>
        </div>
      </form>}
      <div className="mt-5 space-y-3 rounded-card bg-sage-green-light p-4">
        <CommunityFeedback error={action.error} />
        <p id="post-publishing-notice" className="text-[13px] leading-relaxed text-deep-brown">{editing ? '제목, 내용과 사진을 함께 수정할 수 있어요.' : authenticated ? '제목과 내용을 입력하면 자유게시판에 바로 등록할 수 있어요.' : '체험 화면에서는 글을 미리 작성할 수 있지만, 등록하려면 로그인해야 해요.'}</p>
        <p className="text-[12px] leading-relaxed text-warm-gray">{editing ? '저장하면 게시글 상세 화면으로 돌아가 수정 결과를 확인할 수 있어요.' : '작성 내용은 이 탭에서 화면을 이동해도 유지돼요. 새로고침하거나 로그아웃하면 사라져요.'}</p>
        <div className="flex gap-2">
          {editing && initialPost ? (
            <Button type="button" variant="outline" className="flex-1" disabled={action.busy} onClick={returnFromEdit}>수정 취소</Button>
          ) : (
            <Button type="button" variant="outline" className="flex-1" disabled={!hasDraft || action.busy} onClick={saveDraft}>임시 저장</Button>
          )}
          <Button type="button" className="flex-1" disabled={!valid || !authenticated || action.busy || (editing && !hasChanges)} aria-describedby="post-publishing-notice" onClick={publish}>{action.busy ? (editing ? '수정 중…' : '등록 중…') : editing ? '수정 저장' : authenticated ? '게시글 등록' : '로그인 후 등록'}</Button>
        </div>
      </div>
    </div>
    </div>
  </div>
}
