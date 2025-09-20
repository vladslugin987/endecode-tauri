// Application state management using native Web APIs

import { AppState, Preferences } from './types.js';

class StateManager extends EventTarget {
  private state: AppState = {
    selectedPath: null,
    preferences: {
      theme_mode: 'light',
      auto_clear_console: true,
      last_selected_path: undefined
    },
    isWorking: false,
    currentOperation: null
  };

  constructor() {
    super();
    this.initializeTheme();
  }

  // State getters
  getState(): AppState {
    return { ...this.state };
  }

  getSelectedPath(): string | null {
    return this.state.selectedPath;
  }

  getPreferences(): Preferences {
    return { ...this.state.preferences };
  }

  isCurrentlyWorking(): boolean {
    return this.state.isWorking;
  }

  getCurrentOperation(): string | null {
    return this.state.currentOperation;
  }

  // State setters
  setSelectedPath(path: string | null): void {
    this.state.selectedPath = path;
    if (path) {
      this.updatePreferences({ last_selected_path: path });
    }
    this.emit('selectedPathChanged', path);
  }

  updatePreferences(preferences: Partial<Preferences>): void {
    this.state.preferences = { ...this.state.preferences, ...preferences };
    this.emit('preferencesChanged', this.state.preferences);
    
    // Apply theme change immediately
    if (preferences.theme_mode) {
      this.applyTheme(preferences.theme_mode);
    }
  }

  setWorkingStatus(isWorking: boolean, operation?: string): void {
    this.state.isWorking = isWorking;
    this.state.currentOperation = isWorking ? operation || null : null;
    this.emit('workingStatusChanged', { isWorking, operation: this.state.currentOperation });
  }

  // Theme management
  private initializeTheme(): void {
    // Check system preference first
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = systemPrefersDark ? 'dark' : 'light';
    this.state.preferences.theme_mode = initialTheme;
    this.applyTheme(initialTheme);
    
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.state.preferences.theme_mode === 'light' || this.state.preferences.theme_mode === 'dark') {
        const newTheme = e.matches ? 'dark' : 'light';
        this.updatePreferences({ theme_mode: newTheme });
      }
    });
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
  }

  toggleTheme(): void {
    const currentTheme = this.state.preferences.theme_mode;
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    this.updatePreferences({ theme_mode: newTheme });
  }

  // Event emitter helper
  private emit(eventName: string, data?: any): void {
    this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  // Subscribe to state changes
  onSelectedPathChanged(callback: (path: string | null) => void): () => void {
    const handler = (event: CustomEvent) => callback(event.detail);
    this.addEventListener('selectedPathChanged', handler as EventListener);
    return () => this.removeEventListener('selectedPathChanged', handler as EventListener);
  }

  onPreferencesChanged(callback: (preferences: Preferences) => void): () => void {
    const handler = (event: CustomEvent) => callback(event.detail);
    this.addEventListener('preferencesChanged', handler as EventListener);
    return () => this.removeEventListener('preferencesChanged', handler as EventListener);
  }

  onWorkingStatusChanged(callback: (status: { isWorking: boolean; operation: string | null }) => void): () => void {
    const handler = (event: CustomEvent) => callback(event.detail);
    this.addEventListener('workingStatusChanged', handler as EventListener);
    return () => this.removeEventListener('workingStatusChanged', handler as EventListener);
  }
}

// Export singleton instance
export const stateManager = new StateManager();
