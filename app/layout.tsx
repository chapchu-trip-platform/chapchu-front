import type { Metadata, Viewport } from 'next'
import DevDiagnosticsBridge from '@/features/devtools/components/dev-diagnostics-bridge'
import './globals.css'

export const metadata: Metadata = {
  title: 'PawRoute — 반려동물과 함께하는 여행',
  description: '반려동물과 함께 떠나는 지도 기반 여행 추천 및 기록 서비스',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F7F1E7',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className="bg-background">
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV !== 'production' ? <DevDiagnosticsBridge /> : null}
      </body>
    </html>
  )
}
