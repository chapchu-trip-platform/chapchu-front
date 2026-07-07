'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Heart, Bookmark } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { cn } from '@/lib/utils'
import { mockMyPosts, mockWishlist, mockBookmarks, mockUserProfile } from '@/data/mock'

export type SettingsTab = 'nickname' | 'info' | 'posts' | 'wishlist' | 'bookmarks'

interface ProfileSettingsProps {
  initialTab: SettingsTab
  onBack: () => void
}

export default function ProfileSettings({ initialTab, onBack }: ProfileSettingsProps) {
  const [tab, setTab] = useState<SettingsTab>(initialTab)
  const [nickname, setNickname] = useState(mockUserProfile.nickname)
  const [email, setEmail] = useState(mockUserProfile.email)
  const [bio, setBio] = useState(mockUserProfile.bio)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((r) => setTimeout(r, 600))
    setIsSaving(false)
    alert('저장되었습니다!')
  }

  return (
    <div className="flex flex-col flex-1 bg-warm-beige overflow-hidden">
      <TopBar
        title={
          tab === 'nickname'
            ? '닉네임 변경'
            : tab === 'info'
              ? '사용자 정보 수정'
              : tab === 'posts'
                ? '내가 작성한 글'
                : tab === 'wishlist'
                  ? '장소 위시리스트'
                  : '게시글 북마크'
        }
        showBack
        onBack={onBack}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* Nickname change */}
        {tab === 'nickname' && (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-[13px] font-semibold text-deep-brown mb-2 block">
                현재 닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                className="w-full h-12 px-4 rounded-card border border-border bg-card text-[14px] text-deep-brown focus:outline-none focus:ring-2 focus:ring-sage-green/50"
              />
              <p className="text-[11px] text-warm-gray mt-1 text-right">{nickname.length}/20</p>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-12 bg-sage-green text-white rounded-card font-semibold text-[14px] active:bg-sage-green/90 disabled:opacity-60"
            >
              {isSaving ? '저장 중...' : '변경하기'}
            </button>
          </div>
        )}

        {/* User info edit */}
        {tab === 'info' && (
          <div className="p-4 space-y-4">
            <div>
              <label className="text-[13px] font-semibold text-deep-brown mb-2 block">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-card border border-border bg-card text-[14px] text-deep-brown focus:outline-none focus:ring-2 focus:ring-sage-green/50"
              />
            </div>

            <div>
              <label className="text-[13px] font-semibold text-deep-brown mb-2 block">
                소개
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={100}
                rows={3}
                className="w-full p-4 rounded-card border border-border bg-card text-[14px] text-deep-brown focus:outline-none focus:ring-2 focus:ring-sage-green/50 resize-none"
              />
              <p className="text-[11px] text-warm-gray mt-1 text-right">{bio.length}/100</p>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="w-full h-12 bg-sage-green text-white rounded-card font-semibold text-[14px] active:bg-sage-green/90 disabled:opacity-60"
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        )}

        {/* My posts */}
        {tab === 'posts' && (
          <div className="px-4 pt-4">
            {mockMyPosts.length > 0 ? (
              <div className="space-y-3">
                {mockMyPosts.map((post) => (
                  <div key={post.id} className="flex gap-3 p-3 rounded-card border border-border bg-card-surface">
                    <div className="relative w-20 h-20 rounded-card overflow-hidden flex-shrink-0">
                      <Image
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-deep-brown line-clamp-1">
                        {post.title}
                      </p>
                      <p className="text-[12px] text-warm-gray mt-1 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <p className="text-[11px] text-warm-gray mt-2">{post.date}</p>
                      <div className="flex gap-3 mt-2 text-[11px] text-warm-gray">
                        <span>조회 {post.views}</span>
                        <span>좋아요 {post.likes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-[13px] text-warm-gray">작성한 글이 없습니다</p>
              </div>
            )}
          </div>
        )}

        {/* Wishlist */}
        {tab === 'wishlist' && (
          <div className="px-4 pt-4">
            {mockWishlist.length > 0 ? (
              <div className="space-y-3">
                {mockWishlist.map((place) => (
                  <div
                    key={place.id}
                    className="p-3 rounded-card border border-border bg-card-surface flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-deep-brown">{place.name}</p>
                      <p className="text-[12px] text-warm-gray mt-0.5">{place.address}</p>
                      <div className="flex gap-3 mt-1 text-[11px] text-warm-gray">
                        <span>⭐ {place.rating}</span>
                        <span>{place.distance}</span>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-muted rounded-full transition-colors">
                      <Heart className="w-5 h-5 text-soft-orange fill-soft-orange" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-[13px] text-warm-gray">위시리스트가 비어있습니다</p>
              </div>
            )}
          </div>
        )}

        {/* Bookmarks */}
        {tab === 'bookmarks' && (
          <div className="px-4 pt-4">
            {mockBookmarks.length > 0 ? (
              <div className="space-y-3">
                {mockBookmarks.map((bookmark) => (
                  <div
                    key={bookmark.id}
                    className="p-3 rounded-card border border-border bg-card-surface flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="text-[13px] font-semibold text-deep-brown">{bookmark.title}</p>
                      <div className="flex gap-3 mt-1 text-[11px] text-warm-gray">
                        <span>{bookmark.author}</span>
                        <span>•</span>
                        <span>{bookmark.date}</span>
                      </div>
                    </div>
                    <button className="p-2 hover:bg-muted rounded-full transition-colors">
                      <Bookmark className="w-5 h-5 text-soft-orange fill-soft-orange" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-[13px] text-warm-gray">북마크한 글이 없습니다</p>
              </div>
            )}
          </div>
        )}
      </div>


    </div>
  )
}
