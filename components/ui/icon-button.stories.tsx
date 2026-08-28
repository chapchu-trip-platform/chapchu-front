import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Bell, Edit3, Plus, Trash2, X } from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'

const meta = {
  title: 'Design System/IconButton',
  component: IconButton,
  args: {
    'aria-label': '알림',
    children: <Bell />,
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['ghost', 'muted', 'primary', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
    },
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Variants: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <IconButton aria-label="알림"><Bell /></IconButton>
      <IconButton aria-label="닫기" variant="muted"><X /></IconButton>
      <IconButton aria-label="추가" variant="primary"><Plus /></IconButton>
      <IconButton aria-label="삭제" variant="danger"><Trash2 /></IconButton>
      <IconButton aria-label="수정"><Edit3 /></IconButton>
    </div>
  ),
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <IconButton aria-label="작은 알림" size="sm"><Bell /></IconButton>
      <IconButton aria-label="기본 알림"><Bell /></IconButton>
      <IconButton aria-label="큰 알림" size="lg"><Bell /></IconButton>
    </div>
  ),
}
