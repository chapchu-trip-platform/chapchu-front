'use client'

import Image from 'next/image'
import { useState } from 'react'
import { PawPrint, Route } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Post } from '@/features/community/types/community'

export function CommunityPhoto({ url, title, className }: { url: string | null; title: string; className: string }) {
  return <Photo key={url} url={url} title={title} className={className} />
}

function Photo({ url, title, className }: { url: string | null; title: string; className: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`relative overflow-hidden bg-sage-green-light ${className}`}>
      {url && !failed ? (
        <Image src={url} alt={title} fill unoptimized sizes="430px" referrerPolicy="no-referrer" className="object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-sage-green">
          <PawPrint className="h-9 w-9" aria-hidden="true" />
          <span className="text-[12px]">{failed ? '사진을 불러오지 못했어요' : '함께한 여행 이야기'}</span>
        </div>
      )}
    </div>
  )
}

export function CommunityFeedback({ error, notice }: { error?: string | null; notice?: string | null }) {
  return <>
    {error && <p role="alert" className="rounded-xl bg-soft-orange/10 p-3 text-[13px] text-deep-brown">{error}</p>}
    {notice && <p role="status" className="rounded-xl bg-sage-green-light p-3 text-[13px] text-deep-brown">{notice}</p>}
  </>
}

export function QueryFeedback({ loading, error, onRetry }: { loading: boolean; error: string | null; onRetry: () => void }) {
  return <div className="text-[13px] text-warm-gray">
    {loading && <p role="status" className="py-4 text-center">불러오는 중이에요…</p>}
    {error && <div className="space-y-2"><CommunityFeedback error={error} /><Button variant="outline" size="sm" onClick={onRetry}>다시 시도</Button></div>}
  </div>
}

/** Public post responses carry IDs only; private pet/course APIs cannot fill these cards. */
export function PostCompanionInfo({ post, compact = false }: { post: Post; compact?: boolean }) {
  return <div className={compact ? 'mb-2.5 space-y-1 rounded-xl bg-muted/55 px-2.5 py-2' : 'space-y-3 border-b border-border py-4'}>
    <div className={compact ? '' : 'rounded-card border border-border bg-card-surface p-3.5'}>
      <p className="flex items-center gap-1.5 text-[11px] text-warm-gray"><PawPrint className="h-3 w-3 text-sage-green" />동행 반려동물</p>
      <p className="mt-1 text-[12px] text-deep-brown">{post.petId ? '반려동물 상세 정보 준비 중' : '등록된 동행 정보가 없어요'}</p>
    </div>
    <div className={compact ? '' : 'rounded-card border border-border bg-card-surface p-3.5'}>
      <p className="flex items-center gap-1.5 text-[11px] text-warm-gray"><Route className="h-3 w-3 text-soft-orange" />코스 정보</p>
      <p className="mt-1 text-[12px] text-deep-brown">{post.courseId ? '공유 코스 상세 정보 준비 중' : '연결된 코스가 없어요'}</p>
    </div>
  </div>
}

export const communityTextAreaClass = 'min-h-24 w-full rounded-xl border border-border bg-card-surface p-3 text-[14px] text-deep-brown outline-none focus-visible:ring-2 focus-visible:ring-sage-green/50'
