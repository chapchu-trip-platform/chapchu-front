'use client'

import Image from 'next/image'
import { useState } from 'react'
import {
  Star, Bookmark, Heart, AlertTriangle,
  Plus, Edit3, Trash2, Archive, Check, PawPrint, Stamp, FileText
} from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'
import { IconButton } from '@/components/ui/icon-button'
import { InteractiveCard } from '@/components/ui/interactive-card'
import { MenuRow } from '@/components/ui/menu-row'
import { ModalActions } from '@/components/ui/modal-actions'
import { cn } from '@/lib/utils'
import type { SettingsTab } from '@/components/screens/profile-settings-screens'

interface ProfileScreenProps {
  onOpenSettings?: (tab: SettingsTab) => void
  onLogout?: () => void | Promise<void>
}

type SubScreen = null | 'pets' | 'stamps' | 'memory-album'

const pets = [
  { name: '골든이', breed: '골든 리트리버', size: '대형', age: '3살', activities: ['산책', '수영', '야외놀이'], image: '/images/dog-hero.png' },
]

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

function DeletePetModal({ petName, onClose, onDelete, onMemory }: {
  petName: string; onClose: () => void; onDelete: () => void; onMemory: () => void
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card-surface rounded-t-[24px] w-full p-5 pb-10 slide-up">
        <h3 className="text-[16px] font-bold text-deep-brown mb-2">{petName} 삭제</h3>
        <p className="text-[13px] text-warm-gray mb-5 leading-relaxed">
          삭제 방법을 선택해주세요.
        </p>
        <div className="flex flex-col gap-2">
          <InteractiveCard
            onClick={onMemory}
            className="border-sage-green bg-sage-green-light hover:bg-sage-green-light/75"
          >
            <p className="text-[14px] font-semibold text-sage-green flex items-center gap-2">
              <Archive className="w-4 h-4" />
              추억으로 보관하기
            </p>
            <p className="text-[12px] text-warm-gray mt-0.5">소중한 추억을 앨범에 보관해드려요</p>
          </InteractiveCard>
          <InteractiveCard
            onClick={onDelete}
            className="border-danger/30 bg-danger/5 hover:bg-danger/10"
          >
            <p className="text-[14px] font-semibold text-danger flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              완전히 삭제하기
            </p>
            <p className="text-[12px] text-warm-gray mt-0.5">모든 데이터가 영구 삭제되며 되돌릴 수 없어요</p>
          </InteractiveCard>
          <Button onClick={onClose} variant="ghost" fullWidth>
            취소
          </Button>
        </div>
      </div>
    </div>
  )
}

function WithdrawModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [agreed, setAgreed] = useState(false)
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card-surface rounded-card p-6 w-full">
        <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6 text-danger" />
        </div>
        <h3 className="text-[17px] font-bold text-deep-brown text-center mb-2">정말 탈퇴하시겠어요?</h3>
        <p className="text-[13px] text-warm-gray text-center leading-relaxed mb-4">
          모든 여행 기록, 앨범, 게시글이 영구 삭제되며
          <br />
          <span className="text-danger font-semibold">되돌릴 수 없습니다.</span>
        </p>
        <button
          onClick={() => setAgreed(!agreed)}
          className="flex items-center gap-2 w-full mb-4"
        >
          <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center transition-all',
            agreed ? 'bg-danger border-danger' : 'border-border'
          )}>
            {agreed && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-[13px] text-deep-brown">위 내용을 확인했습니다</span>
        </button>
        <ModalActions>
          <Button onClick={onClose} variant="outline">
            취소
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!agreed}
            variant="destructive"
          >
            탈퇴하기
          </Button>
        </ModalActions>
      </div>
    </div>
  )
}

