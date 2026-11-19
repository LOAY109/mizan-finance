// Crisp Pure-SVG Motion-Graphic Financial Charts v3.0

import { esc, formatMoney, getLastNMonths } from './utils.js';

const PALETTE = [
  '#124E38', '#27A070', '#D4A359', '#3B6E8C',
  '#B45309', '#64748B', '#8C4A3B', '#4F6D7A'
];

export function renderDonutChart(byCategory, currency) {
  const entries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (total <= 0) {
    return `<div class="empty-state" style="padding:20px 10px;">
      <p class="empty-desc">سجّل مصاريفك لهذا الشهر ليظهر توزيع الفئات متحركاً هنا.</p>
    </div>`;
  }

  const size = 176;
  const radius = 62;
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
      <div class="num" style="font-weight:700;white-space:nowrap;">
        ${formatMoney(s.val, currency)} <span style="color:var(--text-muted);font-weight:400;">(${Math.round(s.pct * 100)}%)</span>
      </div>
    </div>
  `).join('');

  return `
    <div class="donut-layout">
      <svg class="chart-donut-anim" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="توزيع المصاريف حسب الفئة">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="var(--bg-surface-subtle)" stroke-width="24"/>
        ${segments.map((s) => s.circle).join('')}
        <text x="50%" y="47%" text-anchor="middle" fill="var(--text-muted)" font-size="11">الإجمالي</text>
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
    return `<div class="empty-state" style="padding:20px 10px;">
      <p class="empty-desc">ستظهر مقارنة الدخل والمصاريف لآخر 6 أشهر بمجرد إضافة معاملاتك الحقيقية.</p>
    </div>`;
  }

  const width = 400;
  const height = 190;
  const padTop = 16;
  const padBottom = 32;
  const chartH = height - padTop - padBottom;
  const groupW = width / data.length;
  const barW = 15;

  const bars = data.map((d, i) => {
    const cx = i * groupW + groupW / 2;
    const incH = (d.inc / maxVal) * chartH;
    const expH = (d.exp / maxVal) * chartH;
    return `
      <g>
        <rect class="chart-bar-anim" style="--bi:${i}" x="${cx - barW - 2}" y="${padTop + chartH - incH}" width="${barW}" height="${Math.max(incH, 2)}" rx="4" fill="var(--color-income)">
          <title>${d.label} — الدخل: ${formatMoney(d.inc, currency)}</title>
        </rect>
        <rect class="chart-bar-anim" style="--bi:${i + 0.5}" x="${cx + 2}" y="${padTop + chartH - expH}" width="${barW}" height="${Math.max(expH, 2)}" rx="4" fill="var(--color-expense)" opacity="0.88">
          <title>${d.label} — المصاريف: ${formatMoney(d.exp, currency)}</title>
        </rect>
        <text x="${cx}" y="${height - 10}" text-anchor="middle" fill="var(--text-muted)" font-size="11">${esc(d.label)}</text>
      </g>
    `;
  }).join('');

  return `
    <div class="chart-wrap">
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;" role="img" aria-label="مقارنة الدخل والمصاريف">
        <line x1="8" y1="${padTop + chartH}" x2="${width - 8}" y2="${padTop + chartH}" stroke="var(--border-subtle)" stroke-width="1"/>
        ${bars}
      </svg>
      <div style="display:flex;gap:16px;justify-content:center;margin-top:4px;font-size:12px;color:var(--text-secondary);">
        <span style="display:inline-flex;align-items:center;gap:6px;"><span class="legend-dot" style="background:var(--color-income)"></span>الدخل</span>
        <span style="display:inline-flex;align-items:center;gap:6px;"><span class="legend-dot" style="background:var(--color-expense)"></span>المصاريف</span>
      </div>
    </div>
  `;
}

export function renderDailySpendChart(byDay, monthKey, currency) {
  const [y, m] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(y, m || 1, 0).getDate();
  const points = [];
  let maxVal = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const val = byDay[d] || 0;
    if (val > maxVal) maxVal = val;
    points.push({ day: d, val });
  }

  if (maxVal <= 0) {
    return `<div class="empty-state" style="padding:20px 10px;">
      <p class="empty-desc">سيظهر منحنى صرفك اليومي خلال الشهر بمجرد تسجيل أول مصروف.</p>
    </div>`;
  }

  const width = 400;
  const height = 165;
  const padX = 14;
  const padTop = 14;
  const padBottom = 28;
  const plotW = width - padX * 2;
  const plotH = height - padTop - padBottom;

  const coords = points.map((p, idx) => {
    const x = padX + (idx / Math.max(1, daysInMonth - 1)) * plotW;
    const yPos = padTop + plotH - (p.val / maxVal) * plotH;
    return { ...p, x, y: yPos };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(padTop + plotH).toFixed(1)} L${coords[0].x.toFixed(1)},${(padTop + plotH).toFixed(1)} Z`;

  const dots = coords.filter((c) => c.val > 0).map((c) => `
    <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.5" fill="var(--accent-primary)">
      <title>يوم ${c.day}: ${formatMoney(c.val, currency)}</title>
    </circle>
  `).join('');

  const ticks = [1, 10, 20, daysInMonth].map((d) => {
    const c = coords[d - 1];
    return `<text x="${c.x.toFixed(1)}" y="${height - 8}" text-anchor="middle" fill="var(--text-muted)" font-size="10.5">يوم ${d}</text>`;
  }).join('');

  return `
    <div class="chart-wrap">
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;" role="img" aria-label="منحنى الصرف اليومي">
        <line x1="${padX}" y1="${padTop + plotH}" x2="${width - padX}" y2="${padTop + plotH}" stroke="var(--border-subtle)" stroke-width="1"/>
        <path d="${areaPath}" fill="var(--accent-primary)" fill-opacity="0.12"/>
        <path class="chart-line-anim" d="${linePath}" fill="none" stroke="var(--accent-primary)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
        ${ticks}
      </svg>
    </div>
  `;
}
