'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { createPost } from '@/features/community/api/community-api'
import { useCommunityAction } from '@/features/community/hooks/use-community-request'
import { POST_CONTENT_LIMIT, POST_TITLE_LIMIT, usePostDraftStore } from '@/features/community/stores/post-draft-store'
import { CommunityPhoto, communityTextAreaClass } from './community-shared'
import { CommunityNoticeProvider, useCommunityNotice } from './community-notice-provider'

export default function PostEditor() {
  const epoch = useAuthStore(state => state.sessionEpoch)
  return <CommunityNoticeProvider key={epoch}><Editor /></CommunityNoticeProvider>
}

function Editor() {
  const router = useRouter()
  const authenticated = useAuthStore(state => state.status === 'authenticated')
  const { title, content, update, clear } = usePostDraftStore()
  const [preview, setPreview] = useState(false)
  const action = useCommunityAction()
  const showNotice = useCommunityNotice()
  const saveDraft = () => showNotice('작성 중인 글을 이 탭에 임시 저장했어요. 아직 게시되지 않았어요.', document.activeElement instanceof HTMLElement ? document.activeElement : null)
  const previewRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const pendingRef = useRef<HTMLDivElement>(null)
  const hasDraft = Boolean(title || content)
  const valid = Boolean(title.trim() && title.length <= POST_TITLE_LIMIT && content.trim() && content.length <= POST_CONTENT_LIMIT)

  function publish() {
    if (!valid || !authenticated || action.busy) return
    void action.run(
      ({ signal }) => createPost({ title: title.trim(), content: content.trim() }, signal),
      () => {
        clear()
        router.replace('/community?tab=free')
      },
    )
  }

  useEffect(() => {
    if (!hasDraft) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [hasDraft])

  useEffect(() => {
    if (preview) previewRef.current?.focus()
    else titleRef.current?.focus()
  }, [preview])

  useEffect(() => {
    if (action.busy) pendingRef.current?.focus()
  }, [action.busy])

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
    {action.busy && <div ref={pendingRef} tabIndex={-1} className="fixed inset-0 z-[60] flex cursor-wait items-center justify-center bg-black/10 px-4 outline-none" role="status" aria-live="polite">
      <p className="rounded-full bg-card-surface px-4 py-2 text-[13px] font-medium text-deep-brown shadow-md">게시글을 등록하고 있어요…</p>
    </div>}
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden" inert={action.busy ? true : undefined}>
      <TopBar title={preview ? '글 미리보기' : '자유게시판 글쓰기'} showBack backDisabled={action.busy} onBack={() => {
      if (action.busy) return
      if (preview) setPreview(false)
      else router.replace('/community?tab=free')
    }} rightAction={
      <Button size="sm" variant="ghost" className="text-sage-green" disabled={!valid || action.busy} onClick={() => setPreview(!preview)}>{preview ? '편집' : '미리보기'}</Button>
    } />
    <div className="no-scrollbar flex-1 overflow-y-auto px-4 pb-28 pt-4">
      {preview ? <div ref={previewRef} tabIndex={-1} aria-label="게시글 미리보기" className="space-y-4 rounded-card border border-border bg-card-surface p-4 outline-none">
        <span className="rounded-full bg-sage-green-light px-2 py-1 text-[11px] font-semibold text-sage-green">자유게시판 · 미리보기</span>
        <h1 className="break-words text-[20px] font-bold leading-snug text-deep-brown">{title.trim()}</h1>
        <CommunityPhoto url={null} title="임시 게시글 사진" className="h-52 rounded-xl" temporaryFallback />
        <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-deep-brown">{content.trim()}</p>
        <p className="text-[12px] text-warm-gray">아직 게시되지 않은 글이에요.</p>
      </div> : <form id="post-draft-form" className="space-y-5" onSubmit={event => {
        event.preventDefault()
        publish()
      }}>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5"><label htmlFor="post-title" className="text-[13px] font-semibold text-deep-brown">제목</label><span aria-hidden="true" className="text-[11px] font-medium text-soft-orange">필수</span></div>
          <Input ref={titleRef} id="post-title" value={title} maxLength={POST_TITLE_LIMIT} required disabled={action.busy} placeholder="어떤 이야기를 나누고 싶으세요?" onChange={event => update({ title: event.target.value })} aria-describedby="post-title-count" />
          <p id="post-title-count" className="text-right text-[11px] text-warm-gray">{title.length} / {POST_TITLE_LIMIT}</p>
          {title.length > POST_TITLE_LIMIT && <p role="alert">기존 제목을 {POST_TITLE_LIMIT}자 이내로 줄여 주세요. 작성 내용은 유지돼요.</p>}
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-1.5"><label htmlFor="post-content" className="text-[13px] font-semibold text-deep-brown">내용</label><span aria-hidden="true" className="text-[11px] font-medium text-soft-orange">필수</span></div>
          <textarea id="post-content" value={content} maxLength={POST_CONTENT_LIMIT} required disabled={action.busy} placeholder="반려동물과의 일상이나 궁금한 이야기를 자유롭게 적어 주세요." onChange={event => update({ content: event.target.value })} aria-describedby="post-content-count" className={`${communityTextAreaClass} min-h-64`} />
          <p id="post-content-count" className="text-right text-[11px] text-warm-gray">{content.length.toLocaleString()} / {POST_CONTENT_LIMIT.toLocaleString()}</p>
          {content.length > POST_CONTENT_LIMIT && <p role="alert">기존 내용을 임시 제한인 {POST_CONTENT_LIMIT}자 이내로 줄여 주세요. 작성 내용은 유지돼요.</p>}
        </div>
        <div className="rounded-card border border-dashed border-border bg-card-surface p-4">
          <p className="flex items-center gap-2 text-[13px] font-medium text-warm-gray"><ImagePlus className="h-4 w-4" />사진 첨부 준비 중</p>
          <p className="mt-2 text-[12px] leading-relaxed text-warm-gray">사진 첨부가 열리기 전까지 미리보기에는 임시 사진이 표시돼요.</p>
        </div>
      </form>}
      <div className="mt-5 space-y-3 rounded-card bg-sage-green-light p-4">
        <p id="post-publishing-notice" className="text-[13px] leading-relaxed text-deep-brown">{authenticated ? '제목과 내용을 입력하면 자유게시판에 바로 등록할 수 있어요.' : '체험 화면에서는 글을 미리 작성할 수 있지만, 등록하려면 로그인해야 해요.'}</p>
        <p className="text-[12px] leading-relaxed text-warm-gray">작성 내용은 이 탭에서 화면을 이동해도 유지돼요. 새로고침하거나 로그아웃하면 사라져요.</p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" disabled={!hasDraft || action.busy} onClick={saveDraft}>임시 저장</Button>
          <Button type="button" className="flex-1" disabled={!valid || !authenticated || action.busy} aria-describedby="post-publishing-notice" onClick={publish}>{action.busy ? '등록 중…' : authenticated ? '게시글 등록' : '로그인 후 등록'}</Button>
        </div>
      </div>
    </div>
    </div>
  </div>
}
