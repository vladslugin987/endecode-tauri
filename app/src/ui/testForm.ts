// Quick Test Form component

import { invoke } from '@tauri-apps/api/core';
import { stateManager } from './state.js';
import { consoleManager } from './console.js';

class TestForm {
  private form: HTMLFormElement | null = null;
  private input: HTMLInputElement | null = null;

  initialize(): void {
    this.form = document.getElementById('test-form') as HTMLFormElement;
    this.input = document.getElementById('test-input') as HTMLInputElement;

    this.setupEventListeners();
    this.updateFormState();
  }

  private setupEventListeners(): void {
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.runTest();
      });
    }

    // Listen for working status changes to disable form
    stateManager.onWorkingStatusChanged(() => {
      this.updateFormState();
    });
  }

  private updateFormState(): void {
    const isWorking = stateManager.isCurrentlyWorking();
    const submitButton = this.form?.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    if (this.input) {
      this.input.disabled = isWorking;
    }
    
    if (submitButton) {
      submitButton.disabled = isWorking;
    }
  }

  private async runTest(): Promise<void> {
    const testText = this.input?.value?.trim() || 'Test123';
    
    consoleManager.info(`Running encode/decode test with: "${testText}"`);

    try {
      // Test encode
      const encoded = await invoke<string>('encode_text', { text: testText });
      consoleManager.info(`Encoded: ${encoded}`);

      // Test decode  
      const decoded = await invoke<string>('decode_text', { text: encoded });
      consoleManager.info(`Decoded: ${decoded}`);

      // Test watermark marker
      const marker = await invoke<string>('add_watermark_marker', { text: testText });
      const markerPreview = marker.length > 16 ? `${marker.slice(0, 16)}...` : marker;
      consoleManager.info(`Watermark: ${markerPreview}`);

      // Check if test passed
      const isDecodeCorrect = decoded === testText;
      if (isDecodeCorrect) {
        consoleManager.success(`✓ Quick test PASSED for "${testText}"`);
      } else {
        consoleManager.error(`✗ Quick test FAILED: expected "${testText}", got "${decoded}"`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      consoleManager.error(`Quick test error: ${errorMessage}`);
    }
  }

  // Public methods for external access
  getCurrentText(): string {
    return this.input?.value?.trim() || '';
  }

  async runTestWithText(text: string): Promise<void> {
    if (this.input) {
      this.input.value = text;
      await this.runTest();
    }
  }
}

// Export singleton instance
export const testForm = new TestForm();