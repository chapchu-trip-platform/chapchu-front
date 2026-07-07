'use client'

import { useState, useCallback } from 'react'

import MobileShell from '@/components/mobile-shell'
import BottomNav, { NavTab } from '@/components/bottom-nav'

import SplashScreen from '@/components/screens/splash-screen'
import OnboardingScreen from '@/components/screens/onboarding-screen'
import LoginScreen from '@/components/screens/login-screen'
import SignupScreen from '@/components/screens/signup-screen'
import HomeScreen from '@/components/screens/home-screen'
import CommunityScreen from '@/components/screens/community-screen'
import MapSetupScreen from '@/components/screens/map-setup-screen'
import MapRouteScreen from '@/components/screens/map-route-screen'
import TravelProgressScreen from '@/components/screens/travel-progress-screen'
import TripEndScreen from '@/components/screens/trip-end-screen'
import AlbumScreen from '@/components/screens/album-screen'
import ProfileScreen from '@/components/screens/profile-screen'
import ErrorScreen from '@/components/screens/error-screen'
import PostShareSheet from '@/components/screens/post-share-sheet'
import ProfileSettings from '@/components/screens/profile-settings-screens'

type AppScreen = 'splash' | 'onboarding' | 'login' | 'signup' | 'main'
type MapFlow = null | 'setup' | 'route' | 'progress' | 'end' | 'error' | 'sharing'
type ProfileTab = null | 'settings' | 'nickname' | 'info' | 'posts' | 'wishlist' | 'bookmarks'

export default function Page() {
  const [screen, setScreen] = useState<AppScreen>('splash')
  const [activeTab, setActiveTab] = useState<NavTab>('home')
  const [mapFlow, setMapFlow] = useState<MapFlow>(null)
  const [errorType, setErrorType] = useState<'location-denied' | 'location-request' | 'weather-failed' | 'no-routes' | 'no-places' | 'upload-failed' | 'session-expired' | null>(null)
  const [showPostShare, setShowPostShare] = useState(false)
  const [showProfileSettings, setShowProfileSettings] = useState<ProfileTab>(null)
  const [tripTitle, setTripTitle] = useState('골든이와의 서울 성수 여행')
  const [tripImage, setTripImage] = useState('/images/album-cover.png')
  const [petName, setPetName] = useState('골든이')

  const handleTabChange = useCallback((tab: NavTab) => {
    if (tab === 'map') {
      setMapFlow('setup')
      return
    }
    setActiveTab(tab)
    setMapFlow(null)
  }, [])

  const handleStartTrip = useCallback(() => {
    setMapFlow('setup')
  }, [])

  const showBottomNav = screen === 'main' && mapFlow === null

  return (
    <MobileShell>
      {/* Splash */}
      {screen === 'splash' && (
        <SplashScreen onDone={() => setScreen('onboarding')} />
      )}

      {/* Onboarding */}
      {screen === 'onboarding' && (
        <OnboardingScreen onDone={() => setScreen('login')} />
      )}

      {/* Login */}
      {screen === 'login' && (
        <LoginScreen
          onLogin={() => {
            setScreen('signup')
          }}
        />
      )}

      {/* Signup */}
      {screen === 'signup' && (
        <SignupScreen
          onDone={() => {
            setScreen('main')
            setActiveTab('home')
          }}
        />
      )}

      {/* Main App */}
      {screen === 'main' && (
        <>
          {/* Error overlay */}
          {mapFlow === 'error' && errorType && (
            <ErrorScreen
              type={errorType}
              onBack={() => {
                setMapFlow(null)
                setErrorType(null)
              }}
              onRetry={() => {
                setMapFlow('route')
                setErrorType(null)
              }}
              onProceed={() => {
                setMapFlow('progress')
                setErrorType(null)
              }}
            />
          )}

          {/* Post sharing sheet */}
          {showPostShare && (
            <PostShareSheet
              onClose={() => setShowPostShare(false)}
              onShare={(post) => {
                setShowPostShare(false)
                alert(`'${post.title}' 게시글이 공유되었습니다!`)
              }}
              tripTitle={tripTitle}
              tripImage={tripImage}
              petName={petName}
            />
          )}

          {/* Profile settings modal */}
          {showProfileSettings && (
            <div className="absolute inset-0 z-50 bg-warm-beige flex flex-col">
              <ProfileSettings
                initialTab={showProfileSettings as any}
                onBack={() => setShowProfileSettings(null)}
              />
            </div>
          )}

          {/* Map flow — full-screen overlays */}
          {mapFlow === 'setup' && (
            <MapSetupScreen
              onBack={() => setMapFlow(null)}
              onNext={() => setMapFlow('route')}
            />
          )}

          {mapFlow === 'route' && (
            <MapRouteScreen
              onBack={() => setMapFlow('setup')}
              onStartTrip={() => setMapFlow('progress')}
            />
          )}

          {mapFlow === 'progress' && (
            <TravelProgressScreen
              onEndTrip={() => setMapFlow('end')}
              onAbort={() => {
                setMapFlow(null)
                setActiveTab('home')
              }}
            />
          )}

          {mapFlow === 'end' && (
            <TripEndScreen
              onSave={() => {
                setMapFlow(null)
                setActiveTab('album')
              }}
              onShare={() => setShowPostShare(true)}
            />
          )}

          {/* Main tabs — visible only when no map flow is active */}
          {mapFlow === null && !showPostShare && !showProfileSettings && (
            <>
              {activeTab === 'home' && (
                <HomeScreen
                  onStartTrip={handleStartTrip}
                  onViewPost={() => setActiveTab('board')}
                />
              )}

              {activeTab === 'board' && <CommunityScreen />}

              {activeTab === 'album' && (
                <AlbumScreen onViewDetail={() => {}} />
              )}

              {activeTab === 'profile' && (
                <ProfileScreen
                  onOpenSettings={(tab) => setShowProfileSettings(tab as any)}
                />
              )}
            </>
          )}

          {/* Bottom nav — hidden during map flow, post share, and modals */}
          {showBottomNav && !showPostShare && !showProfileSettings && (
            <BottomNav active={activeTab} onChange={handleTabChange} />
          )}
        </>
      )}
    </MobileShell>
  )
}
