'use strict';
// Small synthesized sound effects via Web Audio API — no audio asset to
// ship/load, just a handful of oscillator blips. Lazily creates a single
// shared AudioContext on first use (not at module load) since iOS Safari
// won't let a context produce sound until it's created/resumed inside a
// real user gesture — an add/qty-step tap already is one, so this is safe
// to call directly from those click handlers.
let ctx = null;

function getContext() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    ctx = new AudioContextClass();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(context, { freq, start, duration, gain = 0.15, glideTo } = {}) {
  const osc = context.createOscillator();
  const gainNode = context.createGain();
  osc.type = 'sine';
  const t0 = context.currentTime + start;
  osc.frequency.setValueAtTime(freq, t0);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
  gainNode.gain.setValueAtTime(0, t0);
  gainNode.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  gainNode.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gainNode).connect(context.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function safely(fn) {
  try {
    fn();
  } catch {
    // sound is a nice-to-have — never let it break the action it's tied to
  }
}

// A cheerful little three-note major-chord "ta-da" for adding an item —
// distinct from the qty sounds below by being multi-note/chord-like rather
// than a single gliding tone.
export function playAddSound() {
  const context = getContext();
  if (!context) return;
  safely(() => {
    tone(context, { freq: 523.25, start: 0, duration: 0.1, gain: 0.13 }); // C5
    tone(context, { freq: 659.25, start: 0.06, duration: 0.1, gain: 0.13 }); // E5
    tone(context, { freq: 783.99, start: 0.12, duration: 0.22, gain: 0.15 }); // G5
  });
}

// Quantity +/- : a single tone that glides up or down in pitch, so the
// sound itself matches the direction of the action instead of just being
// "a beep" — up glides low→high, down glides high→low.
export function playQtyUpSound() {
  const context = getContext();
  if (!context) return;
  safely(() => tone(context, { freq: 440, glideTo: 660, start: 0, duration: 0.13, gain: 0.13 }));
}

export function playQtyDownSound() {
  const context = getContext();
  if (!context) return;
  safely(() => tone(context, { freq: 440, glideTo: 293.66, start: 0, duration: 0.13, gain: 0.13 }));
}

// Tiny buzz alongside the add sound on devices that support it (most
// Android phones; not iOS Safari, which has no Vibration API — the sound
// alone still plays fine there).
export function vibrateAdd() {
  safely(() => navigator.vibrate?.([12, 40, 12]));
}
