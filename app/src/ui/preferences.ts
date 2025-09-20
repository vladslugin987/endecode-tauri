// Preferences management using Tauri commands

import { invoke } from '@tauri-apps/api/core';
import { Preferences } from './types.js';
import { stateManager } from './state.js';
import { consoleManager } from './console.js';

class PreferencesManager {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      await this.loadPreferences();
      this.setupEventListeners();
      this.initialized = true;
      consoleManager.info('Preferences loaded successfully');
    } catch (error) {
      consoleManager.warning('Failed to load preferences, using defaults');
      // Continue with default preferences
      this.initialized = true;
    }
  }

  private setupEventListeners(): void {
    // Save preferences whenever they change
    stateManager.onPreferencesChanged(async (preferences) => {
      await this.savePreferences(preferences);
    });

    // Save preferences when selected path changes
    stateManager.onSelectedPathChanged(async () => {
      const preferences = stateManager.getPreferences();
      await this.savePreferences(preferences);
    });
  }

  private async loadPreferences(): Promise<void> {
    try {
      const preferences = await invoke<Preferences>('load_preferences');
      
      // Validate and merge with defaults
      const validatedPreferences: Preferences = {
        theme_mode: preferences.theme_mode === 'dark' ? 'dark' : 'light',
        auto_clear_console: preferences.auto_clear_console ?? true,
        last_selected_path: preferences.last_selected_path
      };

      stateManager.updatePreferences(validatedPreferences);
      
      consoleManager.info('Preferences loaded from storage');
    } catch (error) {
      consoleManager.warning(`Could not load preferences: ${error}`);
      throw error;
    }
  }

  private async savePreferences(preferences: Preferences): Promise<void> {
    try {
      await invoke('save_preferences', { prefs: preferences });
      consoleManager.info('Preferences saved to storage');
    } catch (error) {
      consoleManager.error(`Failed to save preferences: ${error}`);
    }
  }

  // Public methods for external use

  async resetToDefaults(): Promise<void> {
    const defaultPreferences: Preferences = {
      theme_mode: 'light',
      auto_clear_console: true,
      last_selected_path: undefined
    };

    stateManager.updatePreferences(defaultPreferences);
    await this.savePreferences(defaultPreferences);
    consoleManager.info('Preferences reset to defaults');
  }

  async exportPreferences(): Promise<string> {
    const preferences = stateManager.getPreferences();
    return JSON.stringify(preferences, null, 2);
  }

  async importPreferences(jsonString: string): Promise<void> {
    try {
      const imported = JSON.parse(jsonString) as Partial<Preferences>;
      
      // Validate imported preferences
      const validatedPreferences: Preferences = {
        theme_mode: imported.theme_mode === 'dark' ? 'dark' : 'light',
        auto_clear_console: imported.auto_clear_console ?? true,
        last_selected_path: imported.last_selected_path
      };

      stateManager.updatePreferences(validatedPreferences);
      await this.savePreferences(validatedPreferences);
      consoleManager.success('Preferences imported successfully');
    } catch (error) {
      consoleManager.error(`Failed to import preferences: ${error}`);
      throw new Error('Invalid preferences format');
    }
  }

  // Get current preferences
  getCurrentPreferences(): Preferences {
    return stateManager.getPreferences();
  }

  // Update specific preference
  async updatePreference<K extends keyof Preferences>(
    key: K, 
    value: Preferences[K]
  ): Promise<void> {
    const currentPrefs = stateManager.getPreferences();
    const updatedPrefs = { ...currentPrefs, [key]: value };
    stateManager.updatePreferences(updatedPrefs);
  }

  // Check if preferences are properly initialized
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const preferencesManager = new PreferencesManager();
