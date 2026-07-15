import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import MobileShell from '@/components/layout/mobile-shell'
import LoginScreen from '@/components/screens/login-screen'

const meta = {
  title: 'Screens/Authentication/Login',
  component: LoginScreen,
  decorators: [
    (Story) => (
      <MobileShell>
        <Story />
      </MobileShell>
    ),
  ],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof LoginScreen>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { onLogin: () => undefined },
}
