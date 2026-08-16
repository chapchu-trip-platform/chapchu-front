import { notFound } from 'next/navigation'
import DevDiagnosticsScreen from '@/features/devtools/components/dev-diagnostics-screen'

export default function DevDiagnosticsPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <DevDiagnosticsScreen />
}
