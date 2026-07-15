import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { InteractiveCard } from '@/components/ui/interactive-card'

const meta = {
  title: 'Design System/InteractiveCard',
  component: InteractiveCard,
  args: {
    children: '카드 내용',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['surface', 'muted', 'plain'],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'default'],
    },
  },
} satisfies Meta<typeof InteractiveCard>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <InteractiveCard>
        <p className="text-[14px] font-semibold text-deep-brown">Surface card</p>
        <p className="mt-1 text-[12px] text-warm-gray">테두리와 그림자가 있는 기본 카드</p>
      </InteractiveCard>
      <InteractiveCard variant="muted">
        <p className="text-[14px] font-semibold text-deep-brown">Muted card</p>
        <p className="mt-1 text-[12px] text-warm-gray">목록 안에서 사용하는 보조 카드</p>
      </InteractiveCard>
      <InteractiveCard variant="plain">
        <p className="text-[14px] font-semibold text-deep-brown">Plain row</p>
        <p className="mt-1 text-[12px] text-warm-gray">배경 없이 hover만 적용되는 카드</p>
      </InteractiveCard>
    </div>
  ),
}
