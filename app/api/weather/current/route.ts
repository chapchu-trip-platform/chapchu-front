import {
  getCurrentWeather,
  WeatherRequestCapacityError,
  type KmaWeatherLocation,
} from '@/app/api/weather/current/kma-weather.server'

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

function parseLocation(request?: Request): KmaWeatherLocation | undefined {
  if (!request) return undefined
  const url = new URL(request.url)
  const nxValue = url.searchParams.get('nx')
  const nyValue = url.searchParams.get('ny')
  if (nxValue === null && nyValue === null) return undefined
  if (nxValue === null || nyValue === null) throw new Error('Incomplete KMA grid.')

  const gridX = Number(nxValue)
  const gridY = Number(nyValue)
  if (
    !Number.isInteger(gridX) ||
    !Number.isInteger(gridY) ||
    gridX < 1 ||
    gridX > 149 ||
    gridY < 1 ||
    gridY > 253
  ) {
    throw new Error('Invalid KMA grid.')
  }

  return { name: '현재 위치 주변', gridX, gridY }
}

export async function GET(request?: Request) {
  const serviceKey = process.env.KMA_SERVICE_KEY?.trim()

  if (!serviceKey) {
    return Response.json(
      { message: '기상청 날씨 서비스가 아직 설정되지 않았어요.' },
      { status: 503, headers: ERROR_HEADERS }
    )
  }

  let location: KmaWeatherLocation | undefined
  try {
    location = parseLocation(request)
  } catch {
    return Response.json(
      { message: '날씨 위치 정보가 올바르지 않아요.' },
      { status: 400, headers: ERROR_HEADERS }
    )
  }

  try {
    const weather = await getCurrentWeather(serviceKey, location)
    return Response.json(weather, { status: 200, headers: SUCCESS_HEADERS })
  } catch (error) {
    if (error instanceof WeatherRequestCapacityError) {
      return Response.json(
        { message: '날씨 요청이 많아 잠시 후 다시 시도해 주세요.' },
        { status: 503, headers: { ...ERROR_HEADERS, 'Retry-After': '5' } }
      )
    }
    return Response.json(
      { message: '날씨 정보를 잠시 불러오지 못했어요.' },
      { status: 502, headers: ERROR_HEADERS }
    )
  }
}
