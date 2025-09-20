// File operations component (Encrypt/Decrypt) with enhanced console output

import { invoke } from '@tauri-apps/api/core';
import { stateManager } from './state.js';
import { consoleManager } from './console.js';
import { progressBar } from './progressBar.js';
import { topBar } from './topbar.js';

class FileOperations {
  private encryptBtn: HTMLButtonElement | null = null;
  private decryptBtn: HTMLButtonElement | null = null;
  private injectTextInput: HTMLInputElement | null = null;

  initialize(): void {
    this.encryptBtn = document.getElementById('encrypt-btn') as HTMLButtonElement;
    this.decryptBtn = document.getElementById('decrypt-btn') as HTMLButtonElement;
    this.injectTextInput = document.getElementById('inject-text') as HTMLInputElement;

    this.setupEventListeners();
    this.updateButtonStates();

    // Listen for state changes
    stateManager.onSelectedPathChanged(() => this.updateButtonStates());
    stateManager.onWorkingStatusChanged(() => this.updateButtonStates());
  }

  private setupEventListeners(): void {
    this.encryptBtn?.addEventListener('click', () => this.encryptFiles());
    this.decryptBtn?.addEventListener('click', () => this.decryptFiles());
    
    // Update button states when text input changes
    this.injectTextInput?.addEventListener('input', () => this.updateButtonStates());
  }

  private updateButtonStates(): void {
    const hasPath = !!stateManager.getSelectedPath();
    const isWorking = stateManager.isCurrentlyWorking();
    const hasText = !!this.injectTextInput?.value.trim();

    if (this.encryptBtn) {
      this.encryptBtn.disabled = !hasPath || !hasText || isWorking;
    }
    if (this.decryptBtn) {
      this.decryptBtn.disabled = !hasPath || isWorking;
    }
  }

  async encryptFiles(): Promise<void> {
    const selectedPath = stateManager.getSelectedPath();
    if (!selectedPath) {
      consoleManager.error('No folder selected');
      return;
    }

    const textToInject = this.injectTextInput?.value.trim();
    if (!textToInject) {
      consoleManager.error('Watermark text is required');
      return;
    }
    
    stateManager.setWorkingStatus(true, 'Encrypting Files');
    topBar.updateStatus('working', 'Encrypting...');
    
    consoleManager.operation('File Encryption');
    consoleManager.info(`Folder: ${selectedPath}`);
    consoleManager.info(`Watermark: "${textToInject}"`);

    try {
      const progressPromise = progressBar.simulateProgress(3000);

      const files = await invoke<string[]>('get_supported_files', { 
        dir: selectedPath 
      });

      if (files.length === 0) {
        consoleManager.warning('No supported files found');
        return;
      }

      consoleManager.info(`Found ${files.length} supported files`);
      consoleManager.separator();

      let successCount = 0;
      let alreadyWatermarked = 0;
      let errorCount = 0;

      for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const fileName = filePath.split(/[/\\]/).pop() || filePath;

        try {
          const result = await invoke<boolean>('add_tail_watermark', {
            path: filePath,
            text: textToInject
          });

          if (result) {
            consoleManager.success(`${fileName}`);
            successCount++;
          } else {
            consoleManager.warning(`${fileName} (already watermarked)`);
            alreadyWatermarked++;
          }
        } catch (error) {
          consoleManager.error(`${fileName}: ${error}`);
          errorCount++;
        }

        const progress = ((i + 1) / files.length) * 100;
        progressBar.setProgress(progress);
      }

      await progressPromise;

      consoleManager.separator();
      consoleManager.result('Encryption Results', {
        'Total Files': files.length,
        'Encrypted': successCount,
        'Already Watermarked': alreadyWatermarked,
        'Errors': errorCount
      });

      if (errorCount === 0) {
        consoleManager.success('Encryption completed successfully!');
      } else {
        consoleManager.warning(`Completed with ${errorCount} errors`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      consoleManager.error(`Encryption failed: ${errorMessage}`);
      topBar.setError('Encryption failed');
    } finally {
      stateManager.setWorkingStatus(false);
      topBar.updateStatus('ready', 'Ready');
    }
  }

  async decryptFiles(): Promise<void> {
    const selectedPath = stateManager.getSelectedPath();
    if (!selectedPath) {
      consoleManager.error('No folder selected');
      return;
    }

    stateManager.setWorkingStatus(true, 'Decrypting Files');
    topBar.updateStatus('working', 'Decrypting...');
    
    consoleManager.operation('File Decryption');
    consoleManager.info(`Folder: ${selectedPath}`);

    try {
      const progressPromise = progressBar.simulateProgress(2000);

      const files = await invoke<string[]>('get_supported_files', { 
        dir: selectedPath 
      });

      if (files.length === 0) {
        consoleManager.warning('No supported files found');
        return;
      }

      consoleManager.info(`Found ${files.length} supported files`);
      consoleManager.separator();

      let foundWatermarks = 0;
      let noWatermarks = 0;
      let errorCount = 0;

      for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const fileName = filePath.split(/[/\\]/).pop() || filePath;

        try {
          const watermark = await invoke<string | null>('extract_tail_watermark', {
            path: filePath
          });

          if (watermark) {
            consoleManager.success(`${fileName}: "${watermark}"`);
            foundWatermarks++;
          } else {
            consoleManager.info(`${fileName}: No watermark`);
            noWatermarks++;
          }
        } catch (error) {
          consoleManager.error(`${fileName}: ${error}`);
          errorCount++;
        }

        const progress = ((i + 1) / files.length) * 100;
        progressBar.setProgress(progress);
      }

      await progressPromise;

      consoleManager.separator();
      consoleManager.result('Decryption Results', {
        'Total Files': files.length,
        'With Watermarks': foundWatermarks,
        'No Watermarks': noWatermarks,
        'Errors': errorCount
      });

      if (errorCount === 0) {
        consoleManager.success('Decryption completed successfully!');
      } else {
        consoleManager.warning(`Completed with ${errorCount} errors`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      consoleManager.error(`Decryption failed: ${errorMessage}`);
      topBar.setError('Decryption failed');
    } finally {
      stateManager.setWorkingStatus(false);
      topBar.updateStatus('ready', 'Ready');
    }
  }
}

export const fileOperations = new FileOperations();