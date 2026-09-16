// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS for browser clients
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    let latStr: string | null = null
    let lonStr: string | null = null

    if (req.method === 'POST') {
      try {
        const body = await req.json()
        latStr = body.lat?.toString() || null
        lonStr = body.lon?.toString() || null
      } catch (e) {
        console.error("Failed to parse JSON body:", e)
      }
    }

    // Fallback to query params
    if (!latStr || !lonStr) {
      const url = new URL(req.url)
      latStr = latStr || url.searchParams.get('lat')
      lonStr = lonStr || url.searchParams.get('lon')
    }

    // 1. Validate inputs
    if (!latStr || !lonStr) {
      return new Response(
        JSON.stringify({ error: 'Missing lat or lon parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lat = parseFloat(latStr)
    const lon = parseFloat(lonStr)

    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) {
      return new Response(
        JSON.stringify({ error: 'Invalid lat or lon values. Lat must be between -90 and 90, lon between -180 and 180.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Fetch the API key securely
    const apiKey = Deno.env.get('OPENWEATHER_API_KEY')
    if (!apiKey) {
      console.error('OPENWEATHER_API_KEY is not set')
      return new Response(
        JSON.stringify({ error: 'Weather API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Call OpenWeatherMap free tier forecast endpoint
    // Using 5 day / 3 hour forecast API which is universally available on the free tier
    const openWeatherUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`
    const owmResponse = await fetch(openWeatherUrl)

    // 4. Handle upstream failures gracefully
    if (!owmResponse.ok) {
      console.error(`OpenWeatherMap error: ${owmResponse.status} ${owmResponse.statusText}`)
      return new Response(
        JSON.stringify({ error: 'Weather data currently unavailable' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const owmData = await owmResponse.json()

    if (!owmData.list || owmData.list.length === 0) {
      console.error('Invalid response payload from OpenWeatherMap')
      return new Response(
        JSON.stringify({ error: 'Unexpected response format from weather provider' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Trim the payload
    // Current conditions (using the most immediate forecast block as a proxy for "current")
    const currentItem = owmData.list[0]
    const current = {
      temp: currentItem.main.temp,
      description: currentItem.weather[0]?.description || 'unknown',
      icon: currentItem.weather[0]?.icon || '01d',
    }

    // Next 12 hours breakdown (the next 4 blocks, since they are in 3-hour increments)
    const next_12_hours = owmData.list.slice(0, 4).map((item: any) => ({
      dt: item.dt,
      timestamp: item.dt_txt,
      temp: item.main.temp,
      pop: Math.round(item.pop * 100), // Probability of precipitation (0-100%)
      conditions: item.weather[0]?.main || 'Unknown',
    }))

    const payload = {
      current,
      next_12_hours
    }

    // 6. Return response with caching headers
    // NOTE FOR CLIENTS: Callers should throttle requests client-side (e.g., every 30-60 minutes).
    // The function itself does not implement a heavy backend cache to preserve simplicity on the free tier, 
    // but relies on HTTP Cache-Control and client responsibility.
    return new Response(
      JSON.stringify(payload),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800' // Indicate a 30-minute cache window
        },
      }
    )

  } catch (error) {
    console.error('Unhandled Edge Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
