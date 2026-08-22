const TMAP_SDK_SCRIPT_ID = 'tmap-js-sdk'
const TMAP_SDK_SRC = '/api/tmap/sdk'
const TMAP_SDK_READY_TIMEOUT_MS = 10000
const TMAP_SDK_READY_INTERVAL_MS = 100

let tmapSdkPromise: Promise<Tmapv2Namespace> | null = null

function isTmapSdkReady() {
  return Boolean(window.Tmapv2?.Map && window.Tmapv2.LatLng && window.Tmapv2.Marker)
}

function waitForTmapSdkReady() {
  return new Promise<Tmapv2Namespace>((resolve, reject) => {
    const startedAt = Date.now()

    const checkReady = () => {
      if (isTmapSdkReady() && window.Tmapv2) {
        resolve(window.Tmapv2)
        return
      }

      if (Date.now() - startedAt >= TMAP_SDK_READY_TIMEOUT_MS) {
        reject(new Error('TMAP SDK loaded without the expected map constructors.'))
        return
      }

      window.setTimeout(checkReady, TMAP_SDK_READY_INTERVAL_MS)
    }

    checkReady()
  })
}

export function loadTmapSdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('TMAP SDK can only be loaded in the browser.'))
  }

  if (isTmapSdkReady() && window.Tmapv2) {
    return Promise.resolve(window.Tmapv2)
  }

  if (tmapSdkPromise) {
    return tmapSdkPromise
  }

  tmapSdkPromise = new Promise<Tmapv2Namespace>((resolve, reject) => {
    const existingScript = document.getElementById(TMAP_SDK_SCRIPT_ID) as HTMLScriptElement | null

    const cleanupListeners = (script: HTMLScriptElement) => {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }

    const handleLoad = () => {
      const script = document.getElementById(TMAP_SDK_SCRIPT_ID) as HTMLScriptElement | null

      if (script) {
        script.dataset.loaded = 'true'
        cleanupListeners(script)
      }

      if (!window.Tmapv2) {
        tmapSdkPromise = null
        reject(new Error('TMAP SDK loaded without the expected global object.'))
        return
      }

      waitForTmapSdkReady().then(resolve).catch((error) => {
        tmapSdkPromise = null
        reject(error)
      })
    }

    const handleError = () => {
      const script = document.getElementById(TMAP_SDK_SCRIPT_ID) as HTMLScriptElement | null

      if (script) {
        cleanupListeners(script)
        script.remove()
      }

      tmapSdkPromise = null
      reject(new Error('TMAP SDK failed to load.'))
    }

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        handleLoad()
        return
      }

      existingScript.addEventListener('load', handleLoad, { once: true })
      existingScript.addEventListener('error', handleError, { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = TMAP_SDK_SCRIPT_ID
    script.src = TMAP_SDK_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })

    document.head.appendChild(script)
  })

  return tmapSdkPromise
}

export function resetTmapSdkLoaderForTest() {
  tmapSdkPromise = null
}
