import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { NotificationButton } from '@/components/ui/notification-button'

const meta = {
  title: 'Design System/NotificationButton',
  component: NotificationButton,
  args: {
    hasUnread: true,
  },
} satisfies Meta<typeof NotificationButton>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const States: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <NotificationButton />
      <NotificationButton hasUnread />
    </div>
  ),
}
