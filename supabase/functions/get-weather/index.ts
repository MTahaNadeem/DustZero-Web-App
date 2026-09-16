const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * Helper to return a JSON error response with CORS headers.
 * The `code` field lets the frontend classify the error without parsing the message.
 */
function errorResponse(status: number, code: string, message: string): Response {
  console.error(`[get-weather] Error ${status}: ${code} — ${message}`)
  return new Response(
    JSON.stringify({ error: message, code }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

Deno.serve(async (req) => {
  // Handle CORS preflight for browser clients
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Parse coordinates from POST body or GET query params ──────────────
    let latStr: string | null = null
    let lonStr: string | null = null

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        latStr = body.lat?.toString() ?? null
        lonStr = body.lon?.toString() ?? null
      } catch (e) {
        console.error('[get-weather] Failed to parse JSON body:', e)
      }
    }

    // Fallback: read from URL query params (supports GET)
    if (!latStr || !lonStr) {
      const url = new URL(req.url)
      latStr = latStr ?? url.searchParams.get('lat')
      lonStr = lonStr ?? url.searchParams.get('lon')
    }

    // ── 2. Validate inputs ───────────────────────────────────────────────────
    if (!latStr || !lonStr) {
      return errorResponse(400, 'MISSING_COORDINATES', 'Missing lat or lon parameters')
    }

    const lat = parseFloat(latStr)
    const lon = parseFloat(lonStr)

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) {
      return errorResponse(400, 'INVALID_COORDINATES', `Invalid coordinates: lat=${latStr}, lon=${lonStr}`)
    }

    console.log(`[get-weather] Coordinates valid: lat=${lat}, lon=${lon}`)

    // ── 3. Retrieve API key securely from environment ────────────────────────
    const apiKey = Deno.env.get('OPENWEATHER_API_KEY')
    if (!apiKey) {
      console.error('[get-weather] OPENWEATHER_API_KEY environment variable is not set')
      return errorResponse(500, 'API_KEY_NOT_CONFIGURED', 'Weather API key not configured on the server')
    }

    console.log('[get-weather] API key configured: true')
    console.log('[get-weather] OpenWeather request starting')

    // ── 4. Call OpenWeatherMap (5-day / 3-hour forecast, free tier) ──────────
    const openWeatherUrl =
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    const owmResponse = await fetch(openWeatherUrl)

    console.log(`[get-weather] OpenWeather response status: ${owmResponse.status}`)

    // ── 5. Handle upstream HTTP failures ────────────────────────────────────
    if (!owmResponse.ok) {
      // Attempt to read the upstream body for more details (safe — it's server-side only)
      let owmErrorBody: any = null
      try {
        owmErrorBody = await owmResponse.json()
      } catch {
        // ignore
      }
      const owmMessage = owmErrorBody?.message ?? owmResponse.statusText

      if (owmResponse.status === 401) {
        console.error('[get-weather] OpenWeather unauthorized — API key is invalid or inactive')
        return errorResponse(401, 'OPENWEATHER_UNAUTHORIZED', 'Weather API key is invalid or not yet activated')
      }
      if (owmResponse.status === 429) {
        console.error('[get-weather] OpenWeather rate limit exceeded')
        return errorResponse(429, 'OPENWEATHER_RATE_LIMIT', 'Weather API rate limit exceeded')
      }
      if (owmResponse.status === 400) {
        console.error(`[get-weather] OpenWeather bad request: ${owmMessage}`)
        return errorResponse(400, 'OPENWEATHER_BAD_REQUEST', `Invalid request to weather provider: ${owmMessage}`)
      }

      console.error(`[get-weather] OpenWeather error ${owmResponse.status}: ${owmMessage}`)
      return errorResponse(502, 'OPENWEATHER_UPSTREAM_ERROR', 'Weather data currently unavailable from provider')
    }

    // ── 6. Parse the response ────────────────────────────────────────────────
    const owmData = await owmResponse.json()

    if (!owmData.list || owmData.list.length === 0) {
      console.error('[get-weather] OpenWeather returned empty forecast list')
      return errorResponse(502, 'OPENWEATHER_EMPTY_RESPONSE', 'Unexpected response format from weather provider')
    }

    // ── 7. Shape the payload ─────────────────────────────────────────────────
    // Current conditions = the nearest forecast block
    const currentItem = owmData.list[0]
    const current = {
      temp: currentItem.main.temp,
      feels_like: currentItem.main.feels_like,
      humidity: currentItem.main.humidity,
      description: currentItem.weather[0]?.description ?? 'unknown',
      icon: currentItem.weather[0]?.icon ?? '01d',
      wind_speed: currentItem.wind?.speed ?? 0,
    }

    // Next 12 hours breakdown (4 blocks × 3-hour intervals)
    const next_12_hours = owmData.list.slice(0, 4).map((item: any) => ({
      dt: item.dt,
      timestamp: item.dt_txt,
      temp: item.main.temp,
      pop: Math.round((item.pop ?? 0) * 100), // precipitation probability 0-100%
      conditions: item.weather[0]?.main ?? 'Unknown',
    }))

    const payload = { current, next_12_hours }

    console.log('[get-weather] Success — returning weather payload')

    return new Response(
      JSON.stringify(payload),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800',
        },
      }
    )

  } catch (error) {
    console.error('[get-weather] Unhandled error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
