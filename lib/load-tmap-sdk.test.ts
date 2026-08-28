import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadTmapSdk, resetTmapSdkLoaderForTest } from '@/lib/load-tmap-sdk'

const mockTmapNamespace: Tmapv2Namespace = {
  Map: class {
    constructor() {}
  },
  LatLng: class {
    constructor() {}
  },
  Marker: class {
    constructor() {}
  },
}

describe('loadTmapSdk', () => {
  beforeEach(() => {
    vi.useRealTimers()
    resetTmapSdkLoaderForTest()
    document.head.innerHTML = ''
    Reflect.deleteProperty(window, 'Tmapv2')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('inserts the SDK script only once while loading', async () => {
    const firstLoad = loadTmapSdk()
    const secondLoad = loadTmapSdk()
    const scripts = document.querySelectorAll('script#tmap-js-sdk')

    expect(firstLoad).toBe(secondLoad)
    expect(scripts).toHaveLength(1)
    expect((scripts[0] as HTMLScriptElement).src).toContain('/api/tmap/sdk')

    window.Tmapv2 = mockTmapNamespace
    scripts[0].dispatchEvent(new Event('load'))

    await expect(firstLoad).resolves.toBe(mockTmapNamespace)
    await expect(secondLoad).resolves.toBe(mockTmapNamespace)
  })

  it('removes a failed script so the next call can retry', async () => {
    const firstLoad = loadTmapSdk()
    const firstScript = document.querySelector('script#tmap-js-sdk')

    firstScript?.dispatchEvent(new Event('error'))

    await expect(firstLoad).rejects.toThrow('TMAP SDK failed to load.')
    expect(document.querySelector('script#tmap-js-sdk')).toBeNull()

    const secondLoad = loadTmapSdk()
    const secondScript = document.querySelector('script#tmap-js-sdk')

    expect(secondScript).not.toBeNull()
    expect(secondScript).not.toBe(firstScript)

    window.Tmapv2 = mockTmapNamespace
    secondScript?.dispatchEvent(new Event('load'))

    await expect(secondLoad).resolves.toBe(mockTmapNamespace)
  })

  it('waits for the Marker constructor before resolving the SDK', async () => {
    vi.useFakeTimers()
    const loadingNamespace = {
      Map: mockTmapNamespace.Map,
      LatLng: mockTmapNamespace.LatLng,
    } as Tmapv2Namespace
    const sdkLoad = loadTmapSdk()
    const script = document.querySelector('script#tmap-js-sdk')
    let isResolved = false

    window.Tmapv2 = loadingNamespace
    sdkLoad.then(() => {
      isResolved = true
    })
    script?.dispatchEvent(new Event('load'))
    await Promise.resolve()

    expect(isResolved).toBe(false)

    loadingNamespace.Marker = mockTmapNamespace.Marker
    await vi.advanceTimersByTimeAsync(100)

    await expect(sdkLoad).resolves.toBe(loadingNamespace)
  })
})
