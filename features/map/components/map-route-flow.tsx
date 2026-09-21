'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import MapSetupScreen from '@/components/screens/map-setup-screen'
import MapRouteOptionsScreen from '@/components/screens/map-route-options-screen'
import MapRouteScreen from '@/components/screens/map-route-screen'
import TravelProgressScreen from '@/components/screens/travel-progress-screen'
import TripEndScreen from '@/components/screens/trip-end-screen'
import PostShareSheet, { type SharedPost } from '@/components/screens/post-share-sheet'
import ErrorScreen from '@/components/screens/error-screen'
import { fetchCourseWeather } from '@/features/map/api/course-weather-api'
import {
  buildCreateCourseRequest,
  createRecommendedCourse,
  fetchActiveCourse,
  getCourseRecommendationErrorMessage,
} from '@/features/map/api/courses-api'
import type { CourseWeatherInput } from '@/features/map/types/course-api'
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
import {
  completeCourse,
  getCourseCompletionErrorMessage,
} from '@/features/travel/api/course-completion-api'
import { useTravelStore } from '@/features/travel/stores/travel-store'
import { useLocationStore } from '@/features/location/stores/location-store'
import type { ErrorType } from '@/types'
import MapFlowPageTransition from '@/features/map/components/map-flow-page-transition'
import { saveAlbumCoverPreference } from '@/features/album/lib/album-cover-preference'

type MapStep = 'setup' | 'options' | 'route' | 'progress' | 'end'

interface MapRouteFlowProps {
  initialErrorType?: ErrorType
}

