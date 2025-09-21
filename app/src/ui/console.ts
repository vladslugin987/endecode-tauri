// Enhanced Console logging system with beautiful output

import { LogEntry } from './types.js';
import { stateManager } from './state.js';

class ConsoleManager {
  private consoleElement: HTMLElement | null = null;
  private entries: LogEntry[] = [];
  private maxEntries = 1000;

  initialize(): void {
    this.consoleElement = document.getElementById('console-output');
    this.setupEventListeners();
    this.renderWelcome();
  }

  private setupEventListeners(): void {
    // Auto-clear console checkbox
    const autoClearCheckbox = document.getElementById('auto-clear-console') as HTMLInputElement;
    if (autoClearCheckbox) {
      autoClearCheckbox.addEventListener('change', () => {
        stateManager.updatePreferences({ auto_clear_console: autoClearCheckbox.checked });
      });

      // Set initial state
      const preferences = stateManager.getPreferences();
      autoClearCheckbox.checked = preferences.auto_clear_console;
    }

    // Clear console button
    const clearButton = document.getElementById('clear-console-btn');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.clear();
      });
    }

    // Listen for working status changes to auto-clear
    stateManager.onWorkingStatusChanged((status) => {
      if (status.isWorking && stateManager.getPreferences().auto_clear_console) {
        this.clear();
      }
    });
  }

  private renderWelcome(): void {
    if (!this.consoleElement) return;
    
    const title = 'ENDEcode v2.0';
    const subtitle = 'Invisible Watermarks';
    const line = '─'.repeat(53);
    const welcomeHtml = `
      <div class="console-welcome">
        <div class="console-header">
          ╭${line}╮
          │ ${title.padStart((title.length + 38) / 2).padEnd(53)} │
          │ ${subtitle.padStart((subtitle.length + 40) / 2).padEnd(53)} │
          ╰${line}╯
        </div>
        <div class="console-info">Ready to process files...</div>
      </div>
    `;
    
    this.consoleElement.innerHTML = welcomeHtml;
  }

  log(message: string, type: LogEntry['type'] = 'info'): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      message,
      type
    };

    this.entries.push(entry);
    
    // Limit entries to prevent memory issues
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    this.renderEntry(entry);
    this.scrollToBottom();
  }

  info(message: string): void {
    this.log(message, 'info');
  }

  success(message: string): void {
    this.log(message, 'success');
  }

  error(message: string): void {
    this.log(message, 'error');
  }

  warning(message: string): void {
    this.log(message, 'warning');
  }

  clear(): void {
    this.entries = [];
    if (this.consoleElement) {
      this.consoleElement.innerHTML = '';
      this.renderWelcome();
    }
  }

  private renderEntry(entry: LogEntry): void {
    if (!this.consoleElement) return;

    const timestamp = entry.timestamp.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const icons = {
      info: '🔷',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    };

    const icon = icons[entry.type];

    const entryHtml = `
      <div class="console-entry console-${entry.type}">
        <span class="console-timestamp">[${timestamp}]</span>
        <span class="console-icon">${icon}</span>
        <span class="console-message">${this.escapeHtml(entry.message)}</span>
      </div>
    `;

    this.consoleElement.insertAdjacentHTML('beforeend', entryHtml);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private scrollToBottom(): void {
    if (this.consoleElement) {
      this.consoleElement.scrollTop = this.consoleElement.scrollHeight;
    }
  }

  // Enhanced logging methods for better UX
  
  operation(operationName: string): void {
    this.log(`──── ${operationName.toUpperCase()} ────`, 'info');
  }

  progress(current: number, total: number, operation: string): void {
    const percentage = Math.round((current / total) * 100);
    const progressBar = this.createProgressBar(percentage);
    this.log(`${operation}: ${progressBar} ${current}/${total} (${percentage}%)`, 'info');
  }

  private createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  result(title: string, data: Record<string, string | number>): void {
    this.log(`╭─ ${title} ─╮`, 'info');
    Object.entries(data).forEach(([key, value]) => {
      this.log(`│ ${key}: ${value}`, 'info');
    });
    this.log(`╰${'─'.repeat(title.length + 4)}╯`, 'info');
  }

  separator(): void {
    this.log('═'.repeat(50), 'info');
  }

  // Public methods for external access
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  getLastEntry(): LogEntry | null {
    return this.entries.length > 0 ? this.entries[this.entries.length - 1] : null;
  }

  hasErrors(): boolean {
    return this.entries.some(entry => entry.type === 'error');
  }

  exportLogs(): string {
    return this.entries.map(entry => {
      const timestamp = entry.timestamp.toISOString();
      return `[${timestamp}] ${entry.type.toUpperCase()}: ${entry.message}`;
    }).join('\n');
  }
}

// Export singleton instance
export const consoleManager = new ConsoleManager();