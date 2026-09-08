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
import { fetchCourseWeather } from '@/features/map/api/course-weather-api'
import {
  fetchSelectablePets,
  type SelectablePet,
} from '@/features/profile/api/pets-api'
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
  const [selectablePets, setSelectablePets] = useState<SelectablePet[]>([])
  const [petLoadStatus, setPetLoadStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  )
  const recommendationRequestRef = useRef<AbortController | null>(null)
  const {
    draftTripTitle,
    draftTripImage,
    recommendedCourse,
    routeDestination,
    routeOrigin,
    selectedPetId,
    selectedPetName,
    setRouteEndpoints,
    setRouteOptions,
    setRecommendedCourse,
    setSelectedPet,
    setTravelStage,
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

  useEffect(() => {
    if (initialErrorType) return
    const controller = new AbortController()

    void fetchSelectablePets(controller.signal)
      .then((pets) => {
        if (controller.signal.aborted) return
        setSelectablePets(pets)
        const currentPetId = useTravelStore.getState().selectedPetId
        const selectedPet = pets.find((pet) => pet.id === currentPetId) ?? pets[0] ?? null
        setSelectedPet(selectedPet)
        setPetLoadStatus('success')
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setSelectablePets([])
        setSelectedPet(null)
        setPetLoadStatus('error')
      })

    return () => controller.abort()
  }, [initialErrorType, setSelectedPet])

  useEffect(
    () => () => {
      recommendationRequestRef.current?.abort()
    },
    []
  )

  const requestRecommendedCourse = async () => {
    if (
      !routeOrigin ||
      !routeDestination ||
      waypointCount === null ||
      recommendationStatus === 'loading'
    ) {
      return
    }
    if (!selectedPetId) {
      setRecommendationError(
        petLoadStatus === 'loading'
          ? '반려동물 정보를 확인하고 있습니다. 잠시 후 다시 시도해주세요.'
          : petLoadStatus === 'error'
            ? '반려동물 정보를 불러오지 못했습니다. 다시 로그인한 뒤 시도해주세요.'
            : '등록된 반려동물이 없습니다. 반려동물을 등록한 뒤 다시 시도해주세요.'
      )
      setRecommendationStatus('error')
      return
    }

    recommendationRequestRef.current?.abort()
    const controller = new AbortController()
    recommendationRequestRef.current = controller
    setRecommendedCourse(null)
    setRecommendationError(null)
    setRecommendationStatus('loading')

    try {
      let weather
      try {
        weather = await fetchCourseWeather(routeOrigin, controller.signal)
      } catch {
        if (controller.signal.aborted) return
      }

      const course = await createRecommendedCourse(
        buildCreateCourseRequest({
          destination: routeDestination,
          intermediateStopCount: waypointCount,
          origin: routeOrigin,
          petId: selectedPetId,
          weather,
        }),
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
        onBack={() => {
          recommendationRequestRef.current?.abort()
          setRecommendationError(null)
          setRecommendationStatus('idle')
          setStep('setup')
        }}
        onOptionsChange={setRouteOptions}
        onPetSelect={(petId) => {
          recommendationRequestRef.current?.abort()
          recommendationRequestRef.current = null
          const pet = selectablePets.find((item) => item.id === petId) ?? null
          setSelectedPet(pet)
          setRecommendationError(null)
          setRecommendationStatus('idle')
        }}
        onRecommend={() => void requestRecommendedCourse()}
        origin={routeOrigin}
        petLoadStatus={petLoadStatus}
        pets={selectablePets}
        recommendationError={recommendationError}
        recommendationStatus={recommendationStatus}
        selectedPetId={selectedPetId}
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
