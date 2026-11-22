'use strict';
// Lesson book: shows one .page at a time with previous / next buttons and a progress bar.
// Inside the app (LessonViewer) window.scrollTo is redirected to scroll the app page.

const fmt = (n) => Number(n).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const money = (n) => Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FONT = 'Noto Sans Thai, system-ui, sans-serif';
const COLOR = { ink: '#09090b', ink2: '#27272a', muted: '#71717a', grid: '#e4e4e7', lime: '#c6fa31', limeStrong: '#5c7a00', orange: '#f97316', orangeInk: '#c2410c' };

function niceStep(target) {
  const power = 10 ** Math.floor(Math.log10(Math.max(target, 1e-9)));
  const f = target / power;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * power;
}

/** Plot frame for a chart: scales plus grid and axis labels as an SVG string. */
function plotFrame(svg, { xMax, yMin = 0, yMax, xTicks, yLabel, xLabel, wide = 720 }) {
  const W = Math.max(300, Math.round(svg.getBoundingClientRect().width || wide));
  const narrow = W < 560;
  const H = narrow ? 280 : 340;
  const L = 50, R = W - 16, T = 30, B = H - 44;
  const yStep = niceStep((yMax - yMin) / (narrow ? 4 : 5));
  const top = Math.ceil(yMax / yStep) * yStep;
  const bottom = Math.floor(yMin / yStep) * yStep;
  const x = (v) => L + (v / xMax) * (R - L);
  const y = (v) => B - ((v - bottom) / (top - bottom)) * (B - T);
  let s = `<g font-family="${FONT}" font-size="12" fill="${COLOR.muted}">`;
  s += `<text x="${L - 6}" y="${T - 12}" text-anchor="end">${yLabel}</text>`;
  for (let v = bottom; v <= top + 1e-9; v += yStep) {
    s += `<path d="M${L} ${y(v)}H${R}" stroke="${v === 0 ? '#a1a1aa' : COLOR.grid}"/>`;
    s += `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${fmt(Math.round(v * 100) / 100)}</text>`;
  }
  const step = narrow ? xTicks[1] : xTicks[0];
  for (let v = 0; v <= xMax; v += step) s += `<text x="${x(v)}" y="${B + 18}" text-anchor="middle">${fmt(v)}</text>`;
  s += `<text x="${R}" y="${H - 4}" text-anchor="end">${xLabel}</text></g>`;
  return { W, H, L, R, T, B, x, y, narrow, svgStart: s };
}

/** Label in a white pill so it stays readable over lines (width is fitted in paint()). */
function tag(x, y, text, { anchor = 'middle', fill = COLOR.ink, bold = true } = {}) {
  return `<g class="tag" data-x="${x}" data-anchor="${anchor}" font-family="${FONT}"><rect y="${y - 15}" height="22" rx="11" fill="#fff" stroke="${COLOR.grid}"/>` +
    `<text y="${y}" text-anchor="middle" font-size="12" font-weight="${bold ? 700 : 500}" fill="${fill}">${text}</text></g>`;
}

/** Put the drawing into the SVG, then size each label pill to its text and keep it inside the chart. */
function paint(svg, f, markup) {
  svg.setAttribute('viewBox', `0 0 ${f.W} ${f.H}`);
  svg.innerHTML = markup;
  svg.querySelectorAll('g.tag').forEach((g) => {
    const text = g.querySelector('text');
    let w = 0;
    try {
      w = text.getComputedTextLength();
    } catch {}
    if (!w) w = text.textContent.replace(/[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]/g, '').length * 6.6;
    w += 18;
    const x = Number(g.dataset.x), anchor = g.dataset.anchor;
    let left = anchor === 'end' ? x - w : anchor === 'start' ? x : x - w / 2;
    left = Math.max(2, Math.min(f.W - w - 2, left));
    const rect = g.querySelector('rect');
    rect.setAttribute('x', left);
    rect.setAttribute('width', w);
    text.setAttribute('x', left + w / 2);
  });
}

const Book = (() => {
  const pages = [...document.querySelectorAll('.page')];
  const where = document.getElementById('bookWhere');
  const dots = document.getElementById('bookDots');
  const prev = document.getElementById('bookPrev');
  const next = document.getElementById('bookNext');
  const listeners = [];
  const seen = new Set([0]);
  let index = 0;

  // Pagination capsule: the number strip slides so the current page sits
  // under a fixed ring in the middle; numbers outside the window are clipped.
  const win = document.createElement('div');
  win.className = 'pager-window';
  const ring = document.createElement('span');
  ring.className = 'pager-ring';
  ring.setAttribute('aria-hidden', 'true');
  const track = document.createElement('div');
  track.className = 'pager-track';
  track.setAttribute('role', 'group');
  track.setAttribute('aria-label', 'หน้าในบทเรียน');
  win.append(ring, track);
  next.parentNode.insertBefore(win, next);
  pages.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = i + 1;
    b.setAttribute('aria-label', 'หน้า ' + (i + 1) + ' ' + p.dataset.title);
    b.addEventListener('click', () => go(i));
    track.appendChild(b);
    // Top progress bar (one segment per page)
    const d = document.createElement('button');
    d.type = 'button';
    d.setAttribute('aria-label', 'หน้า ' + (i + 1) + ' ' + p.dataset.title);
    d.addEventListener('click', () => go(i));
    dots.appendChild(d);
  });
  function centerTrack() {
    const b = track.children[index];
    if (!b) return;
    const x = win.clientWidth / 2 - (b.offsetLeft + b.offsetWidth / 2);
    track.style.transform = `translateX(${x}px)`;
  }
  new ResizeObserver(centerTrack).observe(win);

  function render(dir) {
    pages.forEach((p, i) => {
      p.classList.toggle('is-on', i === index);
      p.classList.toggle('from-left', i === index && dir < 0);
      p.setAttribute('aria-hidden', String(i !== index));
    });
    [...track.children, ...dots.children].forEach((b, i) => {
      i %= pages.length;
      b.classList.toggle('seen', seen.has(i));
      if (i === index) b.setAttribute('aria-current', 'step');
      else b.removeAttribute('aria-current');
    });
    centerTrack();
    where.innerHTML = `<b>${pages[index].dataset.title}</b><span>หน้า ${index + 1} / ${pages.length}</span>`;
    prev.disabled = index === 0;
    const last = index === pages.length - 1;
    next.disabled = last;
    next.querySelector('span').textContent = last ? 'จบบทเรียน' : 'หน้าถัดไป';
    listeners.forEach((fn) => fn(index));
  }

  function go(i, scroll = true) {
    if (i < 0 || i >= pages.length || i === index) return;
    const dir = i > index ? 1 : -1;
    index = i;
    seen.add(i);
    render(dir);
    if (scroll) window.scrollTo(0, 0);
  }

  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  document.addEventListener('keydown', (e) => {
    if (e.target.matches?.('input')) return;
    if (e.key === 'ArrowRight') go(index + 1);
    if (e.key === 'ArrowLeft') go(index - 1);
  });
  // Swipe left / right on the page text (not on sliders or charts).
  let sx = null, sy = 0;
  document.addEventListener('touchstart', (e) => {
    sx = e.target.closest('input, .figure') ? null : e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) go(index + (dx < 0 ? 1 : -1));
    sx = null;
  });

  return {
    onShow(fn) {
      listeners.push(fn);
    },
    start() {
      render(1);
    },
    get index() {
      return index;
    },
  };
})();

/** Redraw charts when their page becomes visible or the width changes. */
function keepDrawn(svg, draw) {
  let last = 0;
  new ResizeObserver(() => {
    const w = Math.round(svg.getBoundingClientRect().width);
    if (w && w !== last) {
      last = w;
      draw();
    }
  }).observe(svg);
  Book.onShow(() => requestAnimationFrame(draw));
}
