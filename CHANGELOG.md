# Changelog

## 2026-09-15: Database Schema Alignment

This update strictly aligns the DustZero Web App's TypeScript interfaces and UI logic with the authoritative `migrations/` folder. 

### Type & Enum Fixes
- **`CleaningEvent` Trigger Enum:** Updated `trigger` type in `types/index.ts` from `'AUTOMATIC' | 'MANUAL'` to `'AUTO' | 'MANUAL'` to match the `log_cleaning_event()` SQL function trigger defined in `20260915_add_cleaning_events.sql`.
- **`Device` / `DeviceHistory` Types:** Removed properties that were assumed in the frontend but do not exist in the authoritative `devices` table (as inferred by `20260913_device_history.sql`):
  - Removed `cleaning_progress` (number)
  - Removed `cleaning_steps` (number)
  - Removed `fault` (boolean)
  - Removed `cycles_today` (number)
  - Removed `last_clean_time` (string)
  - Removed `sun_detected` (boolean)

### Query Fixes
- **`Settings.tsx` (Fallback Insert):** When claiming a new device, the fallback `INSERT INTO devices` statement was stripped of the non-existent columns (`cleaning_progress`, `cleaning_steps`, `fault`, `sun_detected`) to prevent PostgREST errors.

### UI & Component Logic Fixes
- **`CleaningControl.tsx`:** 
  - Since `cleaning_progress` no longer exists, the `CircularProgress` component was rewritten. It is now a purely state-based pulsing indicator that animates when active (`MOVING_DOWN`, `MOVING_UP`) without relying on a numeric 0-100 percentage.
  - Removed the bottom stat cards for `Cycles Today` and `Cleaning Steps` as the backend does not track them.
- **`StatusBanner.tsx`:** Removed the `FaultBanner` component entirely since hardware faults (`fault`) are not tracked in the schema.
- **`Dashboard.tsx` & `DustZeroContext.tsx`:** Stripped all logic, assertions, and alert popups that were checking for `device.fault === true`.

### Notes on the `commands` Table
- The `commands` table structure is referenced in `20260915_add_auth_and_rls.sql` for Row Level Security but is not strictly defined in the provided migrations. The frontend currently relies on `id`, `device_id`, `command`, `status`, and `created_at`. Since there is no conflicting schema, these assumptions were left in place, but they should be formalized in a future SQL migration.
