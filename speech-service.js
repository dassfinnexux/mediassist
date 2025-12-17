/**
 * Speech Service Module
 * =====================
 * Azure Speech-to-Text + Text-to-Speech (Browser)
 */

class SpeechService {
    constructor() {
      this.speechConfig = null;
      this.recognizer = null;
      this.synthesizer = null;
  
      this.isListening = false;
      this.currentLanguage = CONFIG.DEFAULT_LANGUAGE;
      this.voiceGender = CONFIG.DEFAULT_VOICE_GENDER;
  
      this.initializeSpeechConfig();
    }
  
    initializeSpeechConfig() {
      if (typeof SpeechSDK === 'undefined') {
        throw new Error('SpeechSDK not loaded. Ensure Speech SDK script is included before speech-service.js.');
      }
  
      this.speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
        CONFIG.SPEECH_KEY,
        CONFIG.SPEECH_REGION
      );
  
      this.speechConfig.speechRecognitionLanguage =
        CONFIG.LANGUAGES[this.currentLanguage].speechCode;
  
      if (CONFIG.DEBUG) console.log('✅ Speech SDK initialized');
    }
  
    setLanguage(langCode) {
      if (!CONFIG.LANGUAGES[langCode]) {
        console.error('Invalid language code:', langCode);
        return;
      }
  
      this.currentLanguage = langCode;
      this.speechConfig.speechRecognitionLanguage = CONFIG.LANGUAGES[langCode].speechCode;
  
      if (CONFIG.DEBUG) console.log(`🌐 Language set to: ${CONFIG.LANGUAGES[langCode].name}`);
    }
  
    setVoiceGender(gender) {
      if (gender !== 'male' && gender !== 'female') return;
      this.voiceGender = gender;
      if (CONFIG.DEBUG) console.log(`🔊 Voice gender set to: ${gender}`);
    }
  
    async ensureMicPermission() {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser.');
      }
      await navigator.mediaDevices.getUserMedia({ audio: true });
    }
  
    async startRecognition(onResult, onError, onStart, onEnd) {
      if (this.isListening) {
        if (CONFIG.DEBUG) console.warn('Already listening');
        return;
      }
  
      try {
        await this.ensureMicPermission();
  
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        this.recognizer = new SpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);
  
        // Debug hooks to prove mic is active
        this.recognizer.sessionStarted = () => CONFIG.DEBUG && console.log('🎙️ STT session started');
        this.recognizer.sessionStopped = () => CONFIG.DEBUG && console.log('🛑 STT session stopped');
        this.recognizer.recognizing = (s, e) => {
          if (CONFIG.DEBUG && e?.result?.text) console.log('🎧 Hearing:', e.result.text);
        };
  
        this.recognizer.recognized = (sender, event) => {
          if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            const text = event.result.text?.trim();
            if (text) {
              CONFIG.DEBUG && console.log(`🎤 Recognized: "${text}"`);
              onResult && onResult(text);
            }
          } else if (event.result.reason === SpeechSDK.ResultReason.NoMatch) {
            CONFIG.DEBUG && console.log('⚠️ No speech recognized');
          }
        };
  
        this.recognizer.canceled = (sender, event) => {
          if (event.reason === SpeechSDK.CancellationReason.Error) {
            console.error('STT canceled:', event.errorDetails);
            onError && onError(event.errorDetails || 'Speech recognition canceled');
          }
          this.stopRecognition(onEnd);
        };
  
        this.isListening = true;
        onStart && onStart();
  
        if (CONFIG.CONTINUOUS_RECOGNITION) {
          this.recognizer.startContinuousRecognitionAsync(
            () => CONFIG.DEBUG && console.log('🎙️ Continuous recognition started'),
            (err) => {
              console.error('Failed to start continuous recognition:', err);
              onError && onError(err?.message || String(err));
              this.stopRecognition(onEnd);
            }
          );
        } else {
          this.recognizer.recognizeOnceAsync(
            (result) => {
              if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
                const text = result.text?.trim();
                if (text) onResult && onResult(text);
              }
              this.stopRecognition(onEnd);
            },
            (err) => {
              console.error('Recognition error:', err);
              onError && onError(err?.message || String(err));
              this.stopRecognition(onEnd);
            }
          );
        }
      } catch (error) {
        console.error('Failed to start recognition:', error);
        this.isListening = false;
        onError && onError(error.message || 'Microphone access denied');
        onEnd && onEnd();
      }
    }
  
    stopRecognition(onEnd) {
      if (!this.recognizer) {
        this.isListening = false;
        onEnd && onEnd();
        return;
      }
  
      if (CONFIG.CONTINUOUS_RECOGNITION) {
        this.recognizer.stopContinuousRecognitionAsync(
          () => this.cleanup(onEnd),
          (err) => {
            console.error('Error stopping recognition:', err);
            this.cleanup(onEnd);
          }
        );
      } else {
        this.cleanup(onEnd);
      }
    }
  
    cleanup(onEnd) {
      try {
        this.recognizer?.close();
      } catch {}
      this.recognizer = null;
      this.isListening = false;
      onEnd && onEnd();
      CONFIG.DEBUG && console.log('🛑 Recognition stopped');
    }
  
    async speak(text, langCode = null) {
      const language = langCode || this.currentLanguage;
      const langConfig = CONFIG.LANGUAGES[language];
      if (!langConfig) throw new Error(`Unsupported language: ${language}`);
  
      const voiceName = langConfig.voices[this.voiceGender];
      this.speechConfig.speechSynthesisVoiceName = voiceName;
  
      return new Promise((resolve, reject) => {
        try {
          this.synthesizer = new SpeechSDK.SpeechSynthesizer(this.speechConfig);
  
          CONFIG.DEBUG && console.log(`🔊 Speaking (${langConfig.name}): "${text.slice(0, 50)}..."`);
  
          this.synthesizer.speakTextAsync(
            text,
            (result) => {
              const ok = result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted;
              this.synthesizer?.close();
              this.synthesizer = null;
  
              if (ok) {
                CONFIG.DEBUG && console.log('✅ Speech completed');
                resolve(result);
              } else {
                reject(new Error(result.errorDetails || 'Speech synthesis failed'));
              }
            },
            (err) => {
              this.synthesizer?.close();
              this.synthesizer = null;
              reject(err);
            }
          );
        } catch (err) {
          reject(err);
        }
      });
    }
  
    stopSpeaking() {
      try {
        this.synthesizer?.close();
      } catch {}
      this.synthesizer = null;
    }
  
    getIsListening() {
      return this.isListening;
    }
  
    getCurrentLanguage() {
      return this.currentLanguage;
    }
  }
  