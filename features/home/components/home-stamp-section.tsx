import { Stamp } from 'lucide-react'
import type { TravelStamp } from '@/features/stamps/types/stamp'

interface HomeStampSectionProps {
  stamps: TravelStamp[]
  acquiredCount: number
  totalCount: number
}

const STAMP_TONES = [
  'bg-soft-orange/15 text-soft-orange ring-soft-orange/20',
  'bg-sage-green/15 text-sage-green ring-sage-green/20',
  'bg-sky-blue/30 text-deep-brown/70 ring-sky-blue/40',
] as const

export default function HomeStampSection({
  stamps,
  acquiredCount,
  totalCount,
}: HomeStampSectionProps) {
  const visibleStamps = stamps.slice(0, 5)

  return (
    <div
      aria-labelledby="home-stamps-title"
      className="mx-4 mt-3 rounded-card border border-border bg-card-surface p-4 shadow-sm"
      role="region"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="home-stamps-title" className="text-[16px] font-semibold text-deep-brown">
            여행 스탬프
          </h2>
          <p className="mt-0.5 text-[11px] text-warm-gray">최근에 모은 스탬프예요</p>
        </div>
        <span
          aria-label={`전체 ${totalCount}개 중 ${acquiredCount}개 획득`}
          className="rounded-full bg-sage-green/10 px-2.5 py-1 text-[11px] font-semibold text-sage-green"
        >
          {acquiredCount}/{totalCount}
        </span>
      </div>

      {visibleStamps.length > 0 ? (
        <ul aria-label="최근 획득한 스탬프" className="mt-3 flex items-start gap-2">
          {visibleStamps.map((stamp, index) => (
            <li key={stamp.stampId} className="min-w-0 flex-1 text-center">
              <div
                className={`mx-auto flex size-11 items-center justify-center rounded-full ring-1 ${STAMP_TONES[index % STAMP_TONES.length]}`}
                title={`${stamp.stampName} 스탬프 · ${stamp.stampCount}회 방문`}
              >
                <Stamp aria-hidden="true" className="size-5" />
              </div>
              <p className="mt-1.5 truncate text-[11px] font-semibold text-deep-brown">
                {stamp.stampName}
              </p>
              <p className="text-[9px] text-warm-gray">{stamp.stampCount}회</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-xl bg-warm-beige/60 px-3 py-4 text-center text-[12px] text-warm-gray">
          아직 모은 스탬프가 없어요.
        </p>
      )}
    </div>
  )
}
