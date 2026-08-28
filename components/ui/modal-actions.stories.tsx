import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from '@/components/ui/button'
import { ModalActions } from '@/components/ui/modal-actions'

const meta = {
  title: 'Design System/ModalActions',
  component: ModalActions,
} satisfies Meta<typeof ModalActions>

export default meta
type Story = StoryObj<typeof meta>

export const Confirm: Story = {
  args: {
    className: 'w-80',
    children: (
      <>
        <Button className="flex-1" variant="outline">취소</Button>
        <Button className="flex-1">확인</Button>
      </>
    ),
  },
}

export const Destructive: Story = {
  args: {
    className: 'w-80',
    children: (
      <>
        <Button className="flex-1" variant="outline">취소</Button>
        <Button className="flex-1" variant="destructive">삭제</Button>
      </>
    ),
  },
}
