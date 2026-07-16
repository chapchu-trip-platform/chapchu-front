import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import MobileShell from '@/components/layout/mobile-shell'
import HomeScreen from '@/components/screens/home-screen'

const meta = {
  title: 'Screens/Main/Home',
  component: HomeScreen,
  decorators: [
    (Story) => (
      <MobileShell>
        <Story />
      </MobileShell>
    ),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof HomeScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onStartTrip: () => undefined,
    onViewPost: () => undefined,
  },
}
