// Enhanced Console logging system with beautiful output

import { LogEntry } from './types.js';
import { stateManager } from './state.js';

class ConsoleManager {
  private consoleElement: HTMLElement | null = null;
  private entries: LogEntry[] = [];
  private maxEntries = 1000;
  private currentFilter: string = 'all';

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

    // Filter dropdown
    const filterSelect = document.getElementById('console-filter') as HTMLSelectElement;
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.currentFilter = target.value;
        this.applyFilter();
      });
    }

    // Copy logs button
    const copyButton = document.getElementById('copy-logs-btn');
    if (copyButton) {
      copyButton.addEventListener('click', () => {
        this.copyLogs();
      });
    }

    // Download logs button
    const downloadButton = document.getElementById('download-logs-btn');
    if (downloadButton) {
      downloadButton.addEventListener('click', () => {
        this.downloadLogs();
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
          │ ${title.padStart((title.length + 38) / 2).padEnd(50)} │
          │ ${subtitle.padStart((subtitle.length + 40) / 2).padEnd(50)} │
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

    // Create element with animation
    const entryDiv = document.createElement('div');
    entryDiv.className = `console-entry console-${entry.type}`;
    entryDiv.style.opacity = '0';
    entryDiv.style.transform = 'translateY(10px)';
    entryDiv.dataset.type = entry.type; // For filtering
    
    entryDiv.innerHTML = `
      <span class="console-timestamp">[${timestamp}]</span>
      <span class="console-icon"></span>
      <span class="console-message">${this.escapeHtml(entry.message)}</span>
    `;
    
    this.consoleElement.appendChild(entryDiv);
    
    // Animate entry appearance
    requestAnimationFrame(() => {
      entryDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      entryDiv.style.opacity = '1';
      entryDiv.style.transform = 'translateY(0)';
    });
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

  // Filter logs by type
  private applyFilter(): void {
    if (!this.consoleElement) return;
    
    const entries = this.consoleElement.querySelectorAll('.console-entry');
    entries.forEach((entry) => {
      const htmlEntry = entry as HTMLElement;
      const type = htmlEntry.dataset.type;
      
      if (this.currentFilter === 'all' || type === this.currentFilter) {
        htmlEntry.style.display = 'flex';
      } else {
        htmlEntry.style.display = 'none';
      }
    });
  }

  // Copy all logs to clipboard
  private copyLogs(): void {
    const text = this.entries.map(entry => {
      const timestamp = entry.timestamp.toLocaleTimeString('ru-RU');
      return `[${timestamp}] [${entry.type.toUpperCase()}] ${entry.message}`;
    }).join('\n');

    navigator.clipboard.writeText(text).then(() => {
      this.success('Logs copied to clipboard!');
    }).catch(() => {
      this.error('Failed to copy logs');
    });
  }

  // Download logs as text file
  private downloadLogs(): void {
    const text = this.entries.map(entry => {
      const timestamp = entry.timestamp.toISOString();
      return `[${timestamp}] [${entry.type.toUpperCase()}] ${entry.message}`;
    }).join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `endecode-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    this.success('Logs downloaded!');
  }
}

// Export singleton instance
export const consoleManager = new ConsoleManager();