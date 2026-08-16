import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import MobileShell from '@/components/layout/mobile-shell'
import SignupScreen from '@/components/screens/signup-screen'

const options = {
  regions: [
    { id: 'region-seoul', name: '서울' },
    { id: 'region-jeju', name: '제주' },
  ],
  themes: [
    { id: 'theme-nature', name: '자연' },
    { id: 'theme-healing', name: '힐링' },
  ],
  transportMethods: [
    { id: 'transport-car', name: '자가용' },
    { id: 'transport-walk', name: '도보' },
  ],
  breeds: [
    { id: 7, name: '골든리트리버' },
    { id: 157, name: '믹스견' },
  ],
  activities: [
    { id: 'activity-walk', name: '산책' },
    { id: 'activity-hiking', name: '등산' },
  ],
}

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
  args: { options, onSubmit: async () => undefined },
}
