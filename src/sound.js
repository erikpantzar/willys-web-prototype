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

// Removing an item is a real ending, not just "a number changed" — a low,
// short thud rather than another chime. Starts much lower and glides down
// further than playQtyDownSound (440→293.66) so it reads as a distinct,
// deeper "thud" rather than just a bigger version of the qty-down glide.
export function playRemoveSound() {
  const context = getContext();
  if (!context) return;
  safely(() => tone(context, { freq: 180, glideTo: 50, start: 0, duration: 0.2, gain: 0.17 }));
}

// A short, single, blunter pulse than vibrateAdd's three-beat pattern —
// one thud, not a flourish.
export function vibrateRemove() {
  safely(() => navigator.vibrate?.(25));
}

// The payoff sound — order confirmed and sent. Bigger and longer than the
// add chord on purpose: everything else in the app (add, qty+/-) is a small
// step along the way, this is the moment those steps were building to. A
// rising four-note run into a held top note, rather than the add sound's
// quick three-note chord.
export function playOrderConfirmedSound() {
  const context = getContext();
  if (!context) return;
  safely(() => {
    tone(context, { freq: 523.25, start: 0, duration: 0.14, gain: 0.14 }); // C5
    tone(context, { freq: 659.25, start: 0.1, duration: 0.14, gain: 0.14 }); // E5
    tone(context, { freq: 783.99, start: 0.2, duration: 0.14, gain: 0.15 }); // G5
    tone(context, { freq: 1046.5, start: 0.3, duration: 0.4, gain: 0.16 }); // C6, held
  });
}

// A longer, richer pattern than vibrateAdd's — matches the sound above in
// being the one moment in the app that gets more than a token buzz.
export function vibrateOrderConfirmed() {
  safely(() => navigator.vibrate?.([15, 60, 15, 60, 15, 100, 40]));
}
