'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import MapSetupScreen from '@/components/screens/map-setup-screen'
import MapRouteScreen from '@/components/screens/map-route-screen'
import TravelProgressScreen from '@/components/screens/travel-progress-screen'
import TripEndScreen from '@/components/screens/trip-end-screen'
import PostShareSheet from '@/components/screens/post-share-sheet'
import { useTravelStore } from '@/features/travel/stores/travel-store'

type MapStep = 'setup' | 'route' | 'progress' | 'end'

export default function MapRouteFlow() {
  const router = useRouter()
  const [step, setStep] = useState<MapStep>('setup')
  const [showShareSheet, setShowShareSheet] = useState(false)
  const { draftTripTitle, draftTripImage, selectedPetName, setTravelStage } = useTravelStore()

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