export default function MapRouteFlow({ initialErrorType }: MapRouteFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<MapStep>('setup')
  const [showShareSheet, setShowShareSheet] = useState(false)
  const [shareReview, setShareReview] = useState('')
  const [shareTitle, setShareTitle] = useState('')
  const [shareCoverPhotoId, setShareCoverPhotoId] = useState<string | null>(null)
  const [boardShared, setBoardShared] = useState(false)
  const [selectablePets, setSelectablePets] = useState<SelectablePet[]>([])
  const [courseWeather, setCourseWeather] = useState<CourseWeatherInput | undefined>()
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
  const courseCreationRequestRef = useRef<AbortController | null>(null)
  const activeCourseRequestRef = useRef<AbortController | null>(null)
  const pedestrianRouteRequestRef = useRef<AbortController | null>(null)
  const {
    draftTripTitle,
    noteDrafts,
    visitedPlaceIds,
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
    resetTravel,
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

  const createCourse = async () => {
    if (
      !routeOrigin ||
      !routeDestination ||
      !selectedPetId ||
      courseCreationStatus === 'loading'
    ) {
      return
    }

    courseCreationRequestRef.current?.abort()
    const controller = new AbortController()
    courseCreationRequestRef.current = controller
    setCourseCreationStatus('loading')
    setCourseCreationError(null)
    setRecommendedCourse(null)
    pedestrianRouteRequestRef.current?.abort()
    setPedestrianRoute(null)
    setPedestrianRouteStatus('idle')

    try {
      let weather: CourseWeatherInput | undefined
      try {
        weather = await fetchCourseWeather(routeDestination, controller.signal)
      } catch {
        if (controller.signal.aborted) return
      }
      setCourseWeather(weather)

      const serverCourse = await createRecommendedCourse(
        buildCreateCourseRequest({
          destination: routeDestination,
          origin: routeOrigin,
          petId: selectedPetId,
          weather,
        }),
        controller.signal
      )
      if (controller.signal.aborted) return
      setRecommendedCourse(serverCourse)
      beginTravelDrafts(serverCourse.id)
      setBoardShared(false)
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
            courseCreationRequestRef.current?.abort()
            setRouteEndpoints(origin, destination)
            setTravelStage('planning')
            setCourseCreationError(null)
            setCourseCreationStatus('idle')
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
          courseCreationRequestRef.current?.abort()
          setCourseCreationError(null)
          setCourseCreationStatus('idle')
          setStep('setup')
        }}
        onPetSelect={(petId) => {
          courseCreationRequestRef.current?.abort()
          courseCreationRequestRef.current = null
          const pet = selectablePets.find((item) => item.id === petId) ?? null
          setSelectedPet(pet)
          setCourseCreationError(null)
          setCourseCreationStatus('idle')
          setCourseWeather(undefined)
        }}
        onCreateCourse={() => void createCourse()}
        origin={routeOrigin}
        petLoadStatus={petLoadStatus}
        pets={selectablePets}
        courseCreationError={courseCreationError}
        courseCreationStatus={courseCreationStatus}
        selectedPetId={selectedPetId}
        minimumWalkingTimeSeconds={minimumWalkingTimeSeconds}
        minimumWalkingTimeStatus={minimumWalkingTimeStatus}
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
          setCourseCreationError(null)
          setCourseCreationStatus('idle')
          setStep('options')
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
          resetTravel()
          router.push('/home')
        }}
        onLeave={() => router.push('/home')}
        />
      </MapFlowPageTransition>
    )
  }

  const saveAlbum = async (review: string, coverPhotoId: string | null) => {
    if (!recommendedCourse || !selectedPetId) {
      throw new Error('여행 코스와 반려동물 정보를 확인하지 못했습니다.')
    }
    const visitedPlaceIdSet = new Set(visitedPlaceIds)
    const incompleteDraft = noteDrafts.find(
      (draft) =>
        visitedPlaceIdSet.has(draft.waypointId) &&
        !draft.reviewId &&
        (draft.content.trim() || (draft.rating ?? 0) > 0) &&
        (!draft.content.trim() || (draft.rating ?? 0) < 1)
    )
    if (incompleteDraft) {
      throw new Error('장소별 후기는 내용과 별점을 모두 입력해주세요.')
    }

    try {
      for (const draft of noteDrafts) {
        if (
          draft.reviewId ||
          !visitedPlaceIdSet.has(draft.waypointId) ||
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
    } catch (error: unknown) {
      throw new Error(getTravelReviewErrorMessage(error))
    }

    try {
      // Complete only after every place review has been persisted. This keeps
      // a partially failed save recoverable instead of closing the course first.
      await completeCourse(recommendedCourse.id)
    } catch (error: unknown) {
      throw new Error(getCourseCompletionErrorMessage(error))
    }

    setOverallReview(review)
    const availablePhotoIds = new Set(
      noteDrafts.flatMap((draft) => (draft.photos ?? []).map((photo) => photo.photoId))
    )
    saveAlbumCoverPreference(
      recommendedCourse.id,
      coverPhotoId && availablePhotoIds.has(coverPhotoId) ? coverPhotoId : null
    )
    // The completed course is now persisted on the server. Clear the in-memory
    // planning state so a later map visit starts with empty location inputs.
    resetTravel()
    router.push('/album')
  }

  const sharePhotos = noteDrafts.flatMap((draft) => {
    const placeName = recommendedCourse?.places.find(
      (place) => place.id === draft.waypointId
    )?.name ?? '여행 장소'
    return (draft.photos ?? []).map((photo) => ({ ...photo, placeName }))
  })

  const shareTripReview = async (post: SharedPost) => {
    try {
      await createTripPost({
        title: post.title,
        content: post.content,
        petId: selectedPetId,
        courseId: recommendedCourse?.id,
        coverPhotoUrl: post.image,
        takenAt: recommendedCourse?.travelDate,
      })
      setBoardShared(true)
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
          weather={courseWeather}
          initialReview={overallReview}
          isBoardShared={boardShared}
          onReviewChange={setOverallReview}
          onSave={saveAlbum}
          onShare={(review, coverPhotoId, title) => {
            setOverallReview(review)
            setShareReview(review)
            setShareTitle(title)
            setShareCoverPhotoId(coverPhotoId)
            setShowShareSheet(true)
          }}
        />
        {showShareSheet && (
          <PostShareSheet
            onClose={() => setShowShareSheet(false)}
            onShare={shareTripReview}
            tripTitle={shareTitle || draftTripTitle}
            photos={sharePhotos}
            initialPhotoId={shareCoverPhotoId}
            petName={selectedPetName}
            tripReview={shareReview}
            variant="travel-review"
            course={recommendedCourse}
            weather={courseWeather}
          />
        )}
      </div>
    </MapFlowPageTransition>
  )
}
