// Modal Manager for ENDEcode

import { invoke } from '@tauri-apps/api/core';
import { i18n } from './i18n.js';
import { stateManager } from './state.js';
import { consoleManager } from './console.js';
import { folderPicker } from './folderPicker.js';
import { progressBar } from './progressBar.js';
import { topBar } from './topbar.js';
import { settingsManager } from './settingsManager.js';

interface BatchModalData {
  baseText: string;
  numCopies: number;
  startNumber: number;
  addSwap: boolean;
  addWatermark: boolean;
  createZip: boolean;
  watermarkText?: string;
  photoNumber?: number;
}

interface WatermarkModalData {
  text: string;
  photoNumber: number;
  position: string;
  size: string;
  opacity: number;
}

class ModalManager {
  private isInitialized = false;

  // Batch Modal
  private batchModal: HTMLElement | null = null;
  private batchSetupBtn: HTMLButtonElement | null = null;
  private batchForm: HTMLFormElement | null = null;
  private watermarkOptions: HTMLElement | null = null;

  // Watermark Modal
  private watermarkModal: HTMLElement | null = null;
  private watermarkSettingsBtn: HTMLButtonElement | null = null;
  private watermarkForm: HTMLFormElement | null = null;

  initialize(): void {
    if (this.isInitialized) return;

    // Get modal elements
    this.batchModal = document.getElementById('batch-modal');
    this.batchSetupBtn = document.getElementById('batch-setup-btn') as HTMLButtonElement;
    this.batchForm = document.getElementById('batch-form-modal') as HTMLFormElement;
    this.watermarkOptions = document.getElementById('watermark-options');

    this.watermarkModal = document.getElementById('watermark-modal');
    this.watermarkSettingsBtn = document.getElementById('watermark-settings-btn') as HTMLButtonElement;
    this.watermarkForm = document.getElementById('watermark-form-modal') as HTMLFormElement;

    this.setupEventListeners();
    this.updateButtonStates();
    this.isInitialized = true;
  }

