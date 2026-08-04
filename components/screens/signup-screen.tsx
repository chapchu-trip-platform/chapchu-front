'use client'

import { useState } from 'react'

import { isNicknameAvailable, registerNickname, SessionExpiredError } from '@/lib/auth'
import { Plus, X, ChevronRight, Check } from 'lucide-react'
import TopBar from '@/components/top-bar'
import { cn } from '@/lib/utils'

interface SignupScreenProps {
  onDone: () => void
}

const themes = ['자연', '도심', '해변', '산악', '역사', '힐링']
const regions = ['서울', '경기', '강원', '제주', '부산', '경남', '전라', '충청']
const transports = ['자차', '대중교통', '자전거', '도보']
const activities = ['산책', '수영', '야외놀이', '드라이브', '캠핑', '등산']
const sizes = ['소형', '중형', '대형']

interface Pet {
  name: string
  breed: string
  size: string
  age: string
  activities: string[]
}

export default function SignupScreen({ onDone }: SignupScreenProps) {
  const [step, setStep] = useState<'user' | 'pet'>('user')
  const [nickname, setNickname] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [nicknameError, setNicknameError] = useState<string | null>(null)
  const [selectedThemes, setSelectedThemes] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [selectedTransport, setSelectedTransport] = useState<string>('')
  const [pets, setPets] = useState<Pet[]>([
    { name: '', breed: '', size: '소형', age: '', activities: [] },
  ])
  const [activePetIdx, setActivePetIdx] = useState(0)

  /**
   * 닉네임을 실제로 등록한다. 구글 첫 로그인으로 자동 회원등록된 계정은 nickname이 비어 있어서
   * 이 단계를 통과해야 서비스를 쓸 수 있다.
   *
   * 중복 확인(GET)은 조회 시점 기준이라 예약 효과가 없다. 그 사이 다른 유저가 선점할 수 있으므로
   * 최종 판정은 등록 요청의 409 응답이다 — 그래서 둘 다 처리한다.
   */
  const handleSubmitNickname = async () => {
    const value = nickname.trim()
    setSubmitting(true)
    setNicknameError(null)
    try {
      if (!(await isNicknameAvailable(value))) {
        setNicknameError('이미 사용 중인 닉네임입니다.')
        return
      }
      await registerNickname(value)
      setStep('pet')
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        setNicknameError('세션이 만료되었습니다. 다시 로그인해주세요.')
        return
      }
      setNicknameError(e instanceof Error ? e.message : '닉네임 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleArr = (arr: string[], val: string, setter: (v: string[]) => void) => {
    setter(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val])
  }

  const updatePet = (idx: number, field: keyof Pet, val: string | string[]) => {
    setPets((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)))
  }

  const addPet = () => {
    setPets((prev) => [...prev, { name: '', breed: '', size: '소형', age: '', activities: [] }])
    setActivePetIdx(pets.length)
  }

  const pet = pets[activePetIdx]

  return (
    <div className="flex flex-col flex-1 bg-warm-beige overflow-hidden">
      <TopBar
        title={step === 'user' ? '기본 정보 입력' : '반려동물 정보'}
        showBack={step === 'pet'}
        onBack={() => setStep('user')}
        rightAction={<span className="text-[12px] text-warm-gray">{step === 'user' ? '1/2' : '2/2'}</span>}
      />

      {/* Progress */}
      <div className="px-4 py-2">
        <div className="flex gap-1">
          <div className="flex-1 h-1 rounded-full bg-sage-green" />
          <div className={cn('flex-1 h-1 rounded-full', step === 'pet' ? 'bg-sage-green' : 'bg-border')} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-28">
        {step === 'user' ? (
          <div className="flex flex-col gap-6 pt-4">
            {/* Nickname */}
            <div>
              <label className="text-[13px] font-semibold text-deep-brown mb-2 block">닉네임</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="사용할 닉네임을 입력하세요"
                maxLength={30}
                className="w-full h-12 px-4 rounded-card border border-border bg-card text-deep-brown text-[14px] placeholder:text-warm-gray focus:outline-none focus:ring-2 focus:ring-sage-green/50"
              />
              {nicknameError !== null && (
                <p className="text-[12px] text-red-600 mt-2">{nicknameError}</p>
              )}
            </div>

            {/* Theme */}
            <div>
              <label className="text-[13px] font-semibold text-deep-brown mb-3 block">선호 테마</label>
              <div className="flex flex-wrap gap-2">
                {themes.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleArr(selectedThemes, t, setSelectedThemes)}
                    className={cn(
                      'px-4 py-2 rounded-full text-[13px] font-medium border transition-all',
                      selectedThemes.includes(t)
                        ? 'bg-sage-green text-white border-sage-green'
                        : 'bg-card text-warm-gray border-border'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Region */}
            <div>
              <label className="text-[13px] font-semibold text-deep-brown mb-3 block">선호 지역</label>
              <div className="flex flex-wrap gap-2">
                {regions.map((r) => (
                  <button
                    key={r}
                    onClick={() => toggleArr(selectedRegions, r, setSelectedRegions)}
                    className={cn(
                      'px-4 py-2 rounded-full text-[13px] font-medium border transition-all',
                      selectedRegions.includes(r)
                        ? 'bg-sage-green text-white border-sage-green'
                        : 'bg-card text-warm-gray border-border'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Transport */}
            <div>
              <label className="text-[13px] font-semibold text-deep-brown mb-3 block">선호 이동수단</label>
              <div className="flex gap-2 flex-wrap">
                {transports.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTransport(t)}
                    className={cn(
                      'px-4 py-2 rounded-full text-[13px] font-medium border transition-all',
                      selectedTransport === t
                        ? 'bg-soft-orange text-white border-soft-orange'
                        : 'bg-card text-warm-gray border-border'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5 pt-4">
            {/* Pet tabs */}
            {pets.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {pets.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => setActivePetIdx(i)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-[12px] font-medium whitespace-nowrap border transition-all',
                      activePetIdx === i
                        ? 'bg-sage-green text-white border-sage-green'
                        : 'bg-card text-warm-gray border-border'
                    )}
                  >
                    {p.name || `반려동물 ${i + 1}`}
                  </button>
                ))}
                <button
                  onClick={addPet}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
                  aria-label="반려동물 추가"
                >
                  <Plus className="w-4 h-4 text-warm-gray" />
                </button>
              </div>
            )}

            {/* Pet name */}
            <div>
              <label className="text-[13px] font-semibold text-deep-brown mb-2 block">이름</label>
              <input
                type="text"
                value={pet.name}
                onChange={(e) => updatePet(activePetIdx, 'name', e.target.value)}
                placeholder="반려동물 이름"
                className="w-full h-12 px-4 rounded-card border border-border bg-card text-deep-brown text-[14px] placeholder:text-warm-gray focus:outline-none focus:ring-2 focus:ring-sage-green/50"
              />
            </div>

            {/* Breed + Age */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[13px] font-semibold text-deep-brown mb-2 block">견종</label>
                <input
                  type="text"
                  value={pet.breed}
                  onChange={(e) => updatePet(activePetIdx, 'breed', e.target.value)}
                  placeholder="골든 리트리버"
                  className="w-full h-12 px-3 rounded-card border border-border bg-card text-deep-brown text-[14px] placeholder:text-warm-gray focus:outline-none focus:ring-2 focus:ring-sage-green/50"
                />
              </div>
              <div className="w-24">
                <label className="text-[13px] font-semibold text-deep-brown mb-2 block">나이</label>
                <input
                  type="text"
                  value={pet.age}
                  onChange={(e) => updatePet(activePetIdx, 'age', e.target.value)}
                  placeholder="3살"
                  className="w-full h-12 px-3 rounded-card border border-border bg-card text-deep-brown text-[14px] placeholder:text-warm-gray focus:outline-none focus:ring-2 focus:ring-sage-green/50"
                />
              </div>
            </div>

            {/* Size */}
            <div>
              <label className="text-[13px] font-semibold text-deep-brown mb-2 block">크기</label>
              <div className="flex gap-2">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => updatePet(activePetIdx, 'size', s)}
                    className={cn(
                      'flex-1 h-11 rounded-card text-[13px] font-medium border transition-all',
                      pet.size === s
                        ? 'bg-sage-green text-white border-sage-green'
                        : 'bg-card text-warm-gray border-border'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Activities */}
            <div>
              <label className="text-[13px] font-semibold text-deep-brown mb-2 block">선호 활동</label>
              <div className="flex flex-wrap gap-2">
                {activities.map((a) => (
                  <button
                    key={a}
                    onClick={() => {
                      const current = pet.activities
                      const next = current.includes(a)
                        ? current.filter((x) => x !== a)
                        : [...current, a]
                      updatePet(activePetIdx, 'activities', next)
                    }}
                    className={cn(
                      'px-4 py-2 rounded-full text-[13px] font-medium border transition-all',
                      pet.activities.includes(a)
                        ? 'bg-soft-orange text-white border-soft-orange'
                        : 'bg-card text-warm-gray border-border'
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {pets.length === 1 && (
              <button
                onClick={addPet}
                className="flex items-center gap-2 text-sage-green text-[13px] font-semibold py-2"
              >
                <Plus className="w-4 h-4" />
                반려동물 추가하기
              </button>
            )}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] px-4 pb-8 pt-4 bg-warm-beige border-t border-border">
        {step === 'user' ? (
          <button
            onClick={handleSubmitNickname}
            disabled={!nickname.trim() || submitting}
            className="w-full h-12 rounded-btn bg-sage-green text-white font-semibold text-[15px] disabled:opacity-40 active:opacity-80 transition-opacity"
          >
            {submitting ? '등록 중…' : '다음 — 반려동물 등록'}
          </button>
        ) : (
          <button
            onClick={onDone}
            className="w-full h-12 rounded-btn bg-sage-green text-white font-semibold text-[15px] active:opacity-80 transition-opacity"
          >
            완료 — 여행 시작하기
          </button>
        )}
      </div>
    </div>
  )
}
