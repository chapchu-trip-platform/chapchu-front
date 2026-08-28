import MapRouteFlow from '@/features/map/components/map-route-flow'
import type { ErrorType } from '@/types'

interface MapPageProps {
  searchParams: Promise<{
    error?: string | string[]
  }>
}

const mapErrorTypes = new Set<ErrorType>([
  'location-denied',
  'location-request',
  'weather-failed',
  'no-routes',
  'no-places',
])

export default async function MapPage({ searchParams }: MapPageProps) {
  const params = await searchParams
  const errorParam = Array.isArray(params.error) ? params.error[0] : params.error
  const initialErrorType = errorParam && mapErrorTypes.has(errorParam as ErrorType)
    ? errorParam as ErrorType
    : undefined

  return <MapRouteFlow initialErrorType={initialErrorType} />
}
