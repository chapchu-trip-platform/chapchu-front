import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Bell, Edit3, Trash2, X } from 'lucide-react'

function AuditSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card-surface p-5">
      <h2 className="mb-1 text-[16px] font-bold text-deep-brown">{title}</h2>
      <p className="mb-4 text-[12px] text-warm-gray">통합 전 화면별 스타일을 비교하는 임시 감사 영역입니다.</p>
      {children}
    </section>
  )
}

function LegacyUiAudit() {
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4 p-6 md:grid-cols-2">
      <AuditSection title="주요 CTA">
        <div className="flex flex-col gap-3">
          <button className="h-12 w-full rounded-btn bg-sage-green text-[15px] font-semibold text-white active:opacity-80">
            rounded-btn · 15px · opacity
          </button>
          <button className="h-12 w-full rounded-card bg-sage-green text-[14px] font-semibold text-white active:bg-sage-green/90">
            rounded-card · 14px · background
          </button>
          <button className="h-11 w-full rounded-btn bg-sage-green text-[13px] font-semibold text-white">
            44px · 13px · 상태 없음
          </button>
        </div>
      </AuditSection>

      <AuditSection title="모달 액션">
        <div className="flex gap-2">
          <button className="h-11 flex-1 rounded-btn border border-border text-[14px] font-semibold text-warm-gray">
            취소
          </button>
          <button className="h-11 flex-1 rounded-btn bg-danger text-[14px] font-semibold text-white">
            삭제
          </button>
        </div>
        <div className="mt-3 flex gap-3">
          <button className="h-12 flex-1 rounded-card border border-border bg-card text-[14px] font-semibold text-deep-brown">
            취소
          </button>
          <button className="h-12 flex-1 rounded-card bg-sage-green text-[14px] font-semibold text-white">
            확인
          </button>
        </div>
      </AuditSection>

      <AuditSection title="아이콘 버튼">
        <div className="flex items-center gap-3">
          <button aria-label="알림" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
            <Bell className="h-5 w-5 text-deep-brown" />
          </button>
          <button aria-label="닫기" className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <X className="h-4 w-4 text-warm-gray" />
          </button>
          <button aria-label="수정" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted">
            <Edit3 className="h-4 w-4 text-warm-gray" />
          </button>
          <button aria-label="삭제" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted">
            <Trash2 className="h-4 w-4 text-danger" />
          </button>
        </div>
      </AuditSection>

      <AuditSection title="선택 칩">
        <div className="flex flex-wrap gap-2">
          <button className="rounded-full border border-sage-green bg-sage-green px-4 py-2 text-[13px] font-medium text-white">자연</button>
          <button className="rounded-full border border-border bg-card px-4 py-2 text-[13px] font-medium text-warm-gray">도심</button>
          <button className="rounded-full border border-soft-orange bg-soft-orange px-4 py-2 text-[13px] font-medium text-white">자차</button>
          <button className="h-11 flex-1 rounded-card border border-sage-green bg-sage-green text-[13px] font-medium text-white">소형</button>
        </div>
      </AuditSection>

      <AuditSection title="입력 필드">
        <div className="flex flex-col gap-3">
          <input className="h-12 w-full rounded-card border border-border bg-card px-4 text-[14px] text-deep-brown" placeholder="48px · px-4" />
          <input className="h-11 w-full rounded-card border border-border bg-card px-3 text-[14px] text-deep-brown" placeholder="44px · px-3" />
          <textarea className="w-full resize-none rounded-card border border-border bg-card p-3 text-[14px] text-deep-brown" rows={3} placeholder="Textarea · p-3" />
        </div>
      </AuditSection>

      <AuditSection title="클릭 카드">
        <div className="flex flex-col gap-3">
          <button className="rounded-card border border-border bg-card-surface p-4 text-left shadow-sm active:opacity-80">
            <p className="text-[14px] font-semibold text-deep-brown">기본 클릭 카드</p>
            <p className="mt-1 text-[12px] text-warm-gray">border + shadow + active opacity</p>
          </button>
          <button className="rounded-xl bg-muted/60 p-3 text-left active:opacity-80">
            <p className="text-[14px] font-semibold text-deep-brown">목록형 클릭 카드</p>
            <p className="mt-1 text-[12px] text-warm-gray">muted background + no border</p>
          </button>
        </div>
      </AuditSection>
    </div>
  )
}

const meta = {
  title: 'Audit/Legacy UI',
  component: LegacyUiAudit,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof LegacyUiAudit>

export default meta
type Story = StoryObj<typeof meta>

export const AllPatterns: Story = {}
