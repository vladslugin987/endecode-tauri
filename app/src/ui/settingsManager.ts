// Settings Manager for ENDEcode

import { i18n } from './i18n.js';
import { stateManager } from './state.js';
import { consoleManager } from './console.js';

interface ExtendedPreferences {
  theme_mode: 'light' | 'dark' | 'system';
  auto_clear_console: boolean;
  last_selected_path?: string;
  language: string;
  show_beginner_tips: boolean;
  default_watermark_text: string;
  debug_mode: boolean;
}

class SettingsManager {
  private isInitialized = false;
  private settingsBtn: HTMLButtonElement | null = null;
  private backBtn: HTMLButtonElement | null = null;
  private mainApp: HTMLElement | null = null;
  private settingsApp: HTMLElement | null = null;

  // Settings controls
  private languageSelect: HTMLSelectElement | null = null;
  private themeSelect: HTMLSelectElement | null = null;
  private showTipsCheckbox: HTMLInputElement | null = null;
  private autoClearCheckbox: HTMLInputElement | null = null;
  private defaultWatermarkInput: HTMLInputElement | null = null;
  private debugModeCheckbox: HTMLInputElement | null = null;
  private resetButton: HTMLButtonElement | null = null;

  initialize(): void {
    if (this.isInitialized) return;

    // Get DOM elements
    this.settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
    this.backBtn = document.getElementById('back-to-main-btn') as HTMLButtonElement;
    this.mainApp = document.getElementById('main-app') as HTMLElement;
    this.settingsApp = document.getElementById('settings-app') as HTMLElement;

    // Settings controls
    this.languageSelect = document.getElementById('language-select') as HTMLSelectElement;
    this.themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
    this.showTipsCheckbox = document.getElementById('show-tips') as HTMLInputElement;
    this.autoClearCheckbox = document.getElementById('auto-clear-setting') as HTMLInputElement;
    this.defaultWatermarkInput = document.getElementById('default-watermark') as HTMLInputElement;
    this.debugModeCheckbox = document.getElementById('debug-mode') as HTMLInputElement;
    this.resetButton = document.getElementById('reset-settings-btn') as HTMLButtonElement;

    this.setupEventListeners();
    this.loadSettings();
    this.isInitialized = true;
  }

