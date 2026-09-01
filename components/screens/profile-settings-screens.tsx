'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import { Bookmark, Heart, Star } from 'lucide-react'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { Input } from '@/components/ui/input'
import {
  fetchBookmarks,
  fetchMyPosts,
  fetchMyReviews,
  fetchWishlist,
  getProfileErrorMessage,
  removeBookmark,
  removeWishlistPlace,
} from '@/features/profile/api/profile-api'
import type {
  ProfileLoadStatus,
  ProfilePost,
  ProfileReview,
  WishlistPlace,
} from '@/features/profile/types/profile'

export type SettingsTab = 'nickname' | 'posts' | 'wishlist' | 'bookmarks' | 'reviews'

interface ProfileSettingsProps {
  initialTab: SettingsTab
  currentNickname: string
  onNicknameSaved: (nickname: string) => Promise<string>
  onBack: () => void
}

const titleByTab: Record<SettingsTab, string> = {
  nickname: '닉네임 변경',
  posts: '내가 작성한 글',
  wishlist: '장소 위시리스트',
  bookmarks: '게시글 북마크',
  reviews: '내가 작성한 리뷰',
}

const PROFILE_MOTION_EASE = [0.22, 1, 0.36, 1] as const

function formatDate(value: string | null) {
  if (!value) return '날짜 정보 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '날짜 정보 없음'
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeZone: 'Asia/Seoul',
  }).format(date)
}

function LoadingState() {
  return <p className="py-12 text-center text-[13px] text-warm-gray">불러오는 중...</p>
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="px-4 py-12 text-center" role="alert">
      <p className="text-[13px] text-danger">{message}</p>
      <Button className="mt-4" variant="outline" size="sm" onClick={onRetry}>
        다시 불러오기
      </Button>
    </div>
  )
}

