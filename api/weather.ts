import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    console.error('OPENWEATHER_API_KEY is not set');
    return res.status(500).json({ error: 'Weather API is not configured on the server' });
  }

  try {
    // Fetch 5-day/3-hour forecast data
    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenWeatherMap API error:', errorData);
      return res.status(response.status).json({ error: 'Failed to fetch weather data' });
    }

    const data = await response.json();
    
    // Parse response for current conditions and upcoming rain (next ~12 hours)
    // The forecast API returns data in 3-hour chunks (list).
    
    const list = data.list || [];
    if (list.length === 0) {
       return res.status(500).json({ error: 'No forecast data available' });
    }

    const current = list[0];
    
    // Look ahead 4 periods (12 hours) to check for rain
    let rainExpectedInHours: number | null = null;
    let willBeClear = true;

    for (let i = 0; i < Math.min(4, list.length); i++) {
      const forecast = list[i];
      const hasRain = forecast.weather?.some((w: any) => w.main.toLowerCase() === 'rain' || w.main.toLowerCase() === 'drizzle' || w.main.toLowerCase() === 'thunderstorm');
      if (hasRain) {
        if (rainExpectedInHours === null) {
          rainExpectedInHours = i * 3; // roughly i*3 hours from now
        }
        willBeClear = false;
      }
    }
    
    // Set heavy caching (e.g. 30 minutes) to avoid hitting OpenWeatherMap rate limits
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');

    return res.status(200).json({
      location: data.city?.name || 'Unknown Location',
      current: {
        temp: current.main?.temp,
        description: current.weather?.[0]?.description,
        icon: current.weather?.[0]?.icon,
      },
      forecast: {
        rainExpectedInHours,
        willBeClear
      }
    });

  } catch (error) {
    console.error('Error fetching weather:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
