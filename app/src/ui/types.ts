// Type definitions for the application

export interface Preferences {
  theme_mode: 'light' | 'dark';
  auto_clear_console: boolean;
  last_selected_path?: string;
}

export interface BatchOptions {
  sourceFolder: string;
  numCopies: number;
  baseText: string;
  addSwap: boolean;
  addWatermark: boolean;
  createZip: boolean;
  watermarkText?: string;
  photoNumber?: number;
}

export interface AppState {
  selectedPath: string | null;
  preferences: Preferences;
  isWorking: boolean;
  currentOperation: string | null;
}

export type StatusType = 'ready' | 'working' | 'error';

export interface LogEntry {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}
