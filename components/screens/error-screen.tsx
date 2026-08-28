'use client'

import { MapPin, AlertCircle, Zap, ZapOff, Upload, Clock, Lightbulb } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { Button } from '@/components/ui/button'

interface ErrorScreenProps {
  type: 'location-denied' | 'location-request' | 'weather-failed' | 'no-routes' | 'no-places' | 'upload-failed' | 'session-expired'
  onBack: () => void
  onRetry?: () => void
  onProceed?: () => void
}

type ErrorType = ErrorScreenProps['type']

const errorConfig: Record<ErrorType, { icon: LucideIcon; title: string; message: string; detail: string; primaryAction: string; secondaryAction?: string }> = {
  'location-request': {
    icon: MapPin,
    title: '위치 권한 필요',
    message: '정확한 주변 장소 추천을 위해 위치 접근 권한이 필요합니다.',
    detail: '위치 정보는 추천 경로와 주변 반려동물 동반 장소를 찾는 데만 사용됩니다.',
    primaryAction: '위치 권한 허용',
  },
  'location-denied': {
    icon: AlertCircle,
    title: '위치 권한 거부됨',
    message: '주소를 직접 입력해서 여행을 시작할 수 있어요.',
    detail: '권한을 다시 허용하려면 설정에서 위치 접근을 활성화하세요.',
    primaryAction: '주소 직접 입력',
    secondaryAction: '나중에',
  },
  'weather-failed': {
    icon: Zap,
    title: '날씨 정보를 불러올 수 없어요',
    message: '네트워크 연결을 확인해주세요.',
    detail: '날씨 정보 없이도 여행을 진행할 수 있습니다.',
    primaryAction: '다시 시도',
    secondaryAction: '계속 진행',
  },
  'no-routes': {
    icon: ZapOff,
    title: '추천 경로가 없어요',
    message: '선택된 위치 사이에 추천 경로가 없습니다.',
    detail: '다른 목적지를 선택하거나 출발지를 변경해보세요.',
    primaryAction: '목적지 변경',
    secondaryAction: '돌아가기',
  },
  'no-places': {
    icon: MapPin,
    title: '주변 반려동물 동반 장소 없음',
    message: '이 지역에 반려동물을 동반할 수 있는 장소가 없어요.',
    detail: '다른 지역을 선택해주세요.',
    primaryAction: '지역 변경',
    secondaryAction: '돌아가기',
  },
  'upload-failed': {
    icon: Upload,
    title: '사진 업로드 실패',
    message: '사진을 업로드할 수 없습니다.',
    detail: '네트워크 연결을 확인하고 다시 시도해주세요.',
    primaryAction: '다시 시도',
    secondaryAction: '건너뛰기',
  },
  'session-expired': {
    icon: Clock,
    title: '세션이 만료되었습니다',
    message: '보안상의 이유로 세션이 종료되었습니다.',
    detail: '다시 로그인해주세요.',
    primaryAction: '로그인하기',
  },
}

export default function ErrorScreen({ type, onBack, onRetry, onProceed }: ErrorScreenProps) {
  const config = errorConfig[type]
  const IconComponent = config.icon

  return (
    <div className="flex flex-col flex-1 bg-warm-beige overflow-hidden">
      <TopBar
        title="알림"
        showBack={type !== 'session-expired'}
        onBack={onBack}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-soft-orange/20 flex items-center justify-center mb-6">
          <IconComponent className="w-10 h-10 text-soft-orange" />
        </div>

        {/* Title */}
        <h2 className="text-[20px] font-bold text-deep-brown text-center mb-3">
          {config.title}
        </h2>

        {/* Message */}
        <p className="text-[15px] text-deep-brown text-center mb-2">
          {config.message}
        </p>

        {/* Detail */}
        <p className="text-[13px] text-warm-gray text-center mb-10">
          {config.detail}
        </p>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          <Button
            onClick={onRetry || onProceed}
            fullWidth
            size="lg"
          >
            {config.primaryAction}
          </Button>

          {config.secondaryAction && (
            <Button
              onClick={onBack}
              fullWidth
              size="lg"
              variant="outline"
            >
              {config.secondaryAction}
            </Button>
          )}
        </div>

        {/* Alternative path for location denied */}
        {type === 'location-denied' && (
          <div className="mt-8 p-4 bg-sage-green/10 rounded-card border border-sage-green/30 w-full">
            <p className="text-[12px] font-semibold text-sage-green mb-2 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" />
              팁
            </p>
            <p className="text-[12px] text-deep-brown">
              주소를 직접 입력해서도 여행을 시작할 수 있습니다. 다만, 주변 추천 장소는 보여드릴 수 없습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
