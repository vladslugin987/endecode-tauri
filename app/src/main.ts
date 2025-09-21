// Main application entry point

import { preferencesManager } from './ui/preferences.js';
import { stateManager } from './ui/state.js';
import { consoleManager } from './ui/console.js';
import { topBar } from './ui/topbar.js';
import { folderPicker } from './ui/folderPicker.js';
import { testForm } from './ui/testForm.js';
import { batchForm } from './ui/batchForm.js';
import { visibleWatermarkForm } from './ui/visibleWatermarkForm.js';
import { progressBar } from './ui/progressBar.js';
import { fileOperations } from './ui/fileOperations.js';
import { i18n } from './ui/i18n.js';
import { settingsManager } from './ui/settingsManager.js';
import { modalManager } from './ui/modalManager.js';

class Application {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize components in order
      await this.initializeComponents();
      
      // Log successful initialization
      consoleManager.success('ENDEcode application initialized successfully');
      consoleManager.info('Ready to process files and watermarks');

      this.initialized = true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to initialize application:', error);
      
      // Try to show error in console if available
      try {
        consoleManager.error(`Initialization error: ${errorMessage}`);
      } catch {
        // If console manager isn't available, use browser console
        console.error('Console manager also failed');
      }
    }
  }

  private async initializeComponents(): Promise<void> {
    // Initialize console first so we can log other initializations
    consoleManager.initialize();
    consoleManager.info('Initializing ENDEcode application...');

    // Initialize i18n system first
    await i18n.initialize();
    consoleManager.info('Internationalization system loaded');

    // Initialize preferences (loads saved settings)
    await preferencesManager.initialize();
    
    // Initialize new managers
    settingsManager.initialize();
    modalManager.initialize();
    
    // Initialize UI components
    topBar.initialize();
    folderPicker.initialize();
    testForm.initialize();
    fileOperations.initialize();
    batchForm.initialize();
    visibleWatermarkForm.initialize();
    progressBar.initialize();

    // Set up global error handling
    this.setupGlobalErrorHandling();
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();

    // Hide console welcome when user interacts
    this.setupConsoleWelcomeHiding();

    consoleManager.info('All components initialized');
  }

  private setupGlobalErrorHandling(): void {
    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      const error = event.error || event.message;
      consoleManager.error(`Unhandled error: ${error}`);
      topBar.setError('Unexpected error occurred');
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason || 'Unknown promise rejection';
      consoleManager.error(`Unhandled promise rejection: ${error}`);
      topBar.setError('Async operation failed');
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (event) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + T: Toggle theme
      if ((event.ctrlKey || event.metaKey) && event.key === 't') {
        event.preventDefault();
        stateManager.toggleTheme();
        consoleManager.info('Theme toggled via keyboard shortcut');
      }

      // Ctrl/Cmd + L: Clear console
      if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault();
        consoleManager.clear();
        consoleManager.info('Console cleared via keyboard shortcut');
      }

      // Ctrl/Cmd + R: Run quick test (if not working)
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        if (!stateManager.isCurrentlyWorking()) {
          event.preventDefault();
          testForm.runTestWithText(testForm.getCurrentText() || 'Quick Test');
          consoleManager.info('Quick test triggered via keyboard shortcut');
        }
      }

      // Escape: Cancel current operation (future feature)
      if (event.key === 'Escape') {
        if (stateManager.isCurrentlyWorking()) {
          // TODO: Implement operation cancellation
          consoleManager.warning('Operation cancellation not yet implemented');
        }
      }
    });
  }

  private setupConsoleWelcomeHiding(): void {
    const welcomeElement = document.getElementById('console-welcome');
    if (!welcomeElement) return;

    // Hide welcome when user interacts with the app
    const hideWelcome = () => {
      if (welcomeElement) {
        welcomeElement.style.display = 'none';
      }
    };

    // Listen for folder selection
    stateManager.onSelectedPathChanged(hideWelcome);
    
    // Listen for any operation start
    stateManager.onWorkingStatusChanged((isWorking) => {
      if (isWorking) {
        hideWelcome();
      }
    });
  }

  // Public methods for external access
  isInitialized(): boolean {
    return this.initialized;
  }

  async restart(): Promise<void> {
    consoleManager.info('Restarting application...');
    this.initialized = false;
    await this.initialize();
  }

  // Export current settings for debugging
  exportDebugInfo(): string {
    const debugInfo = {
      initialized: this.initialized,
      preferences: stateManager.getPreferences(),
      selectedPath: stateManager.getSelectedPath(),
      isWorking: stateManager.isCurrentlyWorking(),
      currentOperation: stateManager.getCurrentOperation(),
      consoleEntries: consoleManager.getEntries().length,
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(debugInfo, null, 2);
  }
}

// Create global application instance
const app = new Application();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  await app.initialize();
});

// Make app available globally for debugging
(window as any).endecodeApp = app;