function PetsSubScreen({ onBack }: { onBack: () => void }) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPet, setSelectedPet] = useState<string | null>(null)

  return (
    <div className="flex flex-col flex-1 bg-warm-beige relative overflow-hidden">
      <TopBar title="반려동물 관리" showBack onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 pt-4">
        {pets.map((pet, i) => (
          <div key={i} className="bg-card-surface rounded-card border border-border p-4 mb-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-sage-green/30 flex-shrink-0">
                <Image src={pet.image} alt={pet.name} fill className="object-cover" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-bold text-deep-brown">{pet.name}</p>
                  <div className="flex gap-1">
                    <IconButton aria-label="수정" size="sm">
                      <Edit3 className="w-4 h-4 text-warm-gray" />
                    </IconButton>
                    <IconButton
                      aria-label="삭제"
                      size="sm"
                      variant="danger"
                      onClick={() => { setSelectedPet(pet.name); setShowDeleteModal(true) }}
                    >
                      <Trash2 className="w-4 h-4 text-danger" />
                    </IconButton>
                  </div>
                </div>
                <p className="text-[13px] text-warm-gray">{pet.breed} · {pet.size} · {pet.age}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {pet.activities.map((a) => (
                    <span key={a} className="px-2 py-0.5 rounded-full bg-soft-orange/15 text-soft-orange text-[11px] font-medium">{a}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
        <Button variant="outline" fullWidth size="lg" className="rounded-card border-2 border-dashed text-warm-gray">
          <Plus className="w-4 h-4" />
          <span className="text-[14px] font-medium">반려동물 추가하기</span>
        </Button>
      </div>

      {showDeleteModal && selectedPet && (
        <DeletePetModal
          petName={selectedPet}
          onClose={() => { setShowDeleteModal(false); setSelectedPet(null) }}
          onDelete={() => { setShowDeleteModal(false); setSelectedPet(null) }}
          onMemory={() => { setShowDeleteModal(false); setSelectedPet(null) }}
        />
      )}
    </div>
  )
}

function StampsSubScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col flex-1 bg-warm-beige overflow-hidden">
      <TopBar title="여행 스탬프" showBack onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 pt-4">
        <p className="text-[13px] text-warm-gray mb-4">방문한 지역의 스탬프를 모아보세요!</p>
        <div className="grid grid-cols-3 gap-3">
          {stamps.map((s, i) => (
            <div
              key={i}
              className={cn(
                'flex flex-col items-center p-3 rounded-card border shadow-sm',
                s.acquired ? 'bg-card-surface border-border' : 'bg-muted border-border opacity-50'
              )}
            >
              {/* Stamp */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mb-2 border-4 border-white shadow-sm"
                style={{ backgroundColor: s.acquired ? s.color : '#DDD4C0' }}
              >
                <span className="text-[20px] font-black text-white">{s.acquired ? s.mascot[0] : '?'}</span>
              </div>
              <p className="text-[13px] font-bold text-deep-brown">{s.region}</p>
              {s.acquired ? (
                <>
                  <p className="text-[10px] text-warm-gray mt-0.5">{s.count}회 방문</p>
                  <p className="text-[9px] text-warm-gray">{s.date}</p>
                </>
              ) : (
                <p className="text-[10px] text-warm-gray mt-0.5">미획득</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MemoryAlbumSubScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col flex-1 bg-warm-beige overflow-hidden">
      <TopBar title="추억 앨범" showBack onBack={onBack} />
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 pt-4">
        <p className="text-[13px] text-warm-gray mb-5 leading-relaxed">
          무지개 다리를 건넌 소중한 반려동물과의 추억이 여기 보관되어 있어요.
        </p>
        {memoryAlbums.map((album, i) => (
          <div key={i} className="bg-card-surface rounded-card border border-border overflow-hidden shadow-sm mb-4">
            <div className="relative h-44">
              <Image src={album.coverImage} alt={album.petName} fill className="object-cover opacity-85" />
              <div className="absolute inset-0 bg-gradient-to-t from-deep-brown/70 to-transparent" />
              <div className="absolute bottom-4 left-4">
                <p className="text-[20px] font-bold text-white">{album.petName}</p>
                <p className="text-[12px] text-white/80">{album.breed}</p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-[13px] text-warm-gray mb-1">{album.period}</p>
              <p className="text-[15px] font-semibold text-deep-brown italic">
                &ldquo;{album.note}&rdquo;
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-[12px] text-warm-gray">{album.albumCount}개의 여행 앨범</span>
              </div>
              <Button className="mt-3" variant="soft" fullWidth>
                <Heart className="w-4 h-4" />
                추억 앨범 보기
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const menuItems: { icon: React.ElementType; iconColor: string; label: string; sub: SubScreen; desc: string }[] = [
  { icon: PawPrint, iconColor: 'text-sage-green', label: '반려동물 관리', sub: 'pets', desc: '골든이 · 1마리' },
  { icon: Stamp, iconColor: 'text-soft-orange', label: '스탬프', sub: 'stamps', desc: '3개 획득' },
  { icon: Heart, iconColor: 'text-danger', label: '추억 앨범', sub: 'memory-album', desc: '1마리의 추억' },
  { icon: FileText, iconColor: 'text-warm-gray', label: '작성한 글', sub: null, desc: '3개' },
  { icon: Star, iconColor: 'text-soft-orange', label: '장소 위시리스트', sub: null, desc: '7곳' },
  { icon: Bookmark, iconColor: 'text-sky-blue', label: '북마크', sub: null, desc: '12개' },
]

export default function ProfileScreen({ onLogout, onOpenSettings }: ProfileScreenProps) {
  const [subScreen, setSubScreen] = useState<SubScreen>(null)
  const [showWithdraw, setShowWithdraw] = useState(false)

  if (subScreen === 'pets') return <PetsSubScreen onBack={() => setSubScreen(null)} />
  if (subScreen === 'stamps') return <StampsSubScreen onBack={() => setSubScreen(null)} />
  if (subScreen === 'memory-album') return <MemoryAlbumSubScreen onBack={() => setSubScreen(null)} />

  return (
    <div className="flex flex-col flex-1 bg-warm-beige overflow-hidden relative">
      <TopBar title="내정보" rightAction={<span />} />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* Profile card */}
        <div className="mx-4 mt-4 p-4 bg-card-surface rounded-card border border-border shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-sage-green/30 flex-shrink-0">
              <Image src="/images/dog-hero.png" alt="프로필" fill className="object-cover" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-[18px] font-bold text-deep-brown">산책러버골든</h2>
                <IconButton aria-label="닉네임 수정" size="sm">
                  <Edit3 className="w-4 h-4 text-warm-gray" />
                </IconButton>
              </div>
              <p className="text-[12px] text-warm-gray">골든이맘 · 서울</p>
              <div className="flex gap-4 mt-2">
                {[
                  { val: '12.4', label: '여행km' },
                  { val: '8', label: '방문지' },
                  { val: '3', label: '스탬프' },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="text-[15px] font-bold text-deep-brown">{s.val}</p>
                    <p className="text-[10px] text-warm-gray">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* My pets quick view */}
        <div className="mx-4 mt-4 p-4 bg-card-surface rounded-card border border-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[14px] font-semibold text-deep-brown">나의 반려동물</p>
            <Button
              onClick={() => setSubScreen('pets')}
              variant="link"
              size="sm"
              className="h-auto p-0 text-[12px] no-underline"
            >
              관리
            </Button>
          </div>
          {pets.map((pet, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden border border-border flex-shrink-0">
                <Image src={pet.image} alt={pet.name} fill className="object-cover" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-deep-brown">{pet.name}</p>
                <p className="text-[12px] text-warm-gray">{pet.breed} · {pet.size} · {pet.age}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Menu items */}
        <div className="mx-4 mt-4 bg-card-surface rounded-card border border-border shadow-sm overflow-hidden">
          {menuItems.map((item, i) => (
            <MenuRow
              key={i}
              label={item.label}
              description={item.desc}
              icon={<item.icon className={cn('w-5 h-5', item.iconColor)} />}
              onClick={() => {
                if (item.sub) {
                  setSubScreen(item.sub)
                } else if (onOpenSettings) {
                  const tabMap: Record<string, SettingsTab> = {
                    '작성한 글': 'posts',
                    '장소 위시리스트': 'wishlist',
                    '북마크': 'bookmarks',
                  }
                  const tab = tabMap[item.label]
                  if (tab) onOpenSettings(tab)
                }
              }}
            />
          ))}
        </div>

        {/* Withdraw */}
        <div className="mx-4 mt-4 mb-4 flex items-center gap-4">
          {onLogout && (
            <Button
              onClick={onLogout}
              variant="link"
              size="sm"
              className="h-auto p-0 text-[13px] text-warm-gray underline underline-offset-2"
            >
              로그아웃
            </Button>
          )}
          <Button
            onClick={() => setShowWithdraw(true)}
            variant="link"
            size="sm"
            className="h-auto p-0 text-[13px] text-warm-gray/60 underline underline-offset-2"
          >
            회원 탈퇴
          </Button>
        </div>
      </div>

      {showWithdraw && (
        <WithdrawModal
          onClose={() => setShowWithdraw(false)}
          onConfirm={() => setShowWithdraw(false)}
        />
      )}
    </div>
  )
}
