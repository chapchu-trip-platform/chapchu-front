import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import MobileShell from '@/components/layout/mobile-shell'
import HomeScreen from '@/components/screens/home-screen'

const weather = {
  observedAt: '2026-08-22T12:00:00+09:00',
  forecastAt: '2026-08-22T13:00:00+09:00',
  locationName: '대구광역시 수성구',
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
    onViewAllPosts: () => undefined,
    mapCenter: { lat: 35.8552, lng: 128.6329 },
    mapLocationLabel: '현재 위치',
    locationStatus: 'success',
    petNames: ['루이', '바다'],
    petNamesStatus: 'success',
    hotPosts: [
      {
        id: 'post-1',
        title: '반려견과 함께한 첫추 여행기',
        content: '따뜻한 날씨에 가까운 산책로를 다녀왔어요.',
        viewCount: 320,
        recommendationCount: 48,
        createdAt: '2026-08-26T05:00:00Z',
        hasPhoto: false,
      },
    ],
    hotPostsStatus: 'success',
    onRetryHotPosts: () => undefined,
    weather,
    weatherStatus: 'success',
    onRetryWeather: () => undefined,
  },
}
