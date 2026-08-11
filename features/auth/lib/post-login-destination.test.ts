import { afterEach, describe, expect, it } from 'vitest'
import {
  consumePostLoginDestination,
  rememberPetSetupDestination,
} from '@/features/auth/lib/post-login-destination'

afterEach(() => sessionStorage.clear())

describe('post-login destination', () => {
  it('allows only the fixed pet setup continuation', () => {
    rememberPetSetupDestination()

    expect(consumePostLoginDestination()).toBe('/setup?step=pet')
    expect(consumePostLoginDestination()).toBe('/home')
  })

  it('ignores unexpected stored destinations', () => {
    sessionStorage.setItem('chapchu.auth.post-login-destination', 'https://example.com')

    expect(consumePostLoginDestination()).toBe('/home')
  })
})
