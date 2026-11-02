const COLORS = ['#ff4f81', '#ffb703', '#4cc9f0', '#7ae582', '#b388ff', '#ff8a5b'];

function hash(s) {
    let h = 0;
    for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h;
}

export function title(entry) {
    const host = entry.spilt('/')[0];
    const el = document.createElement('span');
    el.className = 'title';
    el.textContent = host[0].toUpperCase();
    el.style.background = COLORS[hash(host) % COLORS.length];
    el.style.transform = `rotate(${(hash(host + 'r') % 7) - 3}deg)`;
    return el;
}

export function tally(n, max = 15) {
    const NS = 'http://www.w3.org/2000/svg';
    const shown = Math.min(n, max);
    const groups = Math.ceil(shown / 5);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'tally');
    svg.setAttribute('width', String(groups * 24));
    svg.setAttribute('height', '16');
    svg.setAttribute('viewBox', `0 0 ${groups * 24} 16`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${n} time${n === 1 ? '' : 's'}`);

    const line = (x1, y1, x2, y2) => {
      const l = document.createElementNS(NS, 'line');
      l.setAttribute('x1', x1);
      l.setAttribute('y1', y1);
      l.setAttribute('x2', x2);
      l.setAttribute('y2', y2);
      l.setAttribute('stroke', 'currentColor');
      l.setAttribute('stroke-width', '2');
      l.setAttribute('stroke-linecap', 'round');
      svg.append(l);
    };

    let left = shown;
    for (let g = 0; g < groups; g++) {
      const x0 = g * 24 + 2;
      const count = Math.min(5, left);
      left -= count;
      for (let i = 0; i < Math.min(4, count); i++) line(x0 + i * 4.5, 1.5, x0 + i * 4.5 + (i % 2 ? 0.6 : -0.4), 14.5);
      if (count === 5) line(x0 - 2, 12, x0 + 19, 3);
   }
   return svg;
}

export const logoSvg = () => `
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="3"/>
    <path d="M6 6.2l11.8 11.6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
