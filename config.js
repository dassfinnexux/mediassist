/**
 * Configuration Settings for Medical Interpreter
 * ================================================
 * IMPORTANT: Replace the placeholder values with your actual API keys
 * 
 * For production deployment:
 * - Store these values in environment variables
 * - Use Azure Key Vault for secure key management
 * - Never commit API keys to version control
 */

const CONFIG = {
    // ============================================
    // Azure Speech Service Configuration
    // ============================================
    // Get these from: Azure Portal > Speech Service > Keys and Endpoint
    SPEECH_KEY: 'BKYZMFeYGdKzfaCZHE8zGFXlFTrTovohErcsKVn0l0Fpw43egQePJQQJ99BLACYeBjFXJ3w3AAAYACOGPUzq',
    SPEECH_REGION: 'eastus', // e.g., 'centralindia', 'eastus', 'westeurope'

    // ============================================
    // Azure Translator Configuration
    // ============================================
    // Get these from: Azure Portal > Translator > Keys and Endpoint
    TRANSLATOR_KEY: '93o6cLMe1QLKNGDtqoGOP9quO55kILWOLbv7d4zD5r8rhk3o5isCJQQJ99BLACYeBjFXJ3w3AAAbACOG9dP2',
    TRANSLATOR_ENDPOINT: 'https://api.cognitive.microsofttranslator.com/',
    TRANSLATOR_REGION: 'global',

    // ============================================
    // Copilot Studio Direct Line Configuration
    // ============================================
    // Get this from: Copilot Studio > Settings > Channels > Direct Line
    DIRECT_LINE_SECRET: 'AtSINSLmgzPWjZoaRJFxl6WmLuAzDzbcZ7mAYKvsCYzZPFAzGTG6JQQJ99BLACHYHv6AArohAAABAZBS4Oj2.iUzOdSrZskhH3gNMpkCMK1M5eR2XKotE7mQDCsyanxXyF1HC0kHFJQQJ99BLACHYHv6AArohAAABAZBS2A26',
    DIRECT_LINE_ENDPOINT: 'https://directline.botframework.com/v3/directline',

    // ============================================
    // Supported Languages Configuration
    // ============================================
    LANGUAGES: {
        'ta': {
            name: 'Tamil',
            nativeName: 'தமிழ்',
            speechCode: 'ta-IN',
            translatorCode: 'ta',
            voices: {
                female: 'ta-IN-PallaviNeural',
                male: 'ta-IN-ValluvarNeural'
            }
        },
        'te': {
            name: 'Telugu',
            nativeName: 'తెలుగు',
            speechCode: 'te-IN',
            translatorCode: 'te',
            voices: {
                female: 'te-IN-ShrutiNeural',
                male: 'te-IN-MohanNeural'
            }
        },
        'en': {
            name: 'English',
            nativeName: 'English',
            speechCode: 'en-IN',
            translatorCode: 'en',
            voices: {
                female: 'en-IN-NeerjaNeural',
                male: 'en-IN-PrabhatNeural'
            }
        }
    },

    // ============================================
    // Wake Word Configuration
    // ============================================
    WAKE_WORD: 'hey doctor',
    WAKE_WORD_ENABLED: true,

    // ============================================
    // Application Settings
    // ============================================
    DEFAULT_LANGUAGE: 'en',
    DEFAULT_VOICE_GENDER: 'female',
    AUTO_PLAY_RESPONSES: true,
    
    // Speech recognition settings
    SPEECH_TIMEOUT_MS: 5000,        // Stop listening after 5 seconds of silence
    CONTINUOUS_RECOGNITION: false,  // Single utterance mode
    
    // Debug mode
    DEBUG: true
};

// Validation function to check if all required keys are set
function validateConfig() {
    const requiredKeys = [
        'SPEECH_KEY',
        'TRANSLATOR_KEY',
        'DIRECT_LINE_SECRET'
    ];
    
    const missingKeys = requiredKeys.filter(key => 
        CONFIG[key] === '' || 
        CONFIG[key].includes('YOUR_') || 
        CONFIG[key].includes('_HERE')
    );
    
    if (missingKeys.length > 0) {
        console.warn('⚠️ Missing API keys:', missingKeys);
        console.warn('Please update config.js with your actual API keys');
        return false;
    }
    
    return true;
}

// Log configuration status
if (CONFIG.DEBUG) {
    console.log('📋 Configuration loaded');
    console.log('Speech Region:', CONFIG.SPEECH_REGION);
    console.log('Languages:', Object.keys(CONFIG.LANGUAGES));
    validateConfig();
}
