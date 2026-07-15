import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import BottomNav, { type NavTab } from '@/components/layout/bottom-nav'

const meta = {
  title: 'Layout/BottomNav',
  component: BottomNav,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="min-h-[420px] bg-warm-beige">
        <div className="p-6 text-center text-[13px] text-warm-gray">하단 탭을 선택해보세요.</div>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BottomNav>

export default meta
type Story = StoryObj<typeof meta>

function InteractiveBottomNav() {
  const [active, setActive] = useState<NavTab>('home')

  return <BottomNav active={active} onChange={setActive} />
}

export const Interactive: Story = {
  args: {
    active: 'home',
    onChange: () => undefined,
  },
  render: () => <InteractiveBottomNav />,
}

export const MapActive: Story = {
  args: {
    active: 'map',
    onChange: () => undefined,
  },
}