export default function ProfileSettings({
  initialTab,
  currentNickname,
  onNicknameSaved,
  onBack,
}: ProfileSettingsProps) {
  const prefersReducedMotion = useReducedMotion()
  const [nickname, setNickname] = useState(currentNickname)
  const [status, setStatus] = useState<ProfileLoadStatus>(
    initialTab === 'nickname' ? 'success' : 'loading'
  )
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [posts, setPosts] = useState<ProfilePost[]>([])
  const [bookmarks, setBookmarks] = useState<ProfilePost[]>([])
  const [wishlist, setWishlist] = useState<WishlistPlace[]>([])
  const [reviews, setReviews] = useState<ProfileReview[]>([])
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (initialTab === 'nickname') return
    const controller = new AbortController()

    const request =
      initialTab === 'posts'
        ? fetchMyPosts(controller.signal).then(setPosts)
        : initialTab === 'bookmarks'
          ? fetchBookmarks(controller.signal).then(setBookmarks)
          : initialTab === 'wishlist'
            ? fetchWishlist(controller.signal).then(setWishlist)
            : fetchMyReviews(controller.signal).then(setReviews)

    void request
      .then(() => {
        if (!controller.signal.aborted) setStatus('success')
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setErrorMessage(getProfileErrorMessage(error))
        setStatus('error')
      })

    return () => controller.abort()
  }, [initialTab, reloadKey])

  const retry = useCallback(() => {
    setStatus('loading')
    setErrorMessage(null)
    setReloadKey((key) => key + 1)
  }, [])

  const handleSaveNickname = async () => {
    if (!nickname.trim() || nickname.trim().length > 20) return
    setIsSaving(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const savedNickname = await onNicknameSaved(nickname)
      setNickname(savedNickname)
      setSuccessMessage('닉네임이 변경되었습니다.')
    } catch (error) {
      setErrorMessage(getProfileErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveWishlist = async (placeId: string) => {
    setRemovingId(placeId)
    setErrorMessage(null)
    try {
      await removeWishlistPlace(placeId)
      setWishlist((items) => items.filter((item) => item.placeId !== placeId))
    } catch (error) {
      setErrorMessage(getProfileErrorMessage(error))
    } finally {
      setRemovingId(null)
    }
  }

  const handleRemoveBookmark = async (postId: string) => {
    setRemovingId(postId)
    setErrorMessage(null)
    try {
      await removeBookmark(postId)
      setBookmarks((items) => items.filter((item) => item.id !== postId))
    } catch (error) {
      setErrorMessage(getProfileErrorMessage(error))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="flex flex-col flex-1 bg-warm-beige overflow-hidden">
      <TopBar title={titleByTab[initialTab]} showBack onBack={onBack} />

      <m.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: PROFILE_MOTION_EASE }}
        className="flex-1 overflow-y-auto no-scrollbar pb-24"
      >
        {initialTab === 'nickname' && (
          <div className="p-4 space-y-4">
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-deep-brown" htmlFor="profile-nickname">
                현재 닉네임
              </label>
              <Input
                id="profile-nickname"
                type="text"
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value)
                  setSuccessMessage(null)
                }}
                maxLength={20}
              />
              <p className="mt-1 text-right text-[11px] text-warm-gray">{nickname.length}/20</p>
            </div>
            <AnimatePresence initial={false} mode="popLayout">
              {errorMessage && (
                <m.p key="nickname-error" initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.2 }} className="text-[12px] text-danger" role="alert">{errorMessage}</m.p>
              )}
              {successMessage && (
                <m.p key="nickname-success" initial={prefersReducedMotion ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.2 }} className="text-[12px] text-sage-green" role="status">{successMessage}</m.p>
              )}
            </AnimatePresence>
            <Button
              onClick={handleSaveNickname}
              disabled={isSaving || !nickname.trim() || nickname.trim() === currentNickname}
              fullWidth
              size="lg"
            >
              {isSaving ? '저장 중...' : '변경하기'}
            </Button>
          </div>
        )}

        {initialTab !== 'nickname' && status === 'loading' && (
          <m.div initial={prefersReducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}><LoadingState /></m.div>
        )}
        {initialTab !== 'nickname' && status === 'error' && errorMessage && (
          <m.div initial={prefersReducedMotion ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}><ErrorState message={errorMessage} onRetry={retry} /></m.div>
        )}

        {initialTab === 'posts' && status === 'success' && (
          <div className="px-4 pt-4">
            {posts.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                {posts.map((post) => (
                  <m.article layout={!prefersReducedMotion} key={post.id} initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -18 }} transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: PROFILE_MOTION_EASE }} className="flex gap-3 rounded-card border border-border bg-card-surface p-3">
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-card">
                      <Image src="/images/place-beach.png" alt="" fill className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13px] font-semibold text-deep-brown">{post.title}</p>
                      <p className="mt-1 line-clamp-2 text-[12px] text-warm-gray">{post.content}</p>
                      <p className="mt-2 text-[11px] text-warm-gray">{formatDate(post.createdAt)}</p>
                      <div className="mt-2 flex gap-3 text-[11px] text-warm-gray">
                        <span>조회 {post.viewCount}</span>
                        <span>추천 {post.recommendationCount}</span>
                        <span>댓글 {post.commentCount}</span>
                      </div>
                    </div>
                  </m.article>
                ))}
                </AnimatePresence>
              </div>
            ) : (
              <p className="py-12 text-center text-[13px] text-warm-gray">작성한 글이 없습니다</p>
            )}
          </div>
        )}

        {initialTab === 'wishlist' && status === 'success' && (
          <div className="px-4 pt-4">
            {errorMessage && <p className="mb-3 text-[12px] text-danger" role="alert">{errorMessage}</p>}
            <div className="space-y-3">
              <AnimatePresence initial={false} mode="popLayout">
                {wishlist.length > 0 ? wishlist.map((place) => (
                  <m.div layout={!prefersReducedMotion} key={place.placeId} initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -22, height: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: PROFILE_MOTION_EASE }} className="flex items-center justify-between overflow-hidden rounded-card border border-border bg-card-surface p-3">
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-deep-brown">{place.placeName}</p>
                      <p className="mt-0.5 text-[12px] text-warm-gray">{place.address}</p>
                      <div className="mt-1 flex gap-3 text-[11px] text-warm-gray">
                        <span>⭐ {place.rating.toFixed(1)}</span>
                        <span>리뷰 {place.reviewCount}</span>
                      </div>
                    </div>
                    <IconButton
                      aria-label={`${place.placeName} 위시리스트에서 제거`}
                      disabled={removingId === place.placeId}
                      onClick={() => handleRemoveWishlist(place.placeId)}
                    >
                      <Heart className="h-5 w-5 fill-soft-orange text-soft-orange" />
                    </IconButton>
                  </m.div>
                )) : (
                  <m.p key="wishlist-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-[13px] text-warm-gray">위시리스트가 비어있습니다</m.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {initialTab === 'bookmarks' && status === 'success' && (
          <div className="px-4 pt-4">
            {errorMessage && <p className="mb-3 text-[12px] text-danger" role="alert">{errorMessage}</p>}
            <div className="space-y-3">
              <AnimatePresence initial={false} mode="popLayout">
                {bookmarks.length > 0 ? bookmarks.map((bookmark) => (
                  <m.div layout={!prefersReducedMotion} key={bookmark.id} initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -22, height: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: PROFILE_MOTION_EASE }} className="flex items-center justify-between overflow-hidden rounded-card border border-border bg-card-surface p-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-[13px] font-semibold text-deep-brown">{bookmark.title}</p>
                      <div className="mt-1 flex gap-2 text-[11px] text-warm-gray">
                        <span>{bookmark.nickname}</span>
                        <span>•</span>
                        <span>{formatDate(bookmark.createdAt)}</span>
                      </div>
                    </div>
                    <IconButton
                      aria-label={`${bookmark.title} 북마크 해제`}
                      disabled={removingId === bookmark.id}
                      onClick={() => handleRemoveBookmark(bookmark.id)}
                    >
                      <Bookmark className="h-5 w-5 fill-soft-orange text-soft-orange" />
                    </IconButton>
                  </m.div>
                )) : (
                  <m.p key="bookmarks-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12 text-center text-[13px] text-warm-gray">북마크한 글이 없습니다</m.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {initialTab === 'reviews' && status === 'success' && (
          <div className="px-4 pt-4">
            {reviews.length > 0 ? (
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                {reviews.map((review) => (
                  <m.article layout={!prefersReducedMotion} key={review.id} initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: PROFILE_MOTION_EASE }} className="rounded-card border border-border bg-card-surface p-4">
                    <div className="flex items-center gap-1 text-soft-orange" aria-label={`별점 ${review.rating}점`}>
                      <Star className="h-4 w-4 fill-current" />
                      <span className="text-[13px] font-semibold">{review.rating.toFixed(1)}</span>
                    </div>
                    <p className="mt-2 text-[13px] leading-relaxed text-deep-brown">{review.contents}</p>
                    <p className="mt-2 text-[11px] text-warm-gray">{formatDate(review.createdAt)}</p>
                  </m.article>
                ))}
                </AnimatePresence>
              </div>
            ) : (
              <p className="py-12 text-center text-[13px] text-warm-gray">작성한 리뷰가 없습니다</p>
            )}
          </div>
        )}
      </m.div>
    </div>
  )
}
