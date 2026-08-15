/**
 * Web Audio API Sound Chimes & Haptic Feedback Engine
 * Provides instant sound and tactile feedback without external audio files.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * High-pitched crisp double chime (Success / Checked In)
 */
export function playSuccessBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, now + 0.15); // A6

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  } catch (err) {
    console.warn("[Audio] Success beep note:", err);
  }
}

/**
 * Mid-pitched double pulse (Warning / Already Checked In)
 */
export function playDuplicateBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(440, now + 0.1); // A4

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  } catch (err) {
    console.warn("[Audio] Duplicate beep note:", err);
  }
}

/**
 * Low-pitched double buzz (Error / Invalid Ticket)
 */
export function playErrorBeep() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.setValueAtTime(164.81, now + 0.12); // E3

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.28);
  } catch (err) {
    console.warn("[Audio] Error beep note:", err);
  }
}

/**
 * Trigger Haptic Vibration Pattern
 */
export function triggerHaptic(type: "success" | "warning" | "error") {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try {
      if (type === "success") {
        navigator.vibrate(80);
      } else if (type === "warning") {
        navigator.vibrate([100, 50, 100]);
      } else {
        navigator.vibrate([200, 80, 200]);
      }
    } catch {
      // Ignored if device doesn't allow haptics
    }
  }
}
