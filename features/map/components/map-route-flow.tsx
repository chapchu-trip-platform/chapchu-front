'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import MapSetupScreen from '@/components/screens/map-setup-screen'
import MapRouteScreen from '@/components/screens/map-route-screen'
import TravelProgressScreen from '@/components/screens/travel-progress-screen'
import TripEndScreen from '@/components/screens/trip-end-screen'
import PostShareSheet from '@/components/screens/post-share-sheet'
import ErrorScreen from '@/components/screens/error-screen'
import { useTravelStore } from '@/features/travel/stores/travel-store'
import { useLocationStore } from '@/features/location/stores/location-store'
import type { ErrorType } from '@/types'

type MapStep = 'setup' | 'route' | 'progress' | 'end'

interface MapRouteFlowProps {
  initialErrorType?: ErrorType
}

export default function MapRouteFlow({ initialErrorType }: MapRouteFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState<MapStep>('setup')
  const [showShareSheet, setShowShareSheet] = useState(false)
  const { draftTripTitle, draftTripImage, selectedPetName, setTravelStage } = useTravelStore()
  const currentPosition = useLocationStore((state) => state.position)
  const locationStatus = useLocationStore((state) => state.status)
  const refreshLocation = useLocationStore((state) => state.refreshLocation)
  const cancelLocationRequest = useLocationStore((state) => state.cancelLocationRequest)

  useEffect(() => {
    if (initialErrorType || step !== 'setup') return
    void refreshLocation()
    return () => cancelLocationRequest()
  }, [cancelLocationRequest, initialErrorType, refreshLocation, step])

  if (initialErrorType) {
    return (
      <ErrorScreen
        type={initialErrorType}
        onBack={() => router.replace('/map')}
        onRetry={() => router.replace('/map')}
        onProceed={() => {
          setTravelStage('planning')
          setStep('route')
          router.replace('/map')
        }}
      />
    )
  }

  if (showShareSheet) {
    return (
      <PostShareSheet
        onClose={() => setShowShareSheet(false)}
        onShare={(post) => {
          setShowShareSheet(false)
          alert(`'${post.title}' 게시글을 공유했습니다.`)
        }}
        tripTitle={draftTripTitle}
        tripImage={draftTripImage}
        petName={selectedPetName}
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
        locationStatus={locationStatus}
        onNext={() => {
          setTravelStage('planning')
          setStep('route')
        }}
      />
    )
  }

  if (step === 'route') {
    return (
      <MapRouteScreen
        onBack={() => setStep('setup')}
        onStartTrip={() => {
          setTravelStage('in-progress')
          setStep('progress')
        }}
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
    <TripEndScreen
      onSave={() => router.push('/album')}
      onShare={() => setShowShareSheet(true)}
    />
  )
}
