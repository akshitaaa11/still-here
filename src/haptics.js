// Vibration / haptics (on phones that allow it: Android browsers. iPhone Safari has no vibration
// API for web pages, so it quietly does nothing there). Can be switched off; saved with the game.
const Haptics = {
  supported: typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function',
  buzz(pattern) {
    if (!this.supported || !State.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) { /* blocked: ignore */ }
  },
  // named moments, kept short and soft
  tap() { this.buzz(10); },
  find() { this.buzz(35); },
  collect() { this.buzz([30, 40, 50]); },
  bounce() { this.buzz(15); },
  patch() { this.buzz([60, 50, 60, 50, 120]); },
  lowBattery() { this.buzz([80, 60, 80]); },
  wind() { this.buzz(30); },
  sleep() { this.buzz([120, 80, 200]); }
};
