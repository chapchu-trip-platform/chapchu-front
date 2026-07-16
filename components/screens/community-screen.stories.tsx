import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import MobileShell from '@/components/layout/mobile-shell'
import CommunityScreen from '@/components/screens/community-screen'

const meta = {
  title: 'Screens/Main/Community',
  component: CommunityScreen,
  decorators: [
    (Story) => (
      <MobileShell>
        <Story />
      </MobileShell>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true },
  },
} satisfies Meta<typeof CommunityScreen>

export default meta
type Story = StoryObj<typeof meta>

export const List: Story = {}

export const PostDetail: Story = {
  args: { initialPostId: '1' },
}
