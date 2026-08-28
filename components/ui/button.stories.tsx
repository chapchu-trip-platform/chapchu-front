import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ArrowRight, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const meta = {
  title: 'Design System/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  args: {
    children: '여행 시작하기',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline', 'secondary', 'ghost', 'destructive', 'soft', 'link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'icon-sm', 'icon', 'icon-lg'],
    },
    fullWidth: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <Button fullWidth>기본 버튼</Button>
      <Button fullWidth variant="outline">외곽선 버튼</Button>
      <Button fullWidth variant="secondary">보조 버튼</Button>
      <Button fullWidth variant="soft">부드러운 버튼</Button>
      <Button fullWidth variant="ghost">고스트 버튼</Button>
      <Button fullWidth variant="destructive">삭제하기</Button>
      <Button fullWidth variant="link">자세히 보기</Button>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-3">
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
}

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Button size="lg">
        추천 경로 보기
        <ArrowRight />
      </Button>
      <Button variant="destructive">
        <Trash2 />
        삭제하기
      </Button>
    </div>
  ),
}

export const States: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3">
      <Button fullWidth>기본 상태</Button>
      <Button fullWidth disabled>비활성 상태</Button>
      <Button fullWidth variant="outline">외곽선 상태</Button>
      <Button fullWidth variant="destructive">위험 상태</Button>
    </div>
  ),
}
