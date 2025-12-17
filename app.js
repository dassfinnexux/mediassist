/**
 * Medical Clinic Voice Assistant - Main Application
 */

class MedicalInterpreterApp {
    constructor() {
      this.speechService = new SpeechService();
      this.translator = new TranslatorService();
      this.copilot = new CopilotService();
      this.wakeWordDetector = null;
  
      this.currentLanguage = CONFIG.DEFAULT_LANGUAGE;
      this.isProcessing = false;
      this.autoPlayResponses = CONFIG.AUTO_PLAY_RESPONSES;
  
      this.micButton = document.getElementById('micButton');
      this.micStatus = document.getElementById('micStatus');
      this.transcript = document.getElementById('transcript');
      this.connectionStatus = document.getElementById('connectionStatus');
      this.clearBtn = document.getElementById('clearBtn');
      this.voiceSelect = document.getElementById('voiceSelect');
      this.wakeWordToggle = document.getElementById('wakeWordToggle');
      this.autoPlayToggle = document.getElementById('autoPlayToggle');
      this.langButtons = document.querySelectorAll('.lang-btn');
  
      this.handleMicClick = this.handleMicClick.bind(this);
      this.handleWakeWord = this.handleWakeWord.bind(this);
    }
  
    async init() {
      console.log('🏥 Medical Interpreter App initializing...');
  
      this.setupEventListeners();
  
      // Copilot connection
      try {
        await this.copilot.startConversation();
        this.updateConnectionStatus('connected', 'Connected');
      } catch (error) {
        console.error('Failed to connect to Copilot:', error);
        this.updateConnectionStatus('error', 'Connection failed - check Copilot secret');
      }
  
      // Wake word setup
      if (CONFIG.WAKE_WORD_ENABLED) {
        this.wakeWordDetector = new WakeWordDetector(this.speechService, this.handleWakeWord);
        this.wakeWordDetector.initialize();
      }
  
      this.clearWelcomeOnFirstUse = true;
  
      console.log('✅ App initialized');
    }
  
