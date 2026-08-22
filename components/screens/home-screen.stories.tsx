import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import MobileShell from '@/components/layout/mobile-shell'
import HomeScreen from '@/components/screens/home-screen'

const weather = {
  observedAt: '2026-08-22T12:00:00+09:00',
  forecastAt: '2026-08-22T13:00:00+09:00',
  locationName: '대구광역시 수성구',
  latitude: 35.8552083333333,
  longitude: 128.632866666666,
  temperatureC: 27,
  conditionCode: 'CLEAR' as const,
  conditionLabel: '맑음',
  humidityPercent: 58,
  windSpeedMps: 2.4,
  precipitationMm: 0,
  uvIndex: 5,
  walkAdvice: '오늘은 가볍게 걷기 좋은 날이에요.',
  source: '기상청' as const,
}

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
    weather,
    weatherStatus: 'success',
    onRetryWeather: () => undefined,
  },
}
