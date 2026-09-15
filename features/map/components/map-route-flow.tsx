'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import MapSetupScreen from '@/components/screens/map-setup-screen'
import MapRouteOptionsScreen, {
  type PlaceRecommendationStatus,
} from '@/components/screens/map-route-options-screen'
import MapPlaceSelectionScreen from '@/components/screens/map-place-selection-screen'
import MapRouteScreen from '@/components/screens/map-route-screen'
import TravelProgressScreen from '@/components/screens/travel-progress-screen'
import TripEndScreen from '@/components/screens/trip-end-screen'
import PostShareSheet from '@/components/screens/post-share-sheet'
import ErrorScreen from '@/components/screens/error-screen'
import { fetchCourseWeather } from '@/features/map/api/course-weather-api'
import {
  buildCreateCourseRequest,
  createRecommendedCourse,
  fetchActiveCourse,
  getCourseRecommendationErrorMessage,
} from '@/features/map/api/courses-api'
import {
  buildRecommendedPlacesRequest,
  fetchRecommendedPlaces,
  getPlaceRecommendationErrorMessage,
} from '@/features/map/api/recommended-places-api'
import type { CourseWeatherInput } from '@/features/map/types/course-api'
import type { RecommendedPlace } from '@/features/map/types/recommended-place'
import {
  getSelectedRecommendedPlace,
  toggleRecommendedPlaceSelection,
} from '@/features/map/lib/recommended-place-selection'
import { formatLocalTravelDate } from '@/features/map/lib/travel-date'
import {
  fetchSelectablePets,
  type SelectablePet,
} from '@/features/profile/api/pets-api'
import {
  getMinimumWalkingTimeSeconds,
  getPedestrianRoute,
  type PedestrianRoute,
} from '@/features/map/api/walking-time-api'
import {
  createTravelReview,
  getTravelReviewErrorMessage,
} from '@/features/travel/api/travel-reviews-api'
import {
  createTripPost,
  getTripPostErrorMessage,
} from '@/features/community/api/posts-api'
import { completeCourse } from '@/features/travel/api/course-completion-api'
import { useTravelStore } from '@/features/travel/stores/travel-store'
import { useLocationStore } from '@/features/location/stores/location-store'
import type { ErrorType } from '@/types'
import MapFlowPageTransition from '@/features/map/components/map-flow-page-transition'

type MapStep = 'setup' | 'options' | 'places' | 'route' | 'progress' | 'end'

interface MapRouteFlowProps {
  initialErrorType?: ErrorType
}

