# DustZero Database Migrations

This folder contains the SQL migrations required to upgrade the Supabase project to support Authentication, Multi-Device Ownership, Clean-Panel Baselines, Cleaning Effectiveness Tracking, and Device Settings.

## Execution Order

You must execute these SQL scripts in the Supabase SQL Editor in the following order:

1. `01_auth_and_rls.sql`
2. `02_device_baselines.sql`
3. `03_cleaning_events.sql`
4. `04_history_cleanup.sql`
5. `05_device_settings.sql`

## ⚠️ CRITICAL: Manual Data Step After Migration 01

Because we are introducing Authentication and Row Level Security, **existing devices will disappear from the Dashboard until they are assigned to your user account.**

1. Run all migrations.
2. Go to your deployed DustZero Web App and **Sign Up** for a new account.
3. Once logged in, you will have a `user_id` (a UUID). You can find this in the Supabase Dashboard under `Authentication -> Users`.
4. Go to the Supabase SQL Editor and run this query to assign your existing device to your new account (replace `YOUR_USER_ID_HERE` with your actual UUID from step 3):

```sql
UPDATE public.devices 
SET user_id = 'YOUR_USER_ID_HERE' 
WHERE device_id = 'dustzero-001'; -- Or whatever your existing device ID is
```

If you don't do this, you won't see your device because the RLS policies now restrict visibility to the owner!

## Note on Firmware Compatibility

- **RLS (Migration 01)**: The ESP32 firmware currently uses the Anon key. The new RLS policies restrict the Anon key to only `UPDATE` rows where the `device_id` matches. Ensure your ESP32 is sending the `device_id` correctly in its requests.
- **Device Settings (Migration 05)**: The ESP32 firmware does not currently read the `device_settings` table. Changing settings in the Web App will update this table, but will have no physical effect until the firmware is updated to poll this table.
