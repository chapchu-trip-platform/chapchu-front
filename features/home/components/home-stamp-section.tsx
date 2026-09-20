import Image from 'next/image'
import { Button } from '@/components/ui/button'
import type { HomeDataStatus } from '@/features/home/types/home'
import { getStampRegion } from '@/features/stamps/constants/regions'
import type { TravelStamp } from '@/features/stamps/types/stamp'

interface HomeStampSectionProps {
  stamps: TravelStamp[]
  acquiredCount: number
  totalCount: number
  status: HomeDataStatus
  onRetry: () => void
}

export default function HomeStampSection({
  stamps,
  acquiredCount,
  totalCount,
  status,
  onRetry,
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
          <p className="mt-0.5 text-[11px] text-warm-gray">많이 모은 스탬프부터 보여드려요</p>
        </div>
        {status === 'success' ? (
          <span
            aria-label={`전체 ${totalCount}개 중 ${acquiredCount}개 획득`}
            className="rounded-full bg-sage-green/10 px-2.5 py-1 text-[11px] font-semibold text-sage-green"
          >
            {acquiredCount}/{totalCount}
          </span>
        ) : (
          <span aria-hidden="true" className="h-6 w-12 animate-pulse rounded-full bg-muted" />
        )}
      </div>

      {status === 'loading' && (
        <div aria-label="여행 스탬프를 불러오는 중" className="mt-3 flex gap-2" role="status">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} aria-hidden="true" className="flex-1 text-center">
              <div className="mx-auto size-12 animate-pulse rounded-full bg-muted" />
              <div className="mx-auto mt-2 h-2.5 w-8 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 rounded-xl bg-warm-beige/60 px-3 py-4 text-center" role="alert">
          <p className="text-[12px] text-warm-gray">여행 스탬프를 불러오지 못했어요.</p>
          <Button onClick={onRetry} variant="link" size="sm" className="mt-1">
            스탬프 다시 시도
          </Button>
        </div>
      )}

      {status === 'success' && (visibleStamps.length > 0 ? (
          <ul aria-label="방문 횟수가 많은 여행 스탬프" className="mt-3 flex items-start gap-2">
            {visibleStamps.map((stamp) => {
              const region = getStampRegion(stamp.stampName)
              if (!region) return null
              return (
                <li key={stamp.stampId} className="min-w-0 flex-1 text-center">
                  <Image
                    src={`/stamps/achieved/${region.slug}.png`}
                    alt={`${stamp.stampName} 여행 스탬프`}
                    width={56}
                    height={56}
                    className="mx-auto size-12 object-contain"
                  />
                  <p className="mt-1 truncate text-[11px] font-semibold text-deep-brown">
                    {stamp.stampName}
                  </p>
                  <p className="text-[9px] text-warm-gray">{stamp.stampCount}회</p>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-xl bg-warm-beige/60 px-3 py-4 text-center text-[12px] leading-relaxed text-warm-gray">
            아직 획득한 여행 스탬프가 없어요.<br />여행을 완료하면 이곳에 표시돼요.
          </p>
        ))}
    </div>
  )
}
