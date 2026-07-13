const TMAP_JS_SDK_ENDPOINT = 'https://apis.openapi.sk.com/tmap/jsv2'
const TMAP_SDK_VERSION = '1'
const TMAP_SDK_TIMEOUT_MS = 8000
const TMAP_DOCUMENT_WRITE_CALL = 'document.write(d.join(""))'
const TMAP_DYNAMIC_SCRIPT_APPEND = `for(var h=0;h<d.length;h++){var m=d[h].match(/src='([^']+)'/);if(m){var s=document.createElement('script');s.src=m[1];s.async=false;document.head.appendChild(s);}}`

const SCRIPT_HEADERS = {
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
}

const ERROR_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
  'X-Content-Type-Options': 'nosniff',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const apiKey = process.env.T_MAP_APIKEY

  if (!apiKey) {
    return new Response('TMAP SDK is not configured.', {
      status: 500,
      headers: ERROR_HEADERS,
    })
  }

  const sdkUrl = new URL(TMAP_JS_SDK_ENDPOINT)
  sdkUrl.searchParams.set('version', TMAP_SDK_VERSION)
  sdkUrl.searchParams.set('appKey', apiKey)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TMAP_SDK_TIMEOUT_MS)

  try {
    const sdkResponse = await fetch(sdkUrl, {
      cache: 'no-store',
      signal: controller.signal,
      headers: {
        Accept: 'application/javascript, text/javascript, */*;q=0.1',
      },
    })

    if (!sdkResponse.ok) {
      return new Response('Failed to load TMAP SDK.', {
        status: 502,
        headers: ERROR_HEADERS,
      })
    }

    const sdkSource = await sdkResponse.text()

    if (sdkSource.includes(apiKey)) {
      return new Response('TMAP SDK response failed security validation.', {
        status: 502,
        headers: ERROR_HEADERS,
      })
    }

    const patchedSdkSource = sdkSource.replace(TMAP_DOCUMENT_WRITE_CALL, TMAP_DYNAMIC_SCRIPT_APPEND)

    return new Response(patchedSdkSource, {
      status: 200,
      headers: SCRIPT_HEADERS,
    })
  } catch {
    return new Response('Failed to request TMAP SDK.', {
      status: 502,
      headers: ERROR_HEADERS,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}
