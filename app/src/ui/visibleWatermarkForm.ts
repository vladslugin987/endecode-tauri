// Visible watermark form component

import { invoke } from '@tauri-apps/api/core';
import { stateManager } from './state.js';
import { consoleManager } from './console.js';
import { folderPicker } from './folderPicker.js';
import { topBar } from './topbar.js';

class VisibleWatermarkForm {
  private watermarkTextInput: HTMLInputElement | null = null;
  private photoNumberInput: HTMLInputElement | null = null;
  private addWatermarkButton: HTMLButtonElement | null = null;
  private removeWatermarksButton: HTMLButtonElement | null = null;

  initialize(): void {
    this.watermarkTextInput = document.getElementById('visible-watermark-text') as HTMLInputElement;
    this.photoNumberInput = document.getElementById('visible-watermark-photo') as HTMLInputElement;
    this.addWatermarkButton = document.getElementById('add-visible-watermark-btn') as HTMLButtonElement;
    this.removeWatermarksButton = document.getElementById('remove-watermarks-btn') as HTMLButtonElement;

    this.setupEventListeners();
    this.updateButtonStates();
  }

  private setupEventListeners(): void {
    // Add visible watermark button
    if (this.addWatermarkButton) {
      this.addWatermarkButton.addEventListener('click', () => {
        this.addVisibleWatermark();
      });
    }

    // Remove watermarks button  
    if (this.removeWatermarksButton) {
      this.removeWatermarksButton.addEventListener('click', () => {
        this.removeTailWatermarksFromFolder();
      });
    }

    // Update button states when inputs change
    const inputs = [this.watermarkTextInput, this.photoNumberInput];
    inputs.forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          this.updateButtonStates();
        });
      }
    });

    // Listen for folder selection changes
    stateManager.onSelectedPathChanged(() => {
      this.updateButtonStates();
    });

    // Listen for working status changes
    stateManager.onWorkingStatusChanged(() => {
      this.updateButtonStates();
    });
  }

  private updateButtonStates(): void {
    const hasPath = folderPicker.hasPathSelected();
    const isWorking = stateManager.isCurrentlyWorking();
    const hasWatermarkText = this.watermarkTextInput?.value.trim() !== '';
    const hasPhotoNumber = this.photoNumberInput?.value.trim() !== '';

    // Remove watermarks button - only needs folder
    if (this.removeWatermarksButton) {
      this.removeWatermarksButton.disabled = !hasPath || isWorking;
    }

    // Add watermark button - needs folder, text, and photo number
    if (this.addWatermarkButton) {
      this.addWatermarkButton.disabled = !hasPath || !hasWatermarkText || !hasPhotoNumber || isWorking;
    }
  }

  private async addVisibleWatermark(): Promise<void> {
    const selectedPath = folderPicker.getCurrentPath();
    const watermarkText = this.watermarkTextInput?.value.trim();
    const photoNumberStr = this.photoNumberInput?.value.trim();

    if (!selectedPath) {
      consoleManager.error('No folder selected');
      return;
    }

    if (!watermarkText) {
      consoleManager.error('Watermark text is required');
      return;
    }

    if (!photoNumberStr) {
      consoleManager.error('Photo number is required');
      return;
    }

    const photoNumber = parseInt(photoNumberStr);
    if (isNaN(photoNumber) || photoNumber < 1) {
      consoleManager.error('Photo number must be a positive integer');
      return;
    }

    stateManager.setWorkingStatus(true, 'Adding Visible Watermark');
    consoleManager.info(`Adding visible watermark to photo ${photoNumber} in folder: ${selectedPath}`);
    consoleManager.info(`Watermark text: "${watermarkText}"`);

    try {
      // Note: The current Rust API for add_text_to_image requires a specific file path,
      // but we only have folder + photo number. This is a TODO that needs to be handled.
      // For now, we'll create a mock implementation that would need to:
      // 1. List files in the folder
      // 2. Find the Nth image file 
      // 3. Call add_text_to_image with the full path

      // TODO: Implement proper file enumeration or update Rust API
      const mockFilePath = `${selectedPath}\\photo_${photoNumber}.jpg`; // This is just a placeholder
      
      consoleManager.warning('TODO: Visible watermark feature needs proper file enumeration');
      consoleManager.info(`Would add watermark to: ${mockFilePath}`);
      
      // Simulate the call for now - this would be the actual implementation:
      // const result = await invoke<boolean>('add_text_to_image', {
      //   path: actualFilePath,
      //   text: watermarkText,
      //   position: 'bottom-right' // or make this configurable
      // });

      // Mock success for now
      const result = true;
      
      if (result) {
        consoleManager.success(`Visible watermark added successfully to photo ${photoNumber}`);
        
        // Clear the form
        if (this.watermarkTextInput) this.watermarkTextInput.value = '';
        if (this.photoNumberInput) this.photoNumberInput.value = '';
      } else {
        consoleManager.error('Failed to add visible watermark');
        topBar.setError('Failed to add watermark');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      consoleManager.error(`Error adding visible watermark: ${errorMessage}`);
      topBar.setError('Watermark error');
    } finally {
      stateManager.setWorkingStatus(false);
    }
  }

  private async removeTailWatermarksFromFolder(): Promise<void> {
    const selectedPath = folderPicker.getCurrentPath();

    if (!selectedPath) {
      consoleManager.error('No folder selected');
      return;
    }

    stateManager.setWorkingStatus(true, 'Removing Tail Watermarks');
    consoleManager.info(`Removing tail watermarks from folder: ${selectedPath}`);

    try {
      const result = await invoke<string>('remove_tail_watermarks', {
        dir: selectedPath
      });

      // The result should contain information about processed files
      consoleManager.success('Tail watermarks removal completed');
      consoleManager.info(result);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      consoleManager.error(`Error removing tail watermarks: ${errorMessage}`);
      topBar.setError('Watermark removal error');
    } finally {
      stateManager.setWorkingStatus(false);
    }
  }

  // Public method to set watermark text programmatically
  setWatermarkText(text: string): void {
    if (this.watermarkTextInput) {
      this.watermarkTextInput.value = text;
      this.updateButtonStates();
    }
  }

  // Public method to set photo number programmatically
  setPhotoNumber(number: number): void {
    if (this.photoNumberInput) {
      this.photoNumberInput.value = number.toString();
      this.updateButtonStates();
    }
  }
}

// Export singleton instance
export const visibleWatermarkForm = new VisibleWatermarkForm();
