/**
 * Configuration Settings
 * IMPORTANT: Do NOT store real secrets in frontend for production.
 */

const CONFIG = {
    // Azure Speech
    SPEECH_KEY: "BKYZMFeYGdKzfaCZHE8zGFXlFTrTovohErcsKVn0l0Fpw43egQePJQQJ99BLACYeBjFXJ3w3AAAYACOGPUzq",
    SPEECH_REGION: "eastus",
  
    // Azure Translator
    TRANSLATOR_KEY: "57omHGgOKsTGGUE729y7P9gIf5noBPN5aOlVmYU59ffkB3J57hrYJQQJ99BLACULyCpXJ3w3AAAbACOGgUes",
    TRANSLATOR_ENDPOINT: "https://api.cognitive.microsofttranslator.com/",
    // Use real region for your translator resource if required (e.g., "eastus")
    // If you are using global multi-service and region is not required, leave empty "".
    TRANSLATOR_REGION: "global",
  
    // Copilot Studio / Bot Framework Direct Line
    DIRECT_LINE_SECRET: "AtSINSLmgzPWjZoaRJFxl6WmLuAzDzbcZ7mAYKvsCYzZPFAzGTG6JQQJ99BLACHYHv6AArohAAABAZBS4Oj2.iUzOdSrZskhH3gNMpkCMK1M5eR2XKotE7mQDCsyanxXyF1HC0kHFJQQJ99BLACHYHv6AArohAAABAZBS2A26",
    DIRECT_LINE_ENDPOINT: "https://directline.botframework.com/v3/directline",

  
    // Languages
    LANGUAGES: {
      ta: {
        name: "Tamil",
        nativeName: "தமிழ்",
        speechCode: "ta-IN",
        translatorCode: "ta",
        voices: {
          female: "ta-IN-PallaviNeural",
          male: "ta-IN-ValluvarNeural", 
        },
      },
      te: {
        name: "Telugu",
        nativeName: "తెలుగు",
        speechCode: "te-IN",
        translatorCode: "te",
        voices: {
          female: "te-IN-ShrutiNeural",
          male: "te-IN-MohanNeural",
        },
      },
      en: {
        name: "English",
        nativeName: "English",
        speechCode: "en-IN",
        translatorCode: "en",
        voices: {
          female: "en-IN-NeerjaNeural",
          male: "en-IN-PrabhatNeural",
        },
      },
    },
  
    // Wake word
    WAKE_WORD: "hey doctor",
    WAKE_WORD_ENABLED: true,
  
    // App settings
    DEFAULT_LANGUAGE: "en",
    DEFAULT_VOICE_GENDER: "female",
    AUTO_PLAY_RESPONSES: true,
  
    // Recognition mode
    CONTINUOUS_RECOGNITION: false,
  
    // Debug
    DEBUG: true,
  };
  
  function validateConfig() {
    const requiredKeys = ["SPEECH_KEY", "TRANSLATOR_KEY", "DIRECT_LINE_SECRET"];
    const missing = requiredKeys.filter(
      (k) => !CONFIG[k] || String(CONFIG[k]).includes("YOUR_")
    );
    if (missing.length) {
      console.warn("⚠️ Missing configuration:", missing);
      return false;
    }
    return true;
  }
  
  if (CONFIG.DEBUG) {
    console.log("📋 CONFIG loaded", {
      speechRegion: CONFIG.SPEECH_REGION,
      languages: Object.keys(CONFIG.LANGUAGES),
    });
    validateConfig();
  }
  
