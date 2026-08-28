import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import MobileShell from '@/components/layout/mobile-shell'
import TripEndScreen from '@/components/screens/trip-end-screen'

const meta = {
  title: 'Screens/Travel/TripEnd',
  component: TripEndScreen,
  decorators: [
    (Story) => (
      <MobileShell>
        <Story />
      </MobileShell>
    ),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TripEndScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onSave: () => undefined,
    onShare: () => undefined,
  },
}
