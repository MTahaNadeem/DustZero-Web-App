-- Migration: 20260916_add_web_features
-- Description: Adds columns for weather integration, multi-device support, share links, and firmware checks.

-- 1. Add weather/location and renaming columns to devices
ALTER TABLE public.devices 
ADD COLUMN IF NOT EXISTS latitude NUMERIC NULL,
ADD COLUMN IF NOT EXISTS longitude NUMERIC NULL,
ADD COLUMN IF NOT EXISTS device_name TEXT NULL,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE NULL,
ADD COLUMN IF NOT EXISTS firmware_version TEXT NULL;

-- 2. Create firmware releases table
CREATE TABLE IF NOT EXISTS public.firmware_releases (
    version TEXT PRIMARY KEY,
    released_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    release_notes TEXT,
    is_latest BOOLEAN NOT NULL DEFAULT false
);

-- Note: We assume only admins or automated processes can insert into firmware_releases, 
-- but any authenticated user can read it.
ALTER TABLE public.firmware_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read firmware releases" ON public.firmware_releases
    FOR SELECT USING (true);

-- 3. Update RLS for devices table to allow public read access if is_public = true
-- Currently, devices RLS is set to allow anon or authenticated users based on existing policies.
-- We'll add a specific policy for anon users to read public devices.
CREATE POLICY "Anon can view public devices" 
    ON public.devices 
    FOR SELECT 
    USING (is_public = true);

-- 4. Update RLS for device_history to allow public read access if the device is public
CREATE POLICY "Anon can view public device history" 
    ON public.device_history 
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.devices 
            WHERE devices.device_id = device_history.device_id 
            AND devices.is_public = true
        )
    );
