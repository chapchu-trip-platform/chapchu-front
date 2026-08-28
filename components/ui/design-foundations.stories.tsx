import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const colors = [
  { name: 'Primary', token: 'sage-green', className: 'bg-sage-green', value: '#6FAF8E' },
  { name: 'Primary Soft', token: 'sage-green-light', className: 'bg-sage-green-light', value: '#D6EDE3' },
  { name: 'Accent', token: 'soft-orange', className: 'bg-soft-orange', value: '#F4A261' },
  { name: 'Danger', token: 'danger', className: 'bg-danger', value: '#E76F51' },
  { name: 'Background', token: 'warm-beige', className: 'bg-warm-beige', value: '#F7F1E7' },
  { name: 'Surface', token: 'card-surface', className: 'bg-card-surface', value: '#FDFAF4' },
  { name: 'Muted', token: 'muted', className: 'bg-muted', value: '#EDE5D4' },
  { name: 'Border', token: 'border', className: 'bg-border', value: '#DDD4C0' },
]

const controlRules = [
  ['Page CTA', '48px', 'rounded-btn (16px)', '15px / semibold'],
  ['Default Button', '44px', 'rounded-btn (16px)', '14px / semibold'],
  ['Small Button', '36px', 'rounded-btn (16px)', '13px / semibold'],
  ['Icon Button', '32 / 36 / 40px', 'round', '아이콘 14 / 16 / 20px'],
  ['Choice Chip', '36px', 'round', '13px / medium'],
  ['Input', '48px', 'rounded-card (20px)', '14px / regular'],
  ['Textarea', 'content', 'rounded-card (20px)', '14px / regular'],
  ['Interactive Card', 'content', 'rounded-card (20px)', '콘텐츠에 따름'],
]

function DesignFoundations() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 p-6">
      <section>
        <h1 className="text-[22px] font-bold text-deep-brown">PawRoute UI 기준</h1>
        <p className="mt-1 text-[13px] text-warm-gray">
          공통 컴포넌트와 화면 구현이 따라야 하는 색상·크기·상태 기준입니다.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-[16px] font-bold text-deep-brown">Color tokens</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colors.map((color) => (
            <div key={color.token} className="overflow-hidden rounded-card border border-border bg-card-surface">
              <div className={`h-16 ${color.className}`} />
              <div className="p-3">
                <p className="text-[13px] font-semibold text-deep-brown">{color.name}</p>
                <p className="text-[11px] text-warm-gray">{color.token}</p>
                <p className="mt-1 text-[11px] text-warm-gray">{color.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[16px] font-bold text-deep-brown">Control rules</h2>
        <div className="overflow-hidden rounded-card border border-border bg-card-surface">
          <table className="w-full text-left">
            <thead className="bg-muted/60 text-[12px] text-warm-gray">
              <tr>
                <th className="px-4 py-3 font-semibold">구분</th>
                <th className="px-4 py-3 font-semibold">높이</th>
                <th className="px-4 py-3 font-semibold">라운드</th>
                <th className="px-4 py-3 font-semibold">텍스트</th>
              </tr>
            </thead>
            <tbody>
              {controlRules.map(([name, height, radius, text]) => (
                <tr key={name} className="border-t border-border text-[12px] text-deep-brown">
                  <td className="px-4 py-3 font-semibold">{name}</td>
                  <td className="px-4 py-3">{height}</td>
                  <td className="px-4 py-3">{radius}</td>
                  <td className="px-4 py-3">{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-card border border-border bg-card-surface p-4">
        <h2 className="text-[16px] font-bold text-deep-brown">공통 상태 규칙</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] text-warm-gray">
          <li>hover는 기본 색상의 90% 또는 muted 50%를 사용합니다.</li>
          <li>active는 hover보다 한 단계 진하게 표시합니다.</li>
          <li>focus-visible은 sage-green 50%의 2px ring을 표시합니다.</li>
          <li>disabled는 pointer event를 막고 opacity 40%를 적용합니다.</li>
          <li>위험 동작은 danger 색상을 사용하고 일반 primary와 혼용하지 않습니다.</li>
        </ul>
      </section>
    </div>
  )
}

const meta = {
  title: 'Design System/Foundations',
  component: DesignFoundations,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DesignFoundations>

export default meta
type Story = StoryObj<typeof meta>

export const Guidelines: Story = {}
