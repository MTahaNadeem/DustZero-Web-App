# DustZero Web App

The DustZero Web App is a production-quality dashboard for monitoring and controlling the Smart Automatic Solar Panel Cleaning System. It replicates the functionality of the DustZero Android app, featuring real-time data streaming and a responsive "Warm Graphite" dark theme.

## Features
- **Live Telemetry**: Real-time display of Solar Power, Voltage, Current, Temperature, and Environmental conditions.
- **Cleaning Control**: Monitor live cleaning phases and override automatic mode with Enable / Emergency Stop commands.
- **Alerts**: Client-side derived alerts system that monitors state changes for faults and rain detection.
- **Analytics**: Historical data charts (Power, Voltage, Current, Temperature) with 24H, 7D, and 30D filters.
- **Premium Design**: Warm Graphite theme with responsive desktop and mobile layouts.

## Architecture Decisions

### 1. Real-time Monitoring
We use Supabase Realtime (`postgres_changes`) to stream changes directly from the `devices` table.
- **Online/Offline Status**: Derived dynamically on the client by checking both `connected === true` and ensuring the `updated_at` timestamp is within 15-20 seconds. This prevents stale data from being displayed if the device disconnects abruptly.
- **Negative Value Clamping**: Firmware glitches (e.g. negative power readings) are clamped to 0 dynamically in the context state.

### 2. Client-Side Alerts
Since there is no `alerts` table in the Supabase database, alerts are derived **client-side** by monitoring state transitions on the `devices` row. For example, if `rain_detected` flips from `false` to `true`, a new alert is pushed to the context state.

### 3. Historical Analytics (`device_history`)
The `devices` table only stores the *current* state. To support the Analytics page, you must create a `device_history` table in Supabase and populate it periodically using a Supabase Edge Function or `pg_cron`. 

#### SQL Setup for History Table
Run this SQL in your Supabase SQL Editor:
```sql
create table public.device_history (
  id uuid default gen_random_uuid() primary key,
  device_id text references public.devices(device_id),
  recorded_at timestamptz default now(),
  solar_power numeric,
  solar_voltage numeric,
  solar_current numeric,
  temperature numeric,
  ldr1 integer,
  ldr2 integer,
  sunlight_level text,
  rain_detected boolean,
  cleaning_state text
);
```

#### Example pg_cron Job (Snapshots every 5 minutes)
```sql
select cron.schedule(
  'snapshot-device-history', 
  '*/5 * * * *', 
  $$
    insert into public.device_history (device_id, solar_power, solar_voltage, solar_current, temperature, ldr1, ldr2, sunlight_level, rain_detected, cleaning_state)
    select device_id, solar_power, solar_voltage, solar_current, temperature, ldr1, ldr2, sunlight_level, rain_detected, cleaning_state
    from public.devices
    where connected = true and updated_at >= now() - interval '1 minute';
  $$
);
```
*(Note the guard clause `updated_at >= now() - interval '1 minute'`: it ensures we do not record stale, offline data into the history table).*

### 4. Shared Edge Function (`get-weather`)
Both the Web App and Android App share a single Supabase Edge Function to fetch weather forecasts. This ensures API keys are kept secure and only the minimal required payload is sent to clients.

#### Deployment Instructions
To deploy the edge function to your Supabase project:
1. Set your OpenWeatherMap API key as a secret:
   ```bash
   npx supabase secrets set OPENWEATHER_API_KEY=<your_api_key>
   ```
2. Deploy the function (requires being logged into Supabase CLI):
   ```bash
   npx supabase functions deploy get-weather --project-ref oxgjosjqzlulnfcmqbty
   ```
   *(Note: The deployed function will be accessible at `https://oxgjosjqzlulnfcmqbty.supabase.co/functions/v1/get-weather`)*

## Configuration

### Supabase Auth URL Configuration
For email confirmation links to work correctly in both development and production, you must configure the **Redirect URLs** in your Supabase Dashboard:

1. Go to **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, add the following URLs:
   - `http://localhost:5173/**` (for local development)
   - `https://dust-zero.vercel.app/**` (for production)

*Note: Supabase will reject redirects to any origin not explicitly allow-listed here, regardless of what `emailRedirectTo` is sent in the code.*

## Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Then fill in your Supabase project credentials.

3. **Run the Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```
