export type CleaningState = 'IDLE' | 'MOVING_DOWN' | 'PAUSE_BOTTOM' | 'MOVING_UP' | 'PAUSE_TOP';
export type SunlightLevel = 'WEAK' | 'MEDIUM' | 'STRONG';
export type CommandStatus = 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED' | 'FAILED';
export type CommandType = 'START_CLEANING' | 'STOP_CLEANING' | 'START_MANUAL_CLEANING';

export interface Device {
  device_id: string;
  user_id?: string;
  connected: boolean;
  ldr1: number;
  ldr2: number;
  temperature: number;
  solar_voltage: number;
  solar_current: number;
  solar_power: number;
  rain_detected: boolean;
  sunlight_level: SunlightLevel;
  cleaning_state: CleaningState;
  updated_at: string; // ISO timestamp
  latitude?: number;
  longitude?: number;
  device_name?: string;
  is_public: boolean;
  public_slug?: string;
  firmware_version?: string;
}

export interface FirmwareRelease {
  version: string;
  released_at: string;
  release_notes: string;
  is_latest: boolean;
}

export interface DeviceHistory {
  id: string;
  device_id: string;
  recorded_at: string;
  solar_power: number;
  solar_voltage: number;
  solar_current: number;
  temperature: number;
  ldr1: number;
  ldr2: number;
  sunlight_level: SunlightLevel;
  rain_detected: boolean;
  cleaning_state: CleaningState;
}

export interface Command {
  id: string;
  device_id: string;
  command: CommandType;
  status: CommandStatus;
  created_at: string;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  timestamp: string;
  severity: AlertSeverity;
  message: string;
  read: boolean;
}

export interface DeviceBaseline {
  id: string;
  device_id: string;
  sunlight_level: SunlightLevel;
  baseline_power: number;
  recorded_at: string;
  notes?: string;
}

export interface CleaningEvent {
  id: string;
  device_id: string;
  started_at: string;
  ended_at: string;
  power_before: number;
  power_after: number;
  power_delta: number;
  sunlight_level: SunlightLevel;
  trigger: 'AUTO' | 'MANUAL';
}

export interface DeviceSettings {
  device_id: string;
  automatic_cleaning: boolean;
  power_threshold: number;
  sunlight_threshold: number;
  cleaning_distance_steps: number;
  cleaning_cooldown_minutes: number;
  updated_at: string;
}
