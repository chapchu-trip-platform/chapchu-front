import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import MobileShell from '@/components/layout/mobile-shell'

const meta = {
  title: 'Layout/MobileShell',
  component: MobileShell,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof MobileShell>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 px-6 text-center">
        <p className="text-[18px] font-bold text-deep-brown">PawRoute Mobile Shell</p>
        <p className="text-[13px] text-warm-gray">최대 너비 430px의 모바일 화면 컨테이너입니다.</p>
      </div>
    ),
  },
}