export default function MapRouteFlow({ initialErrorType }: MapRouteFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<MapStep>('setup')
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [shareReview, setShareReview] = useState('')
  const [recommendationStatus, setRecommendationStatus] =
    useState<PlaceRecommendationStatus>('idle')
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  const [recommendedPlaces, setRecommendedPlaces] = useState<RecommendedPlace[]>([])
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null)
  const [courseWeather, setCourseWeather] = useState<CourseWeatherInput | undefined>()
  const [selectablePets, setSelectablePets] = useState<SelectablePet[]>([])
  const [petLoadStatus, setPetLoadStatus] = useState<'loading' | 'success' | 'error'>(
    'loading'
  )
  const [minimumWalkingTimeSeconds, setMinimumWalkingTimeSeconds] = useState<number | null>(
    null
  )
  const [minimumWalkingTimeStatus, setMinimumWalkingTimeStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [courseCreationStatus, setCourseCreationStatus] = useState<
    'idle' | 'loading' | 'error'
  >('idle')
  const [courseCreationError, setCourseCreationError] = useState<string | null>(null)
  const [pedestrianRoute, setPedestrianRoute] = useState<PedestrianRoute | null>(null)
  const [pedestrianRouteStatus, setPedestrianRouteStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const recommendationRequestRef = useRef<AbortController | null>(null)
  const courseCreationRequestRef = useRef<AbortController | null>(null)
  const activeCourseRequestRef = useRef<AbortController | null>(null)
  const pedestrianRouteRequestRef = useRef<AbortController | null>(null)
  const {
    draftTripTitle,
    draftTripImage,
    noteDrafts,
    overallReview,
    recommendedCourse,
    routeDestination,
    routeOrigin,
    selectedPetId,
    selectedPetName,
    setRouteEndpoints,
    setRecommendedCourse,
    setSelectedPet,
    setOverallReview,
    beginTravelDrafts,
    markReviewSaved,
    setTravelStage,
  } = useTravelStore()
  const currentPosition = useLocationStore((state) => state.position)
  const locationStatus = useLocationStore((state) => state.status)
  const refreshLocation = useLocationStore((state) => state.refreshLocation)
  const cancelLocationRequest = useLocationStore((state) => state.cancelLocationRequest)
  const displayedStep = step

  useEffect(() => {
    if (initialErrorType || displayedStep !== 'setup') return
    void refreshLocation()
    return () => cancelLocationRequest()
  }, [cancelLocationRequest, displayedStep, initialErrorType, refreshLocation])

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
      courseCreationRequestRef.current?.abort()
      activeCourseRequestRef.current?.abort()
      pedestrianRouteRequestRef.current?.abort()
    },
    []
  )

  useEffect(() => {
    if (initialErrorType) return

    const controller = new AbortController()
    activeCourseRequestRef.current = controller

    void fetchActiveCourse(controller.signal)
      .then((activeCourse) => {
        if (controller.signal.aborted) return
        if (activeCourse) {
          setRecommendedCourse(activeCourse)
          setTravelStage('in-progress')
          setStep('progress')
        }
      })
      .catch(() => {
        // A failed resume check should not prevent starting a new trip.
      })
      .finally(() => {
        if (activeCourseRequestRef.current === controller) {
          activeCourseRequestRef.current = null
        }
      })

    return () => controller.abort()
  }, [initialErrorType, setRecommendedCourse, setTravelStage])

  useEffect(() => {
    if (initialErrorType || displayedStep !== 'options' || !routeOrigin || !routeDestination) {
      return
    }

    const controller = new AbortController()

    void getMinimumWalkingTimeSeconds(routeOrigin, routeDestination, controller.signal)
      .then((totalTimeSeconds) => {
        if (controller.signal.aborted) return
        setMinimumWalkingTimeSeconds(totalTimeSeconds)
        setMinimumWalkingTimeStatus('success')
      })
      .catch(() => {
        if (controller.signal.aborted) return
        setMinimumWalkingTimeSeconds(null)
        setMinimumWalkingTimeStatus('error')
      })

    return () => controller.abort()
  }, [displayedStep, initialErrorType, routeDestination, routeOrigin])

  const requestRecommendedPlaces = async () => {
    if (
      !routeDestination ||
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
    setRecommendedPlaces([])
    setSelectedPlaceId(null)
    setCourseWeather(undefined)
    pedestrianRouteRequestRef.current?.abort()
    setPedestrianRoute(null)
    setPedestrianRouteStatus('idle')
    setRecommendationError(null)
    setRecommendationStatus('loading')

    try {
      let weather: CourseWeatherInput | undefined
      try {
        weather = await fetchCourseWeather(routeDestination, controller.signal)
      } catch {
        if (controller.signal.aborted) return
      }

      const places = await fetchRecommendedPlaces(
        buildRecommendedPlacesRequest({
          destination: routeDestination,
          petId: selectedPetId,
          weather,
        }),
        controller.signal
      )
      if (controller.signal.aborted) return
      setCourseWeather(weather)

      if (places.length === 0) {
        setRecommendationStatus('empty')
        return
      }

      setRecommendedPlaces(places)
      setRecommendationStatus('success')
      setStep('places')
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      setRecommendationError(getPlaceRecommendationErrorMessage(error))
      setRecommendationStatus('error')
    } finally {
      if (recommendationRequestRef.current === controller) {
        recommendationRequestRef.current = null
      }
    }
  }

  const createCourseFromSelection = async () => {
    if (
      !routeOrigin ||
      !selectedPetId ||
      courseCreationStatus === 'loading'
    ) {
      return
    }

    const destination = getSelectedRecommendedPlace(
      recommendedPlaces,
      selectedPlaceId
    )
    if (!destination) return

    courseCreationRequestRef.current?.abort()
    const controller = new AbortController()
    courseCreationRequestRef.current = controller
    setCourseCreationStatus('loading')
    setCourseCreationError(null)

    try {
      const serverCourse = await createRecommendedCourse(
        buildCreateCourseRequest({
          destination,
          origin: routeOrigin,
          petId: selectedPetId,
          weather: courseWeather,
        }),
        controller.signal
      )
      if (controller.signal.aborted) return
      setRecommendedCourse(serverCourse)
      beginTravelDrafts(serverCourse.id)
      setCourseCreationStatus('idle')
      setStep('route')

      const orderedPlaces = [...serverCourse.places].sort(
        (left, right) => left.visitOrder - right.visitOrder
      )
      const finalDestination = orderedPlaces.find((place) => place.isFinal) ?? orderedPlaces.at(-1)
      if (finalDestination) {
        pedestrianRouteRequestRef.current?.abort()
        const routeController = new AbortController()
        pedestrianRouteRequestRef.current = routeController
        setPedestrianRoute(null)
        setPedestrianRouteStatus('loading')
        void getPedestrianRoute(
          routeOrigin,
          finalDestination,
          orderedPlaces.filter((place) => place.id !== finalDestination.id),
          routeController.signal
        )
          .then((route) => {
            if (routeController.signal.aborted) return
            if (route.path.length < 2) {
              setPedestrianRouteStatus('error')
              return
            }
            setPedestrianRoute(route)
            setPedestrianRouteStatus('success')
          })
          .catch(() => {
            if (routeController.signal.aborted) return
            setPedestrianRoute(null)
            setPedestrianRouteStatus('error')
          })
          .finally(() => {
            if (pedestrianRouteRequestRef.current === routeController) {
              pedestrianRouteRequestRef.current = null
            }
          })
      } else {
        setPedestrianRoute(null)
        setPedestrianRouteStatus('error')
      }
    } catch (error: unknown) {
      if (controller.signal.aborted) return
      setCourseCreationStatus('error')
      setCourseCreationError(getCourseRecommendationErrorMessage(error))
    } finally {
      if (courseCreationRequestRef.current === controller) {
        courseCreationRequestRef.current = null
      }
    }
  }

  if (initialErrorType) {
    return (
      <MapFlowPageTransition step="error">
        <ErrorScreen
          type={initialErrorType}
          onBack={() => router.replace('/map')}
          onRetry={() => router.replace('/map')}
          onProceed={() => {
            setTravelStage('idle')
            router.replace('/map')
          }}
        />
      </MapFlowPageTransition>
    )
  }

  if (displayedStep === 'setup') {
    return (
      <MapFlowPageTransition step="setup">
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
            setRecommendedPlaces([])
            setSelectedPlaceId(null)
            setCourseWeather(undefined)
            pedestrianRouteRequestRef.current?.abort()
            setPedestrianRoute(null)
            setPedestrianRouteStatus('idle')
            setMinimumWalkingTimeSeconds(null)
            setMinimumWalkingTimeStatus('loading')
            setStep('options')
          }}
        />
      </MapFlowPageTransition>
    )
  }

  if (
    displayedStep === 'options' &&
    routeOrigin &&
    routeDestination
  ) {
    return (
      <MapFlowPageTransition step="options">
        <MapRouteOptionsScreen
        destination={routeDestination}
        onBack={() => {
          recommendationRequestRef.current?.abort()
          setRecommendationError(null)
          setRecommendationStatus('idle')
          setStep('setup')
        }}
        onPetSelect={(petId) => {
          recommendationRequestRef.current?.abort()
          recommendationRequestRef.current = null
          const pet = selectablePets.find((item) => item.id === petId) ?? null
          setSelectedPet(pet)
          setRecommendationError(null)
          setRecommendationStatus('idle')
          setRecommendedPlaces([])
          setSelectedPlaceId(null)
          setCourseWeather(undefined)
        }}
        onRecommend={() => void requestRecommendedPlaces()}
        origin={routeOrigin}
        petLoadStatus={petLoadStatus}
        pets={selectablePets}
        recommendationError={recommendationError}
        recommendationStatus={recommendationStatus}
        selectedPetId={selectedPetId}
        minimumWalkingTimeSeconds={minimumWalkingTimeSeconds}
        minimumWalkingTimeStatus={minimumWalkingTimeStatus}
        />
      </MapFlowPageTransition>
    )
  }

  if (displayedStep === 'places' && routeDestination && recommendedPlaces.length > 0) {
    return (
      <MapFlowPageTransition step="places">
        <MapPlaceSelectionScreen
        courseCreationError={courseCreationError}
        destinationArea={routeDestination}
        isCreatingCourse={courseCreationStatus === 'loading'}
        origin={routeOrigin ?? undefined}
        onBack={() => {
          recommendationRequestRef.current?.abort()
          setRecommendedPlaces([])
          setSelectedPlaceId(null)
          setCourseCreationError(null)
          setCourseCreationStatus('idle')
          setRecommendationError(null)
          setRecommendationStatus('idle')
          setMinimumWalkingTimeSeconds(null)
          setMinimumWalkingTimeStatus('loading')
          setStep('options')
        }}
        onConfirm={() => void createCourseFromSelection()}
        onToggle={(placeId) => {
          setSelectedPlaceId((current) =>
            toggleRecommendedPlaceSelection(current, placeId)
          )
          setCourseCreationError(null)
          setCourseCreationStatus('idle')
        }}
        places={recommendedPlaces}
        selectedPlaceId={selectedPlaceId}
        travelDate={formatLocalTravelDate(new Date())}
        />
      </MapFlowPageTransition>
    )
  }

  if (displayedStep === 'route' && recommendedCourse) {
    return (
      <MapFlowPageTransition step="route">
        <MapRouteScreen
        course={recommendedCourse}
        destination={routeDestination}
        onBack={() => {
          pedestrianRouteRequestRef.current?.abort()
          setPedestrianRoute(null)
          setPedestrianRouteStatus('idle')
          setStep('places')
        }}
        onStartTrip={() => {
          setTravelStage('in-progress')
          setStep('progress')
        }}
        origin={routeOrigin}
        pedestrianRoute={pedestrianRoute}
        pedestrianRouteStatus={pedestrianRouteStatus}
        />
      </MapFlowPageTransition>
    )
  }

  if (displayedStep === 'progress') {
    return (
      <MapFlowPageTransition step="progress">
        <TravelProgressScreen
        course={recommendedCourse ?? {
          id: '',
          travelDate: formatLocalTravelDate(new Date()),
          startLocation: routeOrigin?.name ?? '',
          endLocation: routeDestination?.name ?? '',
          places: [],
        }}
        routePath={pedestrianRoute?.path ?? []}
        petName={selectedPetName}
        onEndTrip={() => {
          setTravelStage('completed')
          setStep('end')
        }}
        onAbort={() => {
          setTravelStage('idle')
          router.push('/home')
        }}
        />
      </MapFlowPageTransition>
    )
  }

  const saveAlbum = async (review: string) => {
    if (!recommendedCourse || !selectedPetId) {
      throw new Error('여행 코스와 반려동물 정보를 확인하지 못했습니다.')
    }
    if (!noteDrafts.some((draft) => (draft.photos?.length ?? 0) > 0)) {
      throw new Error('앨범을 만들려면 여행 사진을 한 장 이상 저장해주세요.')
    }

    const incompleteDraft = noteDrafts.find(
      (draft) =>
        !draft.reviewId &&
        (draft.content.trim() || (draft.rating ?? 0) > 0) &&
        (!draft.content.trim() || (draft.rating ?? 0) < 1)
    )
    if (incompleteDraft) {
      throw new Error('장소별 후기는 내용과 별점을 모두 입력해주세요.')
    }

    try {
      await completeCourse(recommendedCourse.id)
      for (const draft of noteDrafts) {
        if (
          draft.reviewId ||
          !draft.externalPlaceId ||
          !draft.content.trim() ||
          (draft.rating ?? 0) < 1
        ) {
          continue
        }
        const created = await createTravelReview({
          coursePlaceId: draft.waypointId,
          placeId: draft.externalPlaceId,
          petId: selectedPetId,
          rating: draft.rating ?? 0,
          contents: draft.content,
          photoIds: (draft.photos ?? []).map((photo) => photo.photoId),
        })
        markReviewSaved(draft.waypointId, created.reviewId)
      }
      setOverallReview(review)
      router.push('/album')
    } catch (error: unknown) {
      throw new Error(getTravelReviewErrorMessage(error))
    }
  }

  const shareCoverPhoto = noteDrafts.find(
    (draft) => (draft.photos?.length ?? 0) > 0
  )?.photos?.[0]?.downloadUrl
  const tripImage = shareCoverPhoto ?? draftTripImage

  const shareTripReview = async (post: { title: string; content: string }) => {
    try {
      await createTripPost({
        title: post.title,
        content: post.content,
        petId: selectedPetId,
        courseId: recommendedCourse?.id,
        coverPhotoUrl: shareCoverPhoto,
        takenAt: recommendedCourse?.travelDate,
      })
    } catch (error: unknown) {
      throw new Error(getTripPostErrorMessage(error))
    }
  }

  return (
    <MapFlowPageTransition step="end">
      <div className="relative flex flex-1 overflow-hidden">
        <TripEndScreen
          course={recommendedCourse}
          petName={selectedPetName}
          noteDrafts={noteDrafts}
          initialReview={overallReview}
          onReviewChange={setOverallReview}
          onSave={saveAlbum}
          onShare={(review) => {
            setOverallReview(review)
            setShareReview(review)
            setShowShareSheet(true)
          }}
        />
        {showShareSheet && (
          <PostShareSheet
            onClose={() => setShowShareSheet(false)}
            onShare={shareTripReview}
            tripTitle={draftTripTitle}
            tripImage={tripImage}
            petName={selectedPetName}
            tripReview={shareReview}
          />
        )}
      </div>
    </MapFlowPageTransition>
  )
}
