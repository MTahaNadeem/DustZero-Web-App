export type CleaningState = 'IDLE' | 'MOVING_DOWN' | 'PAUSE_BOTTOM' | 'MOVING_UP' | 'PAUSE_TOP';
export type SunlightLevel = 'WEAK' | 'MEDIUM' | 'STRONG';
export type CommandStatus = 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED' | 'FAILED';
export type CommandType = 'START_CLEANING' | 'STOP_CLEANING';

export interface Device {
  device_id: string;
  connected: boolean;
  ldr1: number;
  ldr2: number;
  temperature: number;
  solar_voltage: number;
  solar_current: number;
  solar_power: number;
  rain_detected: boolean;
  sun_detected: boolean;
  sunlight_level: SunlightLevel;
  cleaning_state: CleaningState;
  cleaning_progress: number;
  cleaning_steps: number;
  fault: boolean;
  updated_at: string; // ISO timestamp
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
