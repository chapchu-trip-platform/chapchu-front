import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import MobileShell from '@/components/layout/mobile-shell'
import SignupScreen from '@/components/screens/signup-screen'

const meta = {
  title: 'Screens/Authentication/Signup',
  component: SignupScreen,
  decorators: [
    (Story) => (
      <MobileShell>
        <Story />
      </MobileShell>
    ),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof SignupScreen>

export default meta
type Story = StoryObj<typeof meta>

export const UserPreferences: Story = {
  args: { onDone: () => undefined },
}
