'use strict';
// Small synthesized sound effects via Web Audio API — no audio asset to
// ship/load, just a couple of oscillator blips. Lazily creates a single
// shared AudioContext on first use (not at module load) since iOS Safari
// won't let a context produce sound until it's created/resumed inside a
// real user gesture — a search-result tap already is one, so this is safe
// to call directly from that click handler.
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

function tone(context, { freq, start, duration, gain = 0.15 }) {
  const osc = context.createOscillator();
  const gainNode = context.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const t0 = context.currentTime + start;
  gainNode.gain.setValueAtTime(0, t0);
  gainNode.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  gainNode.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(gainNode).connect(context.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

// A quick, pleasant two-note "added!" chime — low note into a higher one,
// like a tiny upward "ding".
export function playAddSound() {
  const context = getContext();
  if (!context) return;
  try {
    tone(context, { freq: 880, start: 0, duration: 0.11 });
    tone(context, { freq: 1318.5, start: 0.07, duration: 0.16 });
  } catch {
    // sound is a nice-to-have — never let it break the add flow
  }
}
