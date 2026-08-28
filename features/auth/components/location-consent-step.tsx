'use client'

import { CloudSun, MapPin, ShieldCheck } from 'lucide-react'

interface LocationConsentStepProps {
  collectionConsent: boolean
  disabled?: boolean
  thirdPartyConsent: boolean
  onCollectionConsentChange: (checked: boolean) => void
  onThirdPartyConsentChange: (checked: boolean) => void
}

interface ConsentCheckboxProps {
  checked: boolean
  description: string
  disabled?: boolean
  id: string
  label: string
  onChange: (checked: boolean) => void
}

function ConsentCheckbox({
  checked,
  description,
  disabled = false,
  id,
  label,
  onChange,
}: ConsentCheckboxProps) {
  const labelId = `${id}-label`
  const descriptionId = `${id}-description`

  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-white/80 p-4 shadow-sm"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        className="mt-0.5 h-5 w-5 flex-none accent-sage-green disabled:cursor-not-allowed disabled:opacity-60"
      />
      <span className="min-w-0">
        <span
          id={labelId}
          className="block text-[13px] font-semibold text-deep-brown"
        >
          <span className="mr-1 text-soft-orange">[필수]</span>
          {label}
        </span>
        <span
          id={descriptionId}
          className="mt-1 block text-[12px] leading-relaxed text-warm-gray"
        >
          {description}
        </span>
      </span>
    </label>
  )
}

export default function LocationConsentStep({
  collectionConsent,
  disabled = false,
  thirdPartyConsent,
  onCollectionConsentChange,
  onThirdPartyConsentChange,
}: LocationConsentStepProps) {
  return (
    <div className="flex flex-col gap-4 pt-4">
      <div className="rounded-3xl bg-sage-green/10 px-5 py-5">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-sage-green/20">
          <MapPin className="h-5 w-5 text-sage-green" aria-hidden="true" />
        </div>
        <h2 className="text-[18px] font-bold leading-snug text-deep-brown">
          내 위치에 맞는 여행 정보를 받아보세요
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-warm-gray">
          챱츄는 현재 위치를 이용해 지도의 중심을 맞추고, 가까운 반려동물 동반
          장소와 지역 날씨를 안내합니다. 이 단계에서는 동의 여부만 저장하며 기기
          위치 권한은 실제 기능을 사용할 때 별도로 요청합니다.
        </p>
      </div>

      <section
        aria-labelledby="location-collection-title"
        className="rounded-2xl border border-border bg-white/65 p-4"
      >
        <div className="mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-sage-green" aria-hidden="true" />
          <h3
            id="location-collection-title"
            className="text-[13px] font-semibold text-deep-brown"
          >
            개인위치정보 수집·이용 안내
          </h3>
        </div>
        <dl className="grid grid-cols-[84px_1fr] gap-x-3 gap-y-2 text-[12px] leading-relaxed">
          <dt className="font-medium text-warm-gray">수집·이용 주체</dt>
          <dd className="text-deep-brown">챱츄팀</dd>
          <dt className="font-medium text-warm-gray">수집 항목</dt>
          <dd className="text-deep-brown">현재 위·경도, 위치 정확도, 수집 시각</dd>
          <dt className="font-medium text-warm-gray">이용 목적</dt>
          <dd className="text-deep-brown">
            현재 위치 지도 표시, 지역 날씨 제공, 주변 반려동물 동반 장소 추천
          </dd>
          <dt className="font-medium text-warm-gray">보유 기간</dt>
          <dd className="text-deep-brown">
            원본 위치는 지도·날씨·주변 추천 기능 이용 중 로그인 세션의 기기
            메모리에만 임시 보관하며, 로그아웃 또는 세션 종료 시 삭제. 동의 여부는
            철회 또는 회원 탈퇴 시까지 보관
          </dd>
        </dl>
      </section>

      <section
        aria-labelledby="location-provision-title"
        className="rounded-2xl border border-border bg-white/65 p-4"
      >
        <div className="mb-3 flex items-center gap-2">
          <CloudSun className="h-4 w-4 text-soft-orange" aria-hidden="true" />
          <h3
            id="location-provision-title"
            className="text-[13px] font-semibold text-deep-brown"
          >
            개인위치정보 제3자 제공 안내
          </h3>
        </div>
        <dl className="grid grid-cols-[84px_1fr] gap-x-3 gap-y-2 text-[12px] leading-relaxed">
          <dt className="font-medium text-warm-gray">제공받는 자</dt>
          <dd className="text-deep-brown">
            기상청, 한국관광공사 TourAPI, SK텔레콤 TMAP
          </dd>
          <dt className="font-medium text-warm-gray">제공 항목</dt>
          <dd className="text-deep-brown">
            날씨 조회용 예보 격자·지역코드와 요청 시각, 지도·주변 장소 조회에 필요한
            최소 범위의 위치 좌표
          </dd>
          <dt className="font-medium text-warm-gray">제공 목적</dt>
          <dd className="text-deep-brown">날씨, 지도, 위치 기반 장소 추천 제공</dd>
          <dt className="font-medium text-warm-gray">보유 기간</dt>
          <dd className="text-deep-brown">
            API 요청 처리 목적 달성 시까지. 법령상 보존 의무가 있는 확인자료는 해당
            법정 기간 동안 보관될 수 있음
          </dd>
        </dl>
      </section>

      <div className="flex flex-col gap-3">
        <ConsentCheckbox
          id="location-collection-consent"
          checked={collectionConsent}
          disabled={disabled}
          onChange={onCollectionConsentChange}
          label="개인위치정보 수집·이용에 동의합니다"
          description="현재 위치를 지도·날씨·주변 장소 추천에 사용하는 것에 동의합니다."
        />
        <ConsentCheckbox
          id="location-third-party-consent"
          checked={thirdPartyConsent}
          disabled={disabled}
          onChange={onThirdPartyConsentChange}
          label="개인위치정보 제3자 제공에 동의합니다"
          description="기상청과 지도·관광 API에 서비스 제공에 필요한 최소 위치정보를 전달하는 것에 동의합니다."
        />
      </div>

      <div className="rounded-2xl bg-soft-orange/10 px-4 py-3 text-[12px] leading-relaxed text-deep-brown">
        동의를 거부할 권리가 있습니다. 다만 위치 기반 기능은 챱츄 서비스 제공에
        필수이므로 동의하지 않으면 회원가입과 서비스 이용이 제한됩니다. 동의 후에도
        위치정보의 수집·이용·제공 중지 또는 철회를 요청할 수 있습니다.
      </div>
    </div>
  )
}
