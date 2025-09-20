// Batch operation form component

import { invoke } from '@tauri-apps/api/core';
import { BatchOptions } from './types.js';
import { stateManager } from './state.js';
import { consoleManager } from './console.js';
import { folderPicker } from './folderPicker.js';
import { topBar } from './topbar.js';
import { progressBar } from './progressBar.js';

class BatchForm {
  private form: HTMLFormElement | null = null;
  private baseTextInput: HTMLInputElement | null = null;
  private numCopiesInput: HTMLInputElement | null = null;
  private addSwapCheckbox: HTMLInputElement | null = null;
  private addWatermarkCheckbox: HTMLInputElement | null = null;
  private createZipCheckbox: HTMLInputElement | null = null;
  private watermarkTextInput: HTMLInputElement | null = null;
  private photoNumberInput: HTMLInputElement | null = null;
  private submitButton: HTMLButtonElement | null = null;

  initialize(): void {
    this.form = document.getElementById('batch-form') as HTMLFormElement;
    this.baseTextInput = document.getElementById('batch-base-text') as HTMLInputElement;
    this.numCopiesInput = document.getElementById('batch-num-copies') as HTMLInputElement;
    this.addSwapCheckbox = document.getElementById('batch-add-swap') as HTMLInputElement;
    this.addWatermarkCheckbox = document.getElementById('batch-add-watermark') as HTMLInputElement;
    this.createZipCheckbox = document.getElementById('batch-create-zip') as HTMLInputElement;
    this.watermarkTextInput = document.getElementById('batch-watermark-text') as HTMLInputElement;
    this.photoNumberInput = document.getElementById('batch-photo-number') as HTMLInputElement;
    this.submitButton = document.getElementById('run-batch-btn') as HTMLButtonElement;

    this.setupEventListeners();
    this.updateButtonState();
  }

  private setupEventListeners(): void {
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.runBatchOperation();
      });
    }

    // Listen for input changes to validate form
    const inputs = [this.baseTextInput, this.numCopiesInput];
    inputs.forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          this.updateButtonState();
        });
      }
    });

    // Listen for folder selection changes
    stateManager.onSelectedPathChanged(() => {
      this.updateButtonState();
    });

    // Listen for working status changes
    stateManager.onWorkingStatusChanged(() => {
      this.updateButtonState();
    });
  }

  private updateButtonState(): void {
    if (!this.submitButton) return;

    const hasPath = folderPicker.hasPathSelected();
    const hasBaseText = this.baseTextInput?.value.trim() !== '';
    const hasValidCopies = this.numCopiesInput && parseInt(this.numCopiesInput.value) >= 1;
    const isWorking = stateManager.isCurrentlyWorking();

    const isValid = hasPath && hasBaseText && hasValidCopies && !isWorking;
    this.submitButton.disabled = !isValid;
  }

  private validateForm(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check folder selection
    if (!folderPicker.hasPathSelected()) {
      errors.push('Please select a source folder');
    }

    // Check base text
    if (!this.baseTextInput?.value.trim()) {
      errors.push('Base text is required');
    }

    // Check number of copies
    const numCopies = this.numCopiesInput ? parseInt(this.numCopiesInput.value) : 0;
    if (numCopies < 1) {
      errors.push('Number of copies must be at least 1');
    }

    // Check if already working
    if (stateManager.isCurrentlyWorking()) {
      errors.push('Another operation is already in progress');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private getBatchOptions(): BatchOptions {
    const sourceFolder = folderPicker.getCurrentPath() || '';
    const baseText = this.baseTextInput?.value.trim() || '';
    const numCopies = this.numCopiesInput ? parseInt(this.numCopiesInput.value) : 1;
    const addSwap = this.addSwapCheckbox?.checked || false;
    const addWatermark = this.addWatermarkCheckbox?.checked || false;
    const createZip = this.createZipCheckbox?.checked || false;
    const watermarkText = this.watermarkTextInput?.value.trim() || undefined;
    const photoNumberStr = this.photoNumberInput?.value.trim();
    const photoNumber = photoNumberStr ? parseInt(photoNumberStr) : undefined;

    return {
      sourceFolder,
      baseText,
      numCopies,
      addSwap,
      addWatermark,
      createZip,
      watermarkText,
      photoNumber
    };
  }

  private async runBatchOperation(): Promise<void> {
    // Validate form
    const validation = this.validateForm();
    if (!validation.isValid) {
      validation.errors.forEach(error => consoleManager.error(error));
      return;
    }

    // Get batch options
    const options = this.getBatchOptions();
    
    // Set working status
    stateManager.setWorkingStatus(true, 'Batch Copy & Encode');
    
    consoleManager.info(`Starting batch operation:`);
    consoleManager.info(`  Source: ${options.sourceFolder}`);
    consoleManager.info(`  Base text: "${options.baseText}"`);
    consoleManager.info(`  Copies: ${options.numCopies}`);
    consoleManager.info(`  Options: swap=${options.addSwap}, watermark=${options.addWatermark}, zip=${options.createZip}`);
    
    if (options.watermarkText) {
      consoleManager.info(`  Watermark text: "${options.watermarkText}"`);
    }
    
    if (options.photoNumber) {
      consoleManager.info(`  Photo number: ${options.photoNumber}`);
    }

    try {
      // Start progress simulation
      const progressPromise = progressBar.simulateProgress(5000);
      
      const result = await invoke<boolean>('batch_copy_and_encode', {
        sourceFolder: options.sourceFolder,
        numCopies: options.numCopies,
        baseText: options.baseText,
        addSwap: options.addSwap,
        addWatermark: options.addWatermark,
        createZip: options.createZip,
        watermarkText: options.watermarkText,
        photoNumber: options.photoNumber
      });

      // Wait for progress to complete
      await progressPromise;

      if (result) {
        consoleManager.success('Batch operation completed successfully!');
        
        // Show output location
        const outputPath = `${options.sourceFolder}-Copies`;
        consoleManager.info(`Output location: ${outputPath}`);
        
        if (options.createZip) {
          consoleManager.info('ZIP archives created in the output folder');
        }
      } else {
        consoleManager.error('Batch operation failed');
        topBar.setError('Batch operation failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      consoleManager.error(`Batch operation error: ${errorMessage}`);
      topBar.setError('Batch operation error');
    } finally {
      stateManager.setWorkingStatus(false);
    }
  }

  // Public method to trigger batch operation programmatically
  async triggerBatchOperation(options?: Partial<BatchOptions>): Promise<void> {
    if (options) {
      // Set form values from options
      if (options.baseText && this.baseTextInput) {
        this.baseTextInput.value = options.baseText;
      }
      if (options.numCopies && this.numCopiesInput) {
        this.numCopiesInput.value = options.numCopies.toString();
      }
      if (options.addSwap !== undefined && this.addSwapCheckbox) {
        this.addSwapCheckbox.checked = options.addSwap;
      }
      if (options.addWatermark !== undefined && this.addWatermarkCheckbox) {
        this.addWatermarkCheckbox.checked = options.addWatermark;
      }
      if (options.createZip !== undefined && this.createZipCheckbox) {
        this.createZipCheckbox.checked = options.createZip;
      }
      if (options.watermarkText && this.watermarkTextInput) {
        this.watermarkTextInput.value = options.watermarkText;
      }
      if (options.photoNumber && this.photoNumberInput) {
        this.photoNumberInput.value = options.photoNumber.toString();
      }
    }

    await this.runBatchOperation();
  }
}

// Export singleton instance
export const batchForm = new BatchForm();
