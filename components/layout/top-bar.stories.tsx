import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import TopBar from '@/components/layout/top-bar'

const meta = {
  title: 'Layout/TopBar',
  component: TopBar,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div className="min-h-64 bg-warm-beige">
        <Story />
        <div className="px-4 py-6 text-[13px] text-warm-gray">페이지 콘텐츠 영역</div>
      </div>
    ),
  ],
  args: {
    title: '게시판',
  },
} satisfies Meta<typeof TopBar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const WithBackButton: Story = {
  args: {
    title: '코스 상세',
    showBack: true,
    onBack: () => undefined,
  },
}

export const WithProgress: Story = {
  args: {
    title: '반려동물 정보',
    showBack: true,
    onBack: () => undefined,
    rightAction: <span className="text-[12px] text-warm-gray">2/2</span>,
  },
}
