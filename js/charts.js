// Crisp Pure-SVG Interactive Financial Charts (Zero External Dependencies)

import { esc, formatMoney, getLastNMonths } from './utils.js';

const PALETTE = [
  '#14533C', '#2A7B5E', '#D4A359', '#3B6E8C',
  '#B45309', '#64748B', '#8C4A3B', '#4F6D7A'
];

export function renderDonutChart(byCategory, currency) {
  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (total <= 0) {
    return `<div class="empty-state" style="padding:24px 12px;">
      <p class="empty-desc">سجّل مصاريفك لهذا الشهر ليظهر توزيع الفئات تلقائياً هنا.</p>
    </div>`;
  }

  const size = 180;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const segments = entries.slice(0, 8).map(([cat, val], idx) => {
    const pct = val / total;
    const dash = pct * circumference;
    const color = PALETTE[idx % PALETTE.length];
    const circle = `<circle
      cx="${size / 2}" cy="${size / 2}" r="${radius}"
      fill="none" stroke="${color}" stroke-width="24"
      stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 ${size / 2} ${size / 2})"
    ><title>${esc(cat)}: ${formatMoney(val, currency)} (${Math.round(pct * 100)}%)</title></circle>`;
    offset += dash;
    return { cat, val, pct, color, circle };
  });

  const legend = segments.map((s) => `
    <div class="legend-item">
      <div style="display:flex;align-items:center;gap:8px;min-width:0;">
        <span class="legend-dot" style="background:${s.color}"></span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.cat)}</span>
      </div>
      <div class="num" style="font-weight:600;white-space:nowrap;">
        ${formatMoney(s.val, currency)} <span style="color:var(--text-muted);font-weight:400;">(${Math.round(s.pct * 100)}%)</span>
      </div>
    </div>
  `).join('');

  return `
    <div class="donut-layout">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="توزيع المصاريف حسب الفئة">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="var(--bg-surface-subtle)" stroke-width="24"/>
        ${segments.map((s) => s.circle).join('')}
        <text x="50%" y="48%" text-anchor="middle" fill="var(--text-muted)" font-size="11">الإجمالي</text>
        <text x="50%" y="60%" text-anchor="middle" fill="var(--text-primary)" font-size="13" font-weight="700" class="num">${formatMoney(total, currency)}</text>
      </svg>
      <div class="donut-legend">${legend}</div>
    </div>
  `;
}

export function renderCashflowBarChart(transactions, currency) {
  const months = getLastNMonths(6);
  const data = months.map((m) => {
    const inc = transactions
      .filter((t) => t.type === 'income' && (t.date || '').startsWith(m.key))
      .reduce((s, t) => s + t.amount, 0);
    const exp = transactions
      .filter((t) => t.type === 'expense' && (t.date || '').startsWith(m.key))
      .reduce((s, t) => s + t.amount, 0);
    return { ...m, inc, exp };
  });

  const maxVal = Math.max(...data.flatMap((d) => [d.inc, d.exp]), 0);
  if (maxVal <= 0) {
    return `<div class="empty-state" style="padding:24px 12px;">
      <p class="empty-desc">ستظهر مقارنة الدخل والمصاريف لآخر 6 أشهر بمجرد إضافة معاملاتك الحقيقية.</p>
    </div>`;
  }

  const width = 520;
  const height = 210;
  const padTop = 18;
  const padBottom = 34;
  const chartH = height - padTop - padBottom;
  const groupW = width / data.length;
  const barW = 18;

  const bars = data.map((d, i) => {
    const cx = i * groupW + groupW / 2;
    const incH = (d.inc / maxVal) * chartH;
    const expH = (d.exp / maxVal) * chartH;
    return `
      <g>
        <rect x="${cx - barW - 2}" y="${padTop + chartH - incH}" width="${barW}" height="${Math.max(incH, 2)}" rx="4" fill="var(--color-income)">
          <title>${d.label} — الدخل: ${formatMoney(d.inc, currency)}</title>
        </rect>
        <rect x="${cx + 2}" y="${padTop + chartH - expH}" width="${barW}" height="${Math.max(expH, 2)}" rx="4" fill="var(--color-expense)" opacity="0.85">
          <title>${d.label} — المصاريف: ${formatMoney(d.exp, currency)}</title>
        </rect>
        <text x="${cx}" y="${height - 10}" text-anchor="middle" fill="var(--text-muted)" font-size="11">${esc(d.label)}</text>
      </g>
    `;
  }).join('');

  return `
    <div class="chart-wrap">
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;max-height:230px;" role="img" aria-label="مقارنة الدخل والمصاريف">
        <line x1="8" y1="${padTop + chartH}" x2="${width - 8}" y2="${padTop + chartH}" stroke="var(--border-subtle)" stroke-width="1"/>
        ${bars}
      </svg>
      <div style="display:flex;gap:16px;justify-content:center;margin-top:6px;font-size:12px;color:var(--text-secondary);">
        <span style="display:inline-flex;align-items:center;gap:6px;"><span class="legend-dot" style="background:var(--color-income)"></span>الدخل</span>
        <span style="display:inline-flex;align-items:center;gap:6px;"><span class="legend-dot" style="background:var(--color-expense)"></span>المصاريف</span>
      </div>
    </div>
  `;
}
