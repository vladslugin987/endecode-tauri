// Progress bar component for visual feedback

class ProgressBar {
  private progressBarElement: HTMLElement | null = null;
  private progressFillElement: HTMLElement | null = null;
  private currentProgress = 0;

  initialize(): void {
    this.progressBarElement = document.getElementById('progress-bar');
    this.progressFillElement = document.getElementById('progress-fill');
    this.hide();
  }

  show(): void {
    if (this.progressBarElement) {
      this.progressBarElement.style.display = 'block';
    }
  }

  hide(): void {
    if (this.progressBarElement) {
      this.progressBarElement.style.display = 'none';
    }
    this.setProgress(0);
  }

  setProgress(percentage: number): void {
    // Clamp percentage between 0 and 100
    this.currentProgress = Math.max(0, Math.min(100, percentage));
    
    if (this.progressFillElement) {
      this.progressFillElement.style.width = `${this.currentProgress}%`;
    }
  }

  getProgress(): number {
    return this.currentProgress;
  }

  // Animate progress smoothly
  animateToProgress(targetPercentage: number, duration = 500): Promise<void> {
    return new Promise((resolve) => {
      const startProgress = this.currentProgress;
      const targetProgress = Math.max(0, Math.min(100, targetPercentage));
      const progressDiff = targetProgress - startProgress;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Use easing function for smooth animation
        const easedProgress = this.easeOutCubic(progress);
        const currentProgress = startProgress + (progressDiff * easedProgress);
        
        this.setProgress(currentProgress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  // Easing function for smooth animation
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // Simulate progress for operations without real progress tracking
  simulateProgress(totalDuration = 3000): Promise<void> {
    return new Promise((resolve) => {
      this.show();
      
      // Simulate progress with realistic timing
      const steps = [
        { progress: 10, delay: 100 },
        { progress: 25, delay: 300 },
        { progress: 50, delay: 800 },
        { progress: 75, delay: 1200 },
        { progress: 90, delay: 1800 },
        { progress: 100, delay: totalDuration }
      ];

      let currentStep = 0;
      const executeStep = () => {
        if (currentStep < steps.length) {
          const step = steps[currentStep];
          setTimeout(async () => {
            await this.animateToProgress(step.progress, 200);
            currentStep++;
            executeStep();
          }, currentStep === 0 ? 0 : step.delay - (currentStep > 0 ? steps[currentStep - 1].delay : 0));
        } else {
          setTimeout(() => {
            this.hide();
            resolve();
          }, 500);
        }
      };

      executeStep();
    });
  }

  // Pulse animation for indeterminate progress
  startPulse(): void {
    this.show();
    if (this.progressFillElement) {
      this.progressFillElement.style.animation = 'progressPulse 1.5s ease-in-out infinite';
      this.progressFillElement.style.width = '30%';
    }
  }

  stopPulse(): void {
    if (this.progressFillElement) {
      this.progressFillElement.style.animation = '';
    }
    this.hide();
  }
}

// Add CSS animation for pulse effect
const style = document.createElement('style');
style.textContent = `
  @keyframes progressPulse {
    0% { transform: translateX(-100%); }
    50% { transform: translateX(400%); }
    100% { transform: translateX(-100%); }
  }
`;
document.head.appendChild(style);

// Export singleton instance
export const progressBar = new ProgressBar();
