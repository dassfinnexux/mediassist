/**
 * Wake Word Detection Module
 * Listens for "Hey Doctor" using continuous recognition
 */

class WakeWordDetector {
  constructor(speechService, onWakeWord) {
    this.speechService = speechService;
    this.onWakeWord = onWakeWord;

    this.isActive = false;
    this.triggered = false;

    this.wakeWord = (CONFIG.WAKE_WORD || "").toLowerCase();
    this.recognizer = null;
    this.speechConfig = null;
  }

  initialize() {
    if (typeof SpeechSDK === "undefined") {
      throw new Error("SpeechSDK not loaded. Check Speech SDK script include.");
    }

    this.speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      CONFIG.SPEECH_KEY,
      CONFIG.SPEECH_REGION
    );

    // Wake word in English
    this.speechConfig.speechRecognitionLanguage = "en-IN";
    CONFIG.DEBUG && console.log("✅ Wake word detector initialized");
  }

  async startListening() {
    if (this.isActive) return;
    if (!CONFIG.WAKE_WORD_ENABLED) return;

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      this.recognizer = new SpeechSDK.SpeechRecognizer(this.speechConfig, audioConfig);

      this.isActive = true;
      this.triggered = false;

      this.recognizer.recognized = (sender, event) => {
        if (event.result.reason !== SpeechSDK.ResultReason.RecognizedSpeech) return;

        const text = (event.result.text || "").toLowerCase().trim();
        CONFIG.DEBUG && console.log(`🎧 Wake heard: "${text}"`);

        if (this.containsWakeWord(text)) {
          if (this.triggered) return;
          this.triggered = true;

          CONFIG.DEBUG && console.log("🎉 Wake word detected");
          this.stopListening();
          this.onWakeWord && this.onWakeWord();
        }
      };

      this.recognizer.canceled = (sender, event) => {
        if (event.reason === SpeechSDK.CancellationReason.Error) {
          console.error("Wake word canceled:", event.errorDetails);
        }
        this.stopListening();
      };

      this.recognizer.startContinuousRecognitionAsync(
        () => CONFIG.DEBUG && console.log(`🎧 Listening for wake word: "${CONFIG.WAKE_WORD}"`),
        (err) => {
          console.error("Failed to start wake word:", err);
          this.isActive = false;
        }
      );
    } catch (err) {
      console.error("Wake word error:", err);
      this.isActive = false;
    }
  }

  stopListening() {
    if (!this.recognizer || !this.isActive) return;

    this.recognizer.stopContinuousRecognitionAsync(
      () => {
        try {
          this.recognizer.close();
        } catch {}
        this.recognizer = null;
        this.isActive = false;
        CONFIG.DEBUG && console.log("🔇 Wake word stopped");
      },
      (err) => {
        console.error("Error stopping wake word:", err);
        this.isActive = false;
      }
    );
  }

  containsWakeWord(text) {
    const normText = text.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
    const normWake = this.wakeWord.replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();

    if (normText.includes(normWake)) return true;

    const variations = [
      "hey doctor", "hey dr", "hi doctor", "hello doctor",
      "hey doc", "hi doc", "ok doctor", "okay doctor"
    ];

    return variations.some((v) => normText.includes(v));
  }

  getIsActive() {
    return this.isActive;
  }
}
