// Internationalization (i18n) manager for ENDEcode

interface Translations {
  [key: string]: any;
}

interface I18nConfig {
  fallbackLang: string;
  supportedLanguages: string[];
  storageKey: string;
}

class I18nManager {
  private translations: Map<string, Translations> = new Map();
  private currentLang: string = 'en';
  private config: I18nConfig = {
    fallbackLang: 'en',
    supportedLanguages: ['en', 'ru', 'es'],
    storageKey: 'endecode_language'
  };

  async initialize(): Promise<void> {
    // Load saved language or detect from browser
    const savedLang = localStorage.getItem(this.config.storageKey);
    const browserLang = navigator.language.split('-')[0];
    
    this.currentLang = savedLang || 
      (this.config.supportedLanguages.includes(browserLang) ? browserLang : this.config.fallbackLang);

    // Load all translations
    await this.loadTranslations();
    
    // Apply initial translations
    this.updateDOM();
  }

  private async loadTranslations(): Promise<void> {
    try {
      // Load all supported languages
      for (const lang of this.config.supportedLanguages) {
        const response = await fetch(`/src/i18n/${lang}.json`);
        if (response.ok) {
          const translations = await response.json();
          this.translations.set(lang, translations);
        }
      }
    } catch (error) {
      console.error('Failed to load translations:', error);
    }
  }

  async setLanguage(lang: string): Promise<void> {
    if (!this.config.supportedLanguages.includes(lang)) {
      console.warn(`Language ${lang} is not supported`);
      return;
    }

    this.currentLang = lang;
    localStorage.setItem(this.config.storageKey, lang);
    
    // Update DOM
    this.updateDOM();
    
    // Trigger language change event
    this.dispatchLanguageChange(lang);
  }

  getCurrentLanguage(): string {
    return this.currentLang;
  }

  getSupportedLanguages(): string[] {
    return this.config.supportedLanguages;
  }

  translate(key: string, params?: { [key: string]: string }): string {
    const translation = this.getNestedTranslation(key, this.currentLang) ||
                       this.getNestedTranslation(key, this.config.fallbackLang) ||
                       key;

    // Replace parameters if provided
    if (params && typeof translation === 'string') {
      return Object.entries(params).reduce((text, [param, value]) => {
        return text.replace(new RegExp(`{{${param}}}`, 'g'), value);
      }, translation);
    }

    return translation;
  }

  private getNestedTranslation(key: string, lang: string): string | null {
    const translations = this.translations.get(lang);
    if (!translations) return null;

    const keys = key.split('.');
    let current: any = translations;

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return null;
      }
    }

    return typeof current === 'string' ? current : null;
  }

  private updateDOM(): void {
    // Update elements with data-i18n attributes
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
      const key = element.getAttribute('data-i18n');
      if (key) {
        const translation = this.translate(key);
        if (element.tagName === 'INPUT' && element.getAttribute('type') === 'text') {
          (element as HTMLInputElement).placeholder = translation;
        } else {
          element.textContent = translation;
        }
      }
    });

    // Update elements with data-i18n-placeholder attributes
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(element => {
      const key = element.getAttribute('data-i18n-placeholder');
      if (key) {
        const translation = this.translate(key);
        (element as HTMLInputElement).placeholder = translation;
      }
    });

    // Update select options with data-i18n attributes
    const optionElements = document.querySelectorAll('option[data-i18n]');
    optionElements.forEach(option => {
      const key = option.getAttribute('data-i18n');
      if (key) {
        const translation = this.translate(key);
        option.textContent = translation;
      }
    });
  }

  private dispatchLanguageChange(lang: string): void {
    window.dispatchEvent(new CustomEvent('languageChanged', { 
      detail: { language: lang } 
    }));
  }

  // Helper method to translate and format
  t(key: string, params?: { [key: string]: string }): string {
    return this.translate(key, params);
  }

  // Helper for getting language display names
  getLanguageDisplayName(langCode: string): string {
    const displayNames: { [key: string]: string } = {
      'en': 'English',
      'ru': 'Русский',
      'es': 'Español'
    };
    return displayNames[langCode] || langCode;
  }

  // Method to get all translation keys (useful for debugging)
  getAllKeys(lang?: string): string[] {
    const targetLang = lang || this.currentLang;
    const translations = this.translations.get(targetLang);
    if (!translations) return [];

    const keys: string[] = [];
    
    function extractKeys(obj: any, prefix = ''): void {
      Object.keys(obj).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          extractKeys(obj[key], fullKey);
        } else {
          keys.push(fullKey);
        }
      });
    }

    extractKeys(translations);
    return keys;
  }
}

// Create singleton instance
export const i18n = new I18nManager();

// Export type for external use
export type { Translations };
