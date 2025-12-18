/**
 * Translator Service Module
 * Azure Translator API (v3)
 */

class TranslatorService {
  constructor() {
    this.endpoint = CONFIG.TRANSLATOR_ENDPOINT;
    this.key = CONFIG.TRANSLATOR_KEY;
    this.region = CONFIG.TRANSLATOR_REGION; // "" recommended unless required
  }

  buildHeaders() {
    const headers = {
      "Ocp-Apim-Subscription-Key": this.key,
      "Content-Type": "application/json",
    };

    // Only include region header if it is a real region.
    if (this.region && this.region !== "global") {
      headers["Ocp-Apim-Subscription-Region"] = this.region;
    }
    return headers;
  }

  async translate(text, fromLang, toLang) {
    if (!text || !text.trim()) return "";
    if (fromLang === toLang) return text;

    const url =
      `${this.endpoint}translate?api-version=3.0` +
      `&from=${encodeURIComponent(fromLang)}` +
      `&to=${encodeURIComponent(toLang)}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: this.buildHeaders(),
      body: JSON.stringify([{ text }]),
    });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`Translation failed: ${resp.status} - ${body}`);
    }

    const data = await resp.json();
    const translated = data?.[0]?.translations?.[0]?.text || text;

    CONFIG.DEBUG &&
      console.log(
        `🌐 Translated (${fromLang}→${toLang}): "${text.slice(0, 30)}..." → "${translated.slice(0, 30)}..."`
      );

    return translated;
  }

  translateToEnglish(text, fromLang) {
    return this.translate(text, fromLang, "en");
  }

  translateFromEnglish(text, toLang) {
    return this.translate(text, "en", toLang);
  }
}