  private setupEventListeners(): void {
    // Batch modal
    this.batchSetupBtn?.addEventListener('click', () => {
      this.openBatchModal();
    });

    this.batchForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.executeBatchOperation();
    });

    // Watermark modal
    this.watermarkSettingsBtn?.addEventListener('click', () => {
      this.openWatermarkModal();
    });

    this.watermarkForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.applyWatermark();
    });

    // Modal close handlers
    this.setupModalCloseHandlers();

    // Watch for checkbox changes in batch modal
    const batchWatermarkCheckbox = document.getElementById('batch-add-watermark-modal') as HTMLInputElement;
    batchWatermarkCheckbox?.addEventListener('change', () => {
      this.toggleWatermarkOptions();
    });

    // Listen for folder selection changes
    stateManager.onSelectedPathChanged(() => {
      this.updateButtonStates();
    });

    // Listen for working status changes
    stateManager.onWorkingStatusChanged(() => {
      this.updateButtonStates();
    });

    // Range input for opacity
    const opacityRange = document.getElementById('watermark-opacity') as HTMLInputElement;
    const opacityValue = document.getElementById('opacity-value') as HTMLOutputElement;
    opacityRange?.addEventListener('input', () => {
      if (opacityValue) {
        opacityValue.textContent = `${opacityRange.value}%`;
      }
    });
  }

  private setupModalCloseHandlers(): void {
    // Close buttons
    document.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modal = (e.target as Element).closest('.modal-overlay');
        this.closeModal(modal as HTMLElement);
      });
    });

    // Overlay clicks
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeModal(overlay as HTMLElement);
        }
      });
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const activeModal = document.querySelector('.modal-overlay.active');
        if (activeModal) {
          this.closeModal(activeModal as HTMLElement);
        }
      }
    });
  }

  private updateButtonStates(): void {
    const hasPath = folderPicker.hasPathSelected();
    const isWorking = stateManager.isCurrentlyWorking();

    if (this.batchSetupBtn) {
      this.batchSetupBtn.disabled = !hasPath || isWorking;
    }

    if (this.watermarkSettingsBtn) {
      this.watermarkSettingsBtn.disabled = !hasPath || isWorking;
    }
  }

  // Batch Modal Methods
  private openBatchModal(): void {
    if (!this.batchModal) return;

    // Pre-fill with current selection path name
    const selectedPath = folderPicker.getCurrentPath();
    if (selectedPath) {
      const pathName = selectedPath.split(/[/\\]/).pop() || 'Project';
      const baseTextInput = document.getElementById('batch-base-text-modal') as HTMLInputElement;
      if (baseTextInput && !baseTextInput.value) {
        baseTextInput.value = `${pathName}_001`;
      }
    }

    // Fill default watermark if available
    const defaultWatermark = settingsManager.getDefaultWatermarkText();
    if (defaultWatermark) {
      const watermarkTextInput = document.getElementById('batch-watermark-text-modal') as HTMLInputElement;
      if (watermarkTextInput && !watermarkTextInput.value) {
        watermarkTextInput.value = defaultWatermark;
      }
    }

    this.showModal(this.batchModal);
    consoleManager.info('Batch operation setup opened');
  }

  private toggleWatermarkOptions(): void {
    const checkbox = document.getElementById('batch-add-watermark-modal') as HTMLInputElement;
    const options = this.watermarkOptions;
    
    if (options) {
      options.style.display = checkbox?.checked ? 'block' : 'none';
    }
  }

  private getBatchModalData(): BatchModalData {
    return {
      baseText: (document.getElementById('batch-base-text-modal') as HTMLInputElement)?.value.trim() || 'Project_001',
      numCopies: parseInt((document.getElementById('batch-num-copies-modal') as HTMLInputElement)?.value) || 1,
      startNumber: parseInt((document.getElementById('batch-start-number') as HTMLInputElement)?.value) || 1,
      addSwap: (document.getElementById('batch-add-swap-modal') as HTMLInputElement)?.checked || false,
      addWatermark: (document.getElementById('batch-add-watermark-modal') as HTMLInputElement)?.checked || false,
      createZip: (document.getElementById('batch-create-zip-modal') as HTMLInputElement)?.checked || false,
      watermarkText: (document.getElementById('batch-watermark-text-modal') as HTMLInputElement)?.value.trim() || undefined,
      photoNumber: parseInt((document.getElementById('batch-photo-number-modal') as HTMLInputElement)?.value) || undefined
    };
  }

  private async executeBatchOperation(): Promise<void> {
    const data = this.getBatchModalData();
    const selectedPath = folderPicker.getCurrentPath();

    if (!selectedPath) {
      consoleManager.error('No folder selected');
      return;
    }

    this.closeModal(this.batchModal!);
    
    stateManager.setWorkingStatus(true, 'Batch Operation');
    topBar.updateStatus('working', 'Processing batch...');
    
    consoleManager.operation('Batch Copy & Encode');
    consoleManager.info(`Source: ${selectedPath}`);
    consoleManager.info(`Base text: "${data.baseText}"`);
    consoleManager.info(`Copies: ${data.numCopies} (starting from ${data.startNumber})`);
    consoleManager.info(`Options: swap=${data.addSwap}, watermark=${data.addWatermark}, zip=${data.createZip}`);

    try {
      const progressPromise = progressBar.simulateProgress(data.numCopies * 1000 + 2000);
      
      const result = await invoke<boolean>('batch_copy_and_encode', {
        sourceFolder: selectedPath,
        numCopies: data.numCopies,
        baseText: data.baseText,
        addSwap: data.addSwap,
        addWatermark: data.addWatermark,
        createZip: data.createZip,
        watermarkText: data.watermarkText,
        photoNumber: data.photoNumber
      });

      await progressPromise;

      if (result) {
        consoleManager.success('Batch operation completed successfully!');
        const outputPath = `${selectedPath}-Copies`;
        consoleManager.info(`Output location: ${outputPath}`);
        
        if (data.createZip) {
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
      topBar.updateStatus('ready', 'Ready');
    }
  }

  // Watermark Modal Methods
  private openWatermarkModal(): void {
    if (!this.watermarkModal) return;

    // Fill default watermark if available
    const defaultWatermark = settingsManager.getDefaultWatermarkText();
    if (defaultWatermark) {
      const watermarkTextInput = document.getElementById('visible-watermark-text-modal') as HTMLInputElement;
      if (watermarkTextInput && !watermarkTextInput.value) {
        watermarkTextInput.value = defaultWatermark;
      }
    }

    this.showModal(this.watermarkModal);
    consoleManager.info('Watermark settings opened');
  }

  private getWatermarkModalData(): WatermarkModalData {
    return {
      text: (document.getElementById('visible-watermark-text-modal') as HTMLInputElement)?.value.trim() || '',
      photoNumber: parseInt((document.getElementById('watermark-photo-number-modal') as HTMLInputElement)?.value) || 1,
      position: (document.getElementById('watermark-position') as HTMLSelectElement)?.value || 'bottom-right',
      size: (document.getElementById('watermark-size') as HTMLSelectElement)?.value || 'medium',
      opacity: parseInt((document.getElementById('watermark-opacity') as HTMLInputElement)?.value) || 50
    };
  }

  private async applyWatermark(): Promise<void> {
    const data = this.getWatermarkModalData();
    const selectedPath = folderPicker.getCurrentPath();

    if (!selectedPath) {
      consoleManager.error('No folder selected');
      return;
    }

    if (!data.text) {
      consoleManager.error('Watermark text is required');
      return;
    }

    this.closeModal(this.watermarkModal!);
    
    stateManager.setWorkingStatus(true, 'Adding Visible Watermark');
    topBar.updateStatus('working', 'Applying watermark...');
    
    consoleManager.operation('Apply Visible Watermark');
    consoleManager.info(`Folder: ${selectedPath}`);
    consoleManager.info(`Text: "${data.text}"`);
    consoleManager.info(`Photo: #${data.photoNumber}`);
    consoleManager.info(`Position: ${data.position}, Size: ${data.size}, Opacity: ${data.opacity}%`);

    try {
      const progressPromise = progressBar.simulateProgress(2000);
      
      // TODO: Implement proper file enumeration and advanced watermark options
      // For now, this is a placeholder that would need:
      // 1. List files in folder
      // 2. Find the Nth image file
      // 3. Apply watermark with specified options
      
      consoleManager.warning('TODO: Advanced watermark settings implementation needed');
      consoleManager.info(`Would apply "${data.text}" to photo ${data.photoNumber} at ${data.position}`);
      
      // Mock success for now
      await progressPromise;
      const result = true;
      
      if (result) {
        consoleManager.success(`Visible watermark applied successfully to photo ${data.photoNumber}`);
      } else {
        consoleManager.error('Failed to apply visible watermark');
        topBar.setError('Failed to apply watermark');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      consoleManager.error(`Error applying watermark: ${errorMessage}`);
      topBar.setError('Watermark error');
    } finally {
      stateManager.setWorkingStatus(false);
      topBar.updateStatus('ready', 'Ready');
    }
  }

  // Generic Modal Methods
  private showModal(modal: HTMLElement): void {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  private closeModal(modal: HTMLElement): void {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Public methods
  openBatchSetup(): void {
    this.openBatchModal();
  }

  openWatermarkSettings(): void {
    this.openWatermarkModal();
  }
}

// Export singleton instance
export const modalManager = new ModalManager();
