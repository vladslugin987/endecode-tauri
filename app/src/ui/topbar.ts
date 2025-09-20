// Top bar component with theme toggle and status indicator

import { stateManager } from './state.js';

class TopBar {
  private themeToggle: HTMLButtonElement | null = null;
  private themeEmoji: HTMLElement | null = null;
  private statusDot: HTMLElement | null = null;
  private statusText: HTMLElement | null = null;

  initialize(): void {
    this.themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement;
    this.themeEmoji = this.themeToggle?.querySelector('#theme-emoji') as HTMLElement;
    this.statusDot = document.getElementById('status-indicator')?.querySelector('.status-dot') as HTMLElement;
    this.statusText = document.getElementById('status-indicator')?.querySelector('.status-text') as HTMLElement;

    this.setupEventListeners();
    this.updateThemeIcon();
    this.updateStatus('ready', 'Ready');
  }

  private setupEventListeners(): void {
    // Theme toggle button
    if (this.themeToggle) {
      this.themeToggle.addEventListener('click', () => {
        stateManager.toggleTheme();
      });
    }

    // Listen for preference changes
    stateManager.onPreferencesChanged(() => {
      this.updateThemeIcon();
    });

    // Listen for working status changes
    stateManager.onWorkingStatusChanged((status) => {
      if (status.isWorking) {
        this.updateStatus('working', status.operation || 'Working...');
      } else {
        this.updateStatus('ready', 'Ready');
      }
    });
  }

  private updateThemeIcon(): void {
    if (!this.themeEmoji) return;

    const preferences = stateManager.getPreferences();
    const isDark = preferences.theme_mode === 'dark';
    
    // Update icon based on current theme
    this.themeEmoji.textContent = isDark ? '☀️' : '🌙';
    
    // Update tooltip
    if (this.themeToggle) {
      this.themeToggle.title = isDark ? 'Switch to light theme' : 'Switch to dark theme';
    }
  }

  updateStatus(type: 'ready' | 'working' | 'error', message: string): void {
    if (this.statusDot) {
      // Remove existing status classes
      this.statusDot.classList.remove('working', 'error');
      
      // Add new status class
      if (type !== 'ready') {
        this.statusDot.classList.add(type);
      }
    }

    if (this.statusText) {
      this.statusText.textContent = message;
    }
  }

  setError(message: string): void {
    this.updateStatus('error', message);
    
    // Auto-reset to ready after 5 seconds
    setTimeout(() => {
      if (this.statusText?.textContent === message) {
        this.updateStatus('ready', 'Ready');
      }
    }, 5000);
  }
}

// Export singleton instance
export const topBar = new TopBar();
