/**
 * Translator Service Module
 * =========================
 * Azure Translator API (v3)
 */

class TranslatorService {
    constructor() {
      this.endpoint = CONFIG.TRANSLATOR_ENDPOINT;
      this.key = CONFIG.TRANSLATOR_KEY;
      this.region = CONFIG.TRANSLATOR_REGION; // '' recommended for global unless required
    }
  
    buildHeaders() {
      const headers = {
        'Ocp-Apim-Subscription-Key': this.key,
        'Content-Type': 'application/json'
      };
  
      // Only send region if it is a real region (not 'global' and not empty)
      if (this.region && this.region !== 'global') {
        headers['Ocp-Apim-Subscription-Region'] = this.region;
      }
  
      return headers;
    }
  
    async translate(text, fromLang, toLang) {
      if (!text || !text.trim()) return '';
      if (fromLang === toLang) return text;
  
      const url = `${this.endpoint}translate?api-version=3.0&from=${fromLang}&to=${toLang}`;
  
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify([{ text }])
      });
  
      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(`Translation failed: ${response.status} - ${errorBody}`);
      }
  
      const data = await response.json();
      const translated = data[0]?.translations?.[0]?.text || text;
  
      if (CONFIG.DEBUG) {
        console.log(`🌐 Translated (${fromLang}→${toLang}): "${text.slice(0, 30)}..." → "${translated.slice(0, 30)}..."`);
      }
  
      return translated;
    }
  
    translateToEnglish(text, fromLang) {
      return this.translate(text, fromLang, 'en');
    }
  
    translateFromEnglish(text, toLang) {
      return this.translate(text, 'en', toLang);
    }
  
    async detectLanguage(text) {
      if (!text || !text.trim()) return CONFIG.DEFAULT_LANGUAGE;
  
      const url = `${this.endpoint}detect?api-version=3.0`;
  
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: this.buildHeaders(),
          body: JSON.stringify([{ text }])
        });
  
        if (!response.ok) return CONFIG.DEFAULT_LANGUAGE;
  
        const data = await response.json();
        const detected = data[0]?.language;
  
        if (CONFIG.DEBUG) console.log(`🔍 Detected language: ${detected}`);
  
        if (detected === 'ta') return 'ta';
        if (detected === 'te') return 'te';
        if (detected === 'en') return 'en';
        return 'en';
      } catch (e) {
        console.error('Language detection error:', e);
        return CONFIG.DEFAULT_LANGUAGE;
      }
    }
  }
  