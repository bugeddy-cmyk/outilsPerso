/**
 * Parallax & tilt — profondeur visuelle au mouvement souris / toucher / inclinaison.
 */
export function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const root = document.documentElement;
  const layers = document.querySelectorAll('[data-depth]');
  const tilts = document.querySelectorAll('[data-tilt]');

  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let rafId = null;

  function setTarget(clientX, clientY) {
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.5;
    targetX = Math.max(-1, Math.min(1, (clientX - cx) / cx));
    targetY = Math.max(-1, Math.min(1, (clientY - cy) / cy));
  }

  function onPointerMove(e) {
    setTarget(e.clientX, e.clientY);
  }

  function onTouchMove(e) {
    const t = e.touches[0];
    if (t) setTarget(t.clientX, t.clientY);
  }

  function onOrientation(e) {
    if (e.gamma == null || e.beta == null) return;
    targetX = Math.max(-1, Math.min(1, e.gamma / 35));
    targetY = Math.max(-1, Math.min(1, (e.beta - 50) / 35));
  }

  function tick() {
    currentX += (targetX - currentX) * 0.06;
    currentY += (targetY - currentY) * 0.06;

    root.style.setProperty('--px', currentX.toFixed(4));
    root.style.setProperty('--py', currentY.toFixed(4));

    layers.forEach(el => {
      const depth = parseFloat(el.dataset.depth) || 1;
      const x = Math.max(-30, Math.min(30, currentX * depth * 0.6));
      const y = Math.max(-24, Math.min(24, currentY * depth * 0.6));
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    });

    tilts.forEach(el => {
      const max = parseFloat(el.dataset.tilt) || 6;
      const rx = Math.max(-max, Math.min(max, -currentY * max));
      const ry = Math.max(-max, Math.min(max, currentX * max));
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });

    rafId = requestAnimationFrame(tick);
  }

  document.addEventListener('mousemove', onPointerMove, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('deviceorientation', onOrientation, { passive: true });

  tick();

  return () => {
    document.removeEventListener('mousemove', onPointerMove);
    document.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('deviceorientation', onOrientation);
    if (rafId) cancelAnimationFrame(rafId);
  };
}

/**
 * Micro-animations UX : ripple boutons, états running, entrées.
 */
export function initMicroAnimations() {
  document.querySelectorAll('.control-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      if (btn.disabled) return;
      const rect = btn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
      ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
    });
  });

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.remove('mode-pop');
      void btn.offsetWidth;
      btn.classList.add('mode-pop');
    });
  });
}

export function setRunningGlow(container, running) {
  container?.classList.toggle('is-running', running);
}
