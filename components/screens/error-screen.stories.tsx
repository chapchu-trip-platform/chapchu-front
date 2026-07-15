import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import MobileShell from '@/components/layout/mobile-shell'
import ErrorScreen from '@/components/screens/error-screen'

const meta = {
  title: 'Screens/Feedback/Error',
  component: ErrorScreen,
  decorators: [
    (Story) => (
      <MobileShell>
        <Story />
      </MobileShell>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    onBack: () => undefined,
    onRetry: () => undefined,
    onProceed: () => undefined,
  },
} satisfies Meta<typeof ErrorScreen>

export default meta
type Story = StoryObj<typeof meta>

export const LocationDenied: Story = {
  args: { type: 'location-denied' },
}

export const WeatherFailed: Story = {
  args: { type: 'weather-failed' },
}

export const SessionExpired: Story = {
  args: { type: 'session-expired' },
}