    setupEventListeners() {
      this.micButton.addEventListener('click', this.handleMicClick);
  
      this.langButtons.forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const lang = e.currentTarget.dataset.lang;
          this.handleLanguageChange(lang);
        });
      });
  
      this.clearBtn.addEventListener('click', () => (this.transcript.innerHTML = ''));
  
      this.voiceSelect.addEventListener('change', (e) => {
        this.speechService.setVoiceGender(e.target.value);
      });
  
      this.wakeWordToggle.addEventListener('change', async (e) => {
        if (e.target.checked) {
          // Must have mic permission. If denied, toggle back off.
          try {
            await this.speechService.ensureMicPermission();
            this.startWakeWordDetection();
          } catch (err) {
            console.error(err);
            this.wakeWordToggle.checked = false;
            this.addErrorMessage('Microphone permission required for wake word.');
          }
        } else {
          this.stopWakeWordDetection();
        }
      });
  
      this.autoPlayToggle.addEventListener('change', (e) => {
        this.autoPlayResponses = e.target.checked;
      });
  
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.stopWakeWordDetection();
        else if (this.wakeWordToggle.checked) this.startWakeWordDetection();
      });
    }
  
    async handleMicClick() {
      if (this.isProcessing) return;
  
      if (this.clearWelcomeOnFirstUse) {
        const welcomeMsg = this.transcript.querySelector('.welcome-message');
        if (welcomeMsg) welcomeMsg.remove();
        this.clearWelcomeOnFirstUse = false;
      }
  
      // Stop wake word while actively recording
      this.stopWakeWordDetection();
  
      if (this.speechService.getIsListening()) {
        this.speechService.stopRecognition(() => this.updateMicButton(false));
        return;
      }
  
      // Ensure mic permission once (required for reliable mic + wake word)
      try {
        await this.speechService.ensureMicPermission();
      } catch (err) {
        this.addErrorMessage('Microphone permission denied. Please allow microphone access in browser settings.');
        return;
      }
  
      this.startListening();
    }
  
    startListening() {
      this.updateMicButton(true);
      this.updateMicStatus('Listening...');
  
      this.speechService.startRecognition(
        async (text) => this.processUserSpeech(text),
        (error) => {
          console.error('Speech recognition error:', error);
          this.addErrorMessage(`Error: ${error}`);
          this.updateMicButton(false);
          this.updateMicStatus('Tap to speak or say "Hey Doctor"');
          this.resumeWakeWordDetection();
        },
        () => CONFIG.DEBUG && console.log('🎤 Started listening'),
        () => {
          this.updateMicButton(false);
          this.updateMicStatus('Tap to speak or say "Hey Doctor"');
          this.resumeWakeWordDetection();
        }
      );
    }
  
    async processUserSpeech(text) {
      if (!text || !text.trim()) return;
  
      this.isProcessing = true;
      this.updateMicStatus('Processing...');
  
      try {
        this.addMessage('user', text, this.currentLanguage);
  
        let englishText = text;
        if (this.currentLanguage !== 'en') {
          englishText = await this.translator.translateToEnglish(text, this.currentLanguage);
        }
  
        this.updateMicStatus('Thinking...');
        const responseEn = await this.copilot.sendMessage(englishText);
  
        let responseUser = responseEn;
        if (this.currentLanguage !== 'en') {
          responseUser = await this.translator.translateFromEnglish(responseEn, this.currentLanguage);
        }
  
        this.addMessage('bot', responseUser, this.currentLanguage, responseEn);
  
        if (this.autoPlayResponses) {
          this.updateMicStatus('Speaking...');
          await this.speechService.speak(responseUser, this.currentLanguage);
        }
      } catch (err) {
        console.error('Error processing speech:', err);
        this.addErrorMessage('Sorry, there was an error processing your request.');
      } finally {
        this.isProcessing = false;
        this.updateMicStatus('Tap to speak or say "Hey Doctor"');
      }
    }
  
    handleLanguageChange(lang) {
      this.currentLanguage = lang;
      this.speechService.setLanguage(lang);
  
      this.langButtons.forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
      });
  
      CONFIG.DEBUG && console.log(`Language changed to: ${CONFIG.LANGUAGES[lang].name}`);
    }
  
    handleWakeWord() {
      CONFIG.DEBUG && console.log('Wake word detected - starting listening');
  
      this.micButton.classList.add('pulse');
      setTimeout(() => this.micButton.classList.remove('pulse'), 500);
  
      this.startListening();
    }
  
    startWakeWordDetection() {
      if (this.wakeWordDetector && CONFIG.WAKE_WORD_ENABLED) {
        this.wakeWordDetector.startListening();
      }
    }
  
    stopWakeWordDetection() {
      if (this.wakeWordDetector) this.wakeWordDetector.stopListening();
    }
  
    resumeWakeWordDetection() {
      if (this.wakeWordToggle.checked && !this.isProcessing) {
        setTimeout(() => this.startWakeWordDetection(), 1500);
      }
    }
  
    addMessage(type, text, lang, englishText = null) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${type}`;
  
      const originalP = document.createElement('p');
      originalP.className = 'original';
      originalP.textContent = text;
      messageDiv.appendChild(originalP);
  
      if (lang !== 'en' && englishText) {
        const translatedP = document.createElement('p');
        translatedP.className = 'translated';
        translatedP.textContent = `(${englishText})`;
        messageDiv.appendChild(translatedP);
      }
  
      if (type === 'bot') {
        const speakerBtn = document.createElement('button');
        speakerBtn.className = 'speaker-btn';
        speakerBtn.textContent = 'Play';
        speakerBtn.addEventListener('click', () => this.speechService.speak(text, lang));
        messageDiv.appendChild(speakerBtn);
      }
  
      this.transcript.appendChild(messageDiv);
      this.transcript.scrollTop = this.transcript.scrollHeight;
    }
  
    addErrorMessage(text) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.textContent = text;
      this.transcript.appendChild(errorDiv);
      this.transcript.scrollTop = this.transcript.scrollHeight;
    }
  
    updateMicButton(isListening) {
      this.micButton.classList.toggle('listening', isListening);
    }
  
    updateMicStatus(text) {
      this.micStatus.textContent = text;
    }
  
    updateConnectionStatus(status, text) {
      this.connectionStatus.className = `status-indicator ${status}`;
      this.connectionStatus.querySelector('.status-text').textContent = text;
    }
  }
  
  document.addEventListener('DOMContentLoaded', () => {
    const app = new MedicalInterpreterApp();
    app.init();
    if (CONFIG.DEBUG) window.app = app;
  });
  