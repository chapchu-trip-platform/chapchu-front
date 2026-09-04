'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImagePlus } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/features/auth/stores/auth-store'
import { POST_CONTENT_LIMIT, POST_TITLE_LIMIT, usePostDraftStore } from '@/features/community/stores/post-draft-store'
import { CommunityFeedback, CommunityPhoto, communityTextAreaClass } from './community-shared'

export default function PostEditor() {
  const epoch = useAuthStore(state => state.sessionEpoch)
  return <Editor key={epoch} />
}

function Editor() {
  const router = useRouter()
  const { title, content, update } = usePostDraftStore()
  const [preview, setPreview] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const hasDraft = Boolean(title || content)
  const valid = Boolean(title.trim() && title.length <= POST_TITLE_LIMIT && content.trim())

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

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-warm-beige">
    <TopBar title={preview ? '글 미리보기' : '자유게시판 글쓰기'} showBack onBack={() => preview ? setPreview(false) : router.replace('/community?tab=free')} rightAction={
      <Button size="sm" variant="ghost" className="text-sage-green" disabled={!valid} onClick={() => setPreview(!preview)}>{preview ? '편집' : '미리보기'}</Button>
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
        if (hasDraft) setNotice('작성 중인 글을 이 탭에 임시 저장했어요. 아직 게시되지 않았어요.')
      }}>
        <div className="space-y-2">
          <label htmlFor="post-title" className="text-[13px] font-semibold text-deep-brown">제목</label>
          <Input ref={titleRef} id="post-title" value={title} maxLength={POST_TITLE_LIMIT} placeholder="어떤 이야기를 나누고 싶으세요?" onChange={event => { update({ title: event.target.value }); setNotice(null) }} aria-describedby="post-title-count" />
          <p id="post-title-count" className="text-right text-[11px] text-warm-gray">{title.length} / {POST_TITLE_LIMIT}</p>
          {title.length > POST_TITLE_LIMIT && <p role="alert">기존 제목을 {POST_TITLE_LIMIT}자 이내로 줄여 주세요. 작성 내용은 유지돼요.</p>}
        </div>
        <div className="space-y-2">
          <label htmlFor="post-content" className="text-[13px] font-semibold text-deep-brown">내용</label>
          <textarea id="post-content" value={content} maxLength={POST_CONTENT_LIMIT} placeholder="반려동물과의 일상이나 궁금한 이야기를 자유롭게 적어 주세요." onChange={event => { update({ content: event.target.value }); setNotice(null) }} aria-describedby="post-content-count" className={`${communityTextAreaClass} min-h-64`} />
          <p id="post-content-count" className="text-right text-[11px] text-warm-gray">{content.length.toLocaleString()} / {POST_CONTENT_LIMIT.toLocaleString()}</p>
        </div>
        <div className="rounded-card border border-dashed border-border bg-card-surface p-4">
          <p className="flex items-center gap-2 text-[13px] font-medium text-warm-gray"><ImagePlus className="h-4 w-4" />사진 첨부 준비 중</p>
          <p className="mt-2 text-[12px] leading-relaxed text-warm-gray">사진 첨부가 열리기 전까지 미리보기에는 임시 사진이 표시돼요.</p>
        </div>
      </form>}
      <div className="mt-5 space-y-3 rounded-card bg-sage-green-light p-4">
        <p id="post-publishing-notice" className="text-[13px] leading-relaxed text-deep-brown">글 등록을 준비하고 있어요. 지금은 글을 작성하고 미리 보거나 임시 저장할 수 있어요.</p>
        <p className="text-[12px] leading-relaxed text-warm-gray">작성 내용은 이 탭에서 화면을 이동해도 유지돼요. 새로고침하거나 로그아웃하면 사라져요.</p>
        <CommunityFeedback notice={notice} />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={!hasDraft} onClick={() => setNotice('작성 중인 글을 이 탭에 임시 저장했어요. 아직 게시되지 않았어요.')}>임시 저장</Button>
          {/* TODO: enable only after POST /posts permits text-only creation without pet/photo/course IDs. */}
          <Button className="flex-1" disabled aria-describedby="post-publishing-notice">등록 준비 중</Button>
        </div>
      </div>
    </div>
  </div>
}
