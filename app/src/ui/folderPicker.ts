// Folder picker component

import { open } from '@tauri-apps/plugin-dialog';
import { stateManager } from './state.js';
import { consoleManager } from './console.js';

class FolderPicker {
  private selectFolderBtn: HTMLButtonElement | null = null;
  private openFolderBtn: HTMLButtonElement | null = null;
  private pathValueElement: HTMLElement | null = null;

  initialize(): void {
    this.selectFolderBtn = document.getElementById('select-folder-btn') as HTMLButtonElement;
    this.openFolderBtn = document.getElementById('open-folder-btn') as HTMLButtonElement;
    this.pathValueElement = document.getElementById('path-value');

    this.setupEventListeners();
    this.updateUI();
  }

  private setupEventListeners(): void {
    // Select folder button
    if (this.selectFolderBtn) {
      this.selectFolderBtn.addEventListener('click', () => {
        this.selectFolder();
      });
    }

    // Open folder button
    if (this.openFolderBtn) {
      this.openFolderBtn.addEventListener('click', () => {
        this.openInExplorer();
      });
    }

    // Listen for state changes
    stateManager.onSelectedPathChanged(() => {
      this.updateUI();
      this.updateDependentButtons();
    });

    // Restore last selected path on startup
    const preferences = stateManager.getPreferences();
    if (preferences.last_selected_path) {
      stateManager.setSelectedPath(preferences.last_selected_path);
    }
  }

  private async selectFolder(): Promise<void> {
    try {
      const result = await open({
        directory: true,
        multiple: false,
        title: 'Select Source Folder'
      });

      if (result && typeof result === 'string') {
        stateManager.setSelectedPath(result);
        consoleManager.success(`Selected folder: ${result}`);
      }
    } catch (error) {
      consoleManager.error(`Failed to select folder: ${error}`);
    }
  }

  private async openInExplorer(): Promise<void> {
    const selectedPath = stateManager.getSelectedPath();
    if (!selectedPath) {
      consoleManager.warning('No folder selected');
      return;
    }

    // TODO: Implement folder opening functionality
    // For now, just copy path to clipboard or show in console
    consoleManager.info(`Selected folder path: ${selectedPath}`);
    consoleManager.warning('Open in explorer functionality is not yet implemented');
    
    // Try to copy to clipboard if available
    try {
      await navigator.clipboard.writeText(selectedPath);
      consoleManager.success('Path copied to clipboard');
    } catch (error) {
      consoleManager.info('Could not copy to clipboard');
    }
  }

  private updateUI(): void {
    const selectedPath = stateManager.getSelectedPath();
    
    if (this.pathValueElement) {
      this.pathValueElement.textContent = selectedPath || 'No folder selected';
    }

    if (this.openFolderBtn) {
      this.openFolderBtn.disabled = !selectedPath;
    }
  }

  private updateDependentButtons(): void {
    const selectedPath = stateManager.getSelectedPath();
    const hasPath = !!selectedPath;

    // Update buttons that depend on folder selection
    const dependentButtons = [
      'remove-watermarks-btn',
      'add-visible-watermark-btn',
      'run-batch-btn'
    ];

    dependentButtons.forEach(id => {
      const button = document.getElementById(id) as HTMLButtonElement;
      if (button) {
        button.disabled = !hasPath;
      }
    });
  }

  // Public method to get current path
  getCurrentPath(): string | null {
    return stateManager.getSelectedPath();
  }

  // Public method to check if path is selected
  hasPathSelected(): boolean {
    return !!stateManager.getSelectedPath();
  }
}

// Export singleton instance
export const folderPicker = new FolderPicker();