  private setupEventListeners(): void {
    // Navigation
    this.settingsBtn?.addEventListener('click', () => {
      this.showSettings();
    });

    this.backBtn?.addEventListener('click', () => {
      this.showMain();
    });

    // Keyboard: ESC to go back from Settings
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.settingsApp?.classList.contains('active')) {
        this.showMain();
      }
    });

    // Settings changes
    this.languageSelect?.addEventListener('change', () => {
      const newLang = this.languageSelect!.value;
      i18n.setLanguage(newLang);
      this.saveSettings();
      consoleManager.info(`Language changed to: ${i18n.getLanguageDisplayName(newLang)}`);
    });

    this.themeSelect?.addEventListener('change', () => {
      this.applyTheme();
      this.saveSettings();
    });

    this.showTipsCheckbox?.addEventListener('change', () => {
      this.toggleBeginnerTips();
      this.saveSettings();
    });

    this.autoClearCheckbox?.addEventListener('change', () => {
      this.saveSettings();
    });

    this.defaultWatermarkInput?.addEventListener('input', () => {
      this.saveSettings();
    });

    this.debugModeCheckbox?.addEventListener('change', () => {
      this.toggleDebugMode();
      this.saveSettings();
    });

    this.resetButton?.addEventListener('click', () => {
      this.resetToDefaults();
    });

    // Listen for language changes
    window.addEventListener('languageChanged', () => {
      this.updateLanguageSelect();
    });
  }

  private showSettings(): void {
    console.log('Settings button clicked');
    console.log('mainApp:', this.mainApp);
    console.log('settingsApp:', this.settingsApp);
    
    if (this.mainApp && this.settingsApp) {
      this.mainApp.classList.remove('active');
      this.settingsApp.classList.add('active');
      consoleManager.info('Settings opened');
    } else {
      console.error('Failed to find app elements');
    }
  }

  private showMain(): void {
    console.log('Back button clicked');
    console.log('mainApp:', this.mainApp);
    console.log('settingsApp:', this.settingsApp);
    
    if (this.mainApp && this.settingsApp) {
      this.settingsApp.classList.remove('active');
      this.mainApp.classList.add('active');
      consoleManager.info('Returned to main application');
    } else {
      console.error('Failed to find app elements');
    }
  }

  private loadSettings(): void {
    const preferences = this.getExtendedPreferences();

    // Language
    if (this.languageSelect) {
      this.languageSelect.value = preferences.language;
    }

    // Theme
    if (this.themeSelect) {
      this.themeSelect.value = preferences.theme_mode;
    }

    // Beginner tips
    if (this.showTipsCheckbox) {
      this.showTipsCheckbox.checked = preferences.show_beginner_tips;
    }

    // Auto clear console
    if (this.autoClearCheckbox) {
      this.autoClearCheckbox.checked = preferences.auto_clear_console;
    }

    // Default watermark text
    if (this.defaultWatermarkInput) {
      this.defaultWatermarkInput.value = preferences.default_watermark_text;
    }

    // Debug mode
    if (this.debugModeCheckbox) {
      this.debugModeCheckbox.checked = preferences.debug_mode;
    }

    // Apply current settings
    this.applyTheme();
    this.toggleBeginnerTips();
    this.toggleDebugMode();
  }

  private saveSettings(): void {
    const preferences: ExtendedPreferences = {
      theme_mode: this.themeSelect?.value as 'light' | 'dark' | 'system' || 'system',
      auto_clear_console: this.autoClearCheckbox?.checked || true,
      last_selected_path: stateManager.getSelectedPath() || undefined,
      language: this.languageSelect?.value || 'en',
      show_beginner_tips: this.showTipsCheckbox?.checked || true,
      default_watermark_text: this.defaultWatermarkInput?.value || '',
      debug_mode: this.debugModeCheckbox?.checked || false
    };

    localStorage.setItem('endecode_extended_preferences', JSON.stringify(preferences));
  }

  private getExtendedPreferences(): ExtendedPreferences {
    const defaultPrefs: ExtendedPreferences = {
      theme_mode: 'system',
      auto_clear_console: true,
      language: 'en',
      show_beginner_tips: true,
      default_watermark_text: '',
      debug_mode: false
    };

    try {
      const saved = localStorage.getItem('endecode_extended_preferences');
      if (saved) {
        return { ...defaultPrefs, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('Failed to load extended preferences:', error);
    }

    return defaultPrefs;
  }

  private applyTheme(): void {
    const themeMode = this.themeSelect?.value || 'system';
    const root = document.documentElement;

    if (themeMode === 'system') {
      // Use system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', themeMode);
    }
  }

  private toggleBeginnerTips(): void {
    const showTips = this.showTipsCheckbox?.checked || false;
    const tips = document.querySelectorAll('.beginner-tip');
    
    tips.forEach(tip => {
      if (showTips) {
        tip.classList.remove('hidden');
      } else {
        tip.classList.add('hidden');
      }
    });
  }

  private toggleDebugMode(): void {
    const debugMode = this.debugModeCheckbox?.checked || false;
    
    if (debugMode) {
      console.log('Debug mode enabled');
      // Enable verbose logging
      window.addEventListener('error', this.logError);
      window.addEventListener('unhandledrejection', this.logRejection);
    } else {
      console.log('Debug mode disabled');
      // Disable verbose logging
      window.removeEventListener('error', this.logError);
      window.removeEventListener('unhandledrejection', this.logRejection);
    }
  }

  private logError = (event: ErrorEvent): void => {
    consoleManager.error(`Debug: ${event.error?.message || event.message}`);
  };

  private logRejection = (event: PromiseRejectionEvent): void => {
    consoleManager.error(`Debug: Promise rejection - ${event.reason}`);
  };

  private updateLanguageSelect(): void {
    if (this.languageSelect) {
      this.languageSelect.value = i18n.getCurrentLanguage();
    }
  }

  private resetToDefaults(): void {
    if (confirm(i18n.t('settings.advanced.reset_desc'))) {
      // Clear all settings
      localStorage.removeItem('endecode_extended_preferences');
      localStorage.removeItem('endecode_language');
      localStorage.removeItem('endecode_preferences');
      
      // Reload page to apply defaults
      window.location.reload();
    }
  }

  // Public methods
  getDefaultWatermarkText(): string {
    return this.defaultWatermarkInput?.value || '';
  }

  isBeginnerTipsEnabled(): boolean {
    return this.showTipsCheckbox?.checked || true;
  }

  isDebugModeEnabled(): boolean {
    return this.debugModeCheckbox?.checked || false;
  }

  getThemeMode(): 'light' | 'dark' | 'system' {
    return this.themeSelect?.value as 'light' | 'dark' | 'system' || 'system';
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();
