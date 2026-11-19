// Mizan Finance v5.0 — Motion-Graphics Scroll & Interaction Choreography Engine
// Drives: Scroll Progress Bar, Scroll-Linked Hero Parallax, IntersectionObserver Reveals,
// Scroll-Triggered Progress Bars, Count-Up Numbers, and Tactile Touch Ripples.

import { formatMoney } from './utils.js';

let revealObserver = null;
let scrollHandlerBound = false;
let rippleBound = false;
let rafPending = false;

function reducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function animateSingleNumber(el) {
  if (el.dataset.counted === '1') return;
  if (document.body.classList.contains('privacy-blur') || reducedMotion()) return;
  const target = Number(el.dataset.count);
  const cur = el.dataset.currency || 'SAR';
  if (!Number.isFinite(target) || target === 0) return;
  el.dataset.counted = '1';

  const duration = 620;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = formatMoney(target * eased, cur);
    if (p < 1) requestAnimationFrame(tick);
    else el.textContent = formatMoney(target, cur);
  };
  requestAnimationFrame(tick);
}

function updateScrollChoreography() {
  rafPending = false;
  const y = window.scrollY || 0;
  const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = Math.min(1, Math.max(0, y / docH));

  // 1) Top Scroll Progress Ribbon
  const bar = document.getElementById('scroll-progress-bar');
  if (bar) {
    bar.style.transform = `scaleX(${progress.toFixed(4)})`;
  }

  // 2) Sticky Topbar Scroll Elevation
  const topbar = document.querySelector('.topbar');
  if (topbar) {
    topbar.classList.toggle('is-scrolled', y > 12);
  }

  // 3) Scroll-Linked 2.5D Hero Card Parallax & Scale
  if (!reducedMotion()) {
    const hero = document.getElementById('hero-parallax-card');
    if (hero) {
      const clampY = Math.min(260, Math.max(0, y));
      const ratio = clampY / 260;
      const scale = 1 - ratio * 0.055;
      const ty = ratio * 16;
      const opacity = 1 - ratio * 0.16;
      hero.style.transform = `translate3d(0, ${ty.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      hero.style.opacity = opacity.toFixed(3);
    }
  }
}

function onScroll() {
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(updateScrollChoreography);
  }
}

function bindTouchRipples() {
  if (rippleBound) return;
  rippleBound = true;

  document.addEventListener('pointerdown', (e) => {
    if (reducedMotion()) return;
    const target = e.target.closest('.btn, .dock-btn, .acc-mini-card, .bottom-nav-btn, .choice-card, .pill-nav-btn');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.4;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const wave = document.createElement('span');
    wave.className = 'ripple-wave';
    wave.style.width = `${size}px`;
    wave.style.height = `${size}px`;
    wave.style.left = `${x}px`;
    wave.style.top = `${y}px`;

    target.appendChild(wave);
    setTimeout(() => wave.remove(), 520);
  }, { passive: true });
}

export function initMotionEngine() {
  if (!scrollHandlerBound) {
    scrollHandlerBound = true;
    window.addEventListener('scroll', onScroll, { passive: true });
  }
  bindTouchRipples();

  if (revealObserver) revealObserver.disconnect();

  const revealEls = Array.from(document.querySelectorAll('[data-reveal]'));

  if (reducedMotion() || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => {
      el.classList.add('is-visible');
      el.querySelectorAll('[data-fill]').forEach((bar) => {
        bar.style.width = `${bar.dataset.fill}%`;
      });
    });
    updateScrollChoreography();
    return;
  }

  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const el = entry.target;
      if (entry.isIntersecting) {
        el.classList.add('is-visible');

        el.querySelectorAll('[data-fill]').forEach((bar) => {
          requestAnimationFrame(() => {
            bar.style.width = `${bar.dataset.fill}%`;
          });
        });

        el.querySelectorAll('[data-count]').forEach(animateSingleNumber);
        if (el.hasAttribute('data-count')) animateSingleNumber(el);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -24px 0px'
  });

  revealEls.forEach((el, idx) => {
    if (idx < 3) {
      el.style.setProperty('--reveal-delay', `${idx * 65}ms`);
    } else {
      el.style.setProperty('--reveal-delay', '40ms');
    }
    revealObserver.observe(el);
  });

  document.querySelectorAll('[data-count]').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) animateSingleNumber(el);
  });

  updateScrollChoreography();
}
