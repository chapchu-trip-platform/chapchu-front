import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DevDiagnosticsScreen from '@/features/devtools/components/dev-diagnostics-screen'
import {
  announceDiagnosticViewer,
  publishDiagnosticEvent,
  releaseDiagnosticViewer,
} from '@/features/devtools/lib/dev-diagnostics'

afterEach(() => {
  cleanup()
  releaseDiagnosticViewer()
  vi.restoreAllMocks()
})

describe('DevDiagnosticsScreen', () => {
  it('renders a sanitized live network event and supports filtering', async () => {
    const user = userEvent.setup()
    vi.spyOn(console, 'debug').mockImplementation(() => undefined)
    render(<DevDiagnosticsScreen />)
    announceDiagnosticViewer()

    act(() => {
      publishDiagnosticEvent({
        kind: 'network',
        summary: 'REQUEST POST /auth/signup',
        details: {
          body: {
            registrationToken: 'registration-secret',
            user: { nickname: '햇살여행자' },
          },
        },
      })
    })

    expect(screen.getByText('REQUEST POST /auth/signup')).toBeInTheDocument()
    expect(screen.getByText(/\[REDACTED\]/)).toBeInTheDocument()
    expect(screen.getByText(/햇살여행자/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'STATE' }))
    expect(screen.queryByText('REQUEST POST /auth/signup')).not.toBeInTheDocument()
  })
})
