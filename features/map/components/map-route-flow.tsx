'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import MapSetupScreen from '@/components/screens/map-setup-screen'
import MapRouteOptionsScreen, {
  type CourseRecommendationStatus,
} from '@/components/screens/map-route-options-screen'
import MapRouteScreen from '@/components/screens/map-route-screen'
import TravelProgressScreen from '@/components/screens/travel-progress-screen'
import TripEndScreen from '@/components/screens/trip-end-screen'
import PostShareSheet from '@/components/screens/post-share-sheet'
import ErrorScreen from '@/components/screens/error-screen'
import {
  buildCreateCourseRequest,
  createRecommendedCourse,
  getCourseRecommendationErrorMessage,
  isNoPlacesFoundCourseError,
} from '@/features/map/api/courses-api'
import { useTravelStore } from '@/features/travel/stores/travel-store'
import { useLocationStore } from '@/features/location/stores/location-store'
import type { ErrorType } from '@/types'

type MapStep = 'setup' | 'options' | 'route' | 'progress' | 'end'

interface MapRouteFlowProps {
  initialErrorType?: ErrorType
}

export default function MapRouteFlow({ initialErrorType }: MapRouteFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<MapStep>('setup')
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [shareReview, setShareReview] = useState('')
  const [recommendationStatus, setRecommendationStatus] =
    useState<CourseRecommendationStatus>('idle')
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const recommendationRequestRef = useRef<AbortController | null>(null)
  const {
    draftTripTitle,
    draftTripImage,
    minimumWalkingTimeHours,
    recommendedCourse,
    routeDestination,
    routeOrigin,
    selectedPetName,
    setRouteEndpoints,
    setRouteOptions,
    setRecommendedCourse,
    setTravelStage,
    travelTimeHours,
    waypointCount,
  } = useTravelStore()
  const currentPosition = useLocationStore((state) => state.position)
  const locationStatus = useLocationStore((state) => state.status)
  const refreshLocation = useLocationStore((state) => state.refreshLocation)
  const cancelLocationRequest = useLocationStore((state) => state.cancelLocationRequest)

  useEffect(() => {
    if (initialErrorType || step !== 'setup') return
    void refreshLocation()
    return () => cancelLocationRequest()
  }, [cancelLocationRequest, initialErrorType, refreshLocation, step])

  useEffect(
    () => () => {
      recommendationRequestRef.current?.abort()
    },
    []
  )

  const requestRecommendedCourse = async () => {
    if (!routeOrigin || recommendationStatus === 'loading') return

    recommendationRequestRef.current?.abort()
    const controller = new AbortController()
    recommendationRequestRef.current = controller
    setRecommendedCourse(null)
    setRecommendationError(null)
    setRecommendationStatus('loading')

    try {
      const course = await createRecommendedCourse(
        buildCreateCourseRequest(routeOrigin),
        controller.signal
      )
      if (controller.signal.aborted) return

      if (course.places.length === 0) {
        setRecommendationStatus('empty')
        return
      }

      setRecommendedCourse(course)
      setRecommendationStatus('success')
      setStep('route')
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      if (isNoPlacesFoundCourseError(error)) {
        setRecommendationStatus('empty')
        return
      }
      setRecommendationError(getCourseRecommendationErrorMessage(error))
      setRecommendationStatus('error')
    } finally {
      if (recommendationRequestRef.current === controller) {
        recommendationRequestRef.current = null
      }
    }
  }

  if (initialErrorType) {
    return (
      <ErrorScreen
        type={initialErrorType}
        onBack={() => router.replace('/map')}
        onRetry={() => router.replace('/map')}
        onProceed={() => {
          setTravelStage('idle')
          router.replace('/map')
        }}
      />
    )
  }

  if (step === 'setup') {
    return (
      <MapSetupScreen
        onBack={() => router.push('/home')}
        currentLocation={
          currentPosition
            ? { lat: currentPosition.latitude, lng: currentPosition.longitude }
            : undefined
        }
        initialDestination={routeDestination}
        initialOrigin={routeOrigin}
        locationStatus={locationStatus}
        onNext={(origin, destination) => {
          recommendationRequestRef.current?.abort()
          setRouteEndpoints(origin, destination)
          setTravelStage('planning')
          setRecommendationError(null)
          setRecommendationStatus('idle')
          setStep('options')
        }}
      />
    )
  }

  if (
    (step === 'options' || (step === 'route' && !recommendedCourse)) &&
    routeOrigin &&
    routeDestination
  ) {
    return (
      <MapRouteOptionsScreen
        destination={routeDestination}
        minimumWalkingTimeHours={minimumWalkingTimeHours}
        onBack={() => {
          recommendationRequestRef.current?.abort()
          setRecommendationError(null)
          setRecommendationStatus('idle')
          setStep('setup')
        }}
        onOptionsChange={setRouteOptions}
        onRecommend={() => void requestRecommendedCourse()}
        origin={routeOrigin}
        recommendationError={recommendationError}
        recommendationStatus={recommendationStatus}
        travelTimeHours={travelTimeHours}
        waypointCount={waypointCount}
      />
    )
  }

  if (step === 'route' && recommendedCourse) {
    return (
      <MapRouteScreen
        course={recommendedCourse}
        destination={routeDestination}
        onBack={() => {
          setRecommendedCourse(null)
          setRecommendationStatus('idle')
          setStep('options')
        }}
        onStartTrip={() => {
          setTravelStage('in-progress')
          setStep('progress')
        }}
        origin={routeOrigin}
      />
    )
  }

  if (step === 'progress') {
    return (
      <TravelProgressScreen
        onEndTrip={() => {
          setTravelStage('completed')
          setStep('end')
        }}
        onAbort={() => {
          setTravelStage('idle')
          router.push('/home')
        }}
      />
    )
  }

  return (
    <div className="relative flex flex-1 overflow-hidden">
      <TripEndScreen
        onSave={() => router.push('/album')}
        onShare={(review) => {
          setShareReview(review)
          setShowShareSheet(true)
        }}
      />
      {showShareSheet && (
        <PostShareSheet
          onClose={() => setShowShareSheet(false)}
          onShare={(post) => {
            void post
          }}
          tripTitle={draftTripTitle}
          tripImage={draftTripImage}
          petName={selectedPetName}
          tripReview={shareReview}
        />
      )}
    </div>
  )
}
