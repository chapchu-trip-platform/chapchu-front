'use client'

import { BookOpen } from 'lucide-react'
import TopBar from '@/components/top-bar'

export default function AlbumScreen() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopBar title="여행 앨범" />

      <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 pb-24">
        <BookOpen className="h-12 w-12 text-warm-gray/40" aria-hidden="true" />
        <div className="text-center">
          <p className="text-[15px] font-medium text-warm-gray">아직 여행 기록이 없어요</p>
          <p className="mt-1 text-[13px] text-warm-gray/70">
            반려동물과 첫 여행을 떠나볼까요?
          </p>
        </div>
      </div>
    </div>
  )
}
