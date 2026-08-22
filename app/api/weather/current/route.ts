import { getCurrentSuseongWeather } from '@/app/api/weather/current/kma-weather.server'

const SUCCESS_HEADERS = {
  'Cache-Control': 'public, max-age=60, s-maxage=600, stale-while-revalidate=300',
  'X-Content-Type-Options': 'nosniff',
}

const ERROR_HEADERS = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const serviceKey = process.env.KMA_SERVICE_KEY?.trim()

  if (!serviceKey) {
    return Response.json(
      { message: '기상청 날씨 서비스가 아직 설정되지 않았어요.' },
      { status: 503, headers: ERROR_HEADERS }
    )
  }

  try {
    const weather = await getCurrentSuseongWeather(serviceKey)
    return Response.json(weather, { status: 200, headers: SUCCESS_HEADERS })
  } catch {
    return Response.json(
      { message: '날씨 정보를 잠시 불러오지 못했어요.' },
      { status: 502, headers: ERROR_HEADERS }
    )
  }
}
