'use strict';
// Hand-rolled canvas confetti burst for the order-confirmed celebration — no
// dependency, same spirit as sound.js's oscillator blips (a few dozen lines
// beats pulling in a library for one moment). Self-removes once the burst
// has fully faded; a no-op under prefers-reduced-motion, same as every other
// animation in this app.
const COLORS = ['#0b6b3a', '#e07a3f', '#2f6fb0', '#f2c94c', '#c14a4a'];
const PARTICLE_COUNT = 90;
const DURATION_MS = 2600;
const GRAVITY = 0.28;
const DRAG = 0.995;

export function burstConfetti(container) {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = container.clientWidth * dpr;
  canvas.height = container.clientHeight * dpr;
  ctx.scale(dpr, dpr);
  const w = container.clientWidth;
  const h = container.clientHeight;

  const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
    x: w / 2 + (Math.random() - 0.5) * 60,
    y: h * 0.3,
    vx: (Math.random() - 0.5) * 9,
    vy: -Math.random() * 9 - 4,
    size: 5 + Math.random() * 5,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotation: Math.random() * Math.PI,
    rotSpeed: (Math.random() - 0.5) * 0.3,
    shape: Math.random() < 0.5 ? 'rect' : 'circle',
  }));

  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.vy += GRAVITY;
      p.vx *= DRAG;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      const fade = Math.max(0, 1 - elapsed / DURATION_MS);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (elapsed < DURATION_MS) requestAnimationFrame(step);
    else canvas.remove();
  }
  requestAnimationFrame(step);
}
