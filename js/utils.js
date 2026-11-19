// Formatting, escaping, dates, and UI utility helpers

export const CURRENCIES = {
  SAR: { code: 'SAR', symbol: 'ر.س', name: 'ريال سعودي' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'درهم إماراتي' },
  KWD: { code: 'KWD', symbol: 'د.ك', name: 'دينار كويتي' },
  QAR: { code: 'QAR', symbol: 'ر.ق', name: 'ريال قطري' },
  BHD: { code: 'BHD', symbol: 'د.ب', name: 'دينار بحريني' },
  OMR: { code: 'OMR', symbol: 'ر.ع', name: 'ريال عماني' },
  EGP: { code: 'EGP', symbol: 'ج.م', name: 'جنيه مصري' },
  USD: { code: 'USD', symbol: '$', name: 'دولار أمريكي' },
  EUR: { code: 'EUR', symbol: '€', name: 'يورو' }
};

export const EXPENSE_CATEGORIES = [
  'طعام ومقاهي',
  'مقاضي وسوبرماركت',
  'سكن وإيجار',
  'مواصلات ووقود',
  'فواتير واتصالات',
  'تسوق وملابس',
  'صحة وعلاج',
  'تعليم وتطوير',
  'ترفيه وسفر',
  'عائلة وهدايا',
  'اشتراكات رقمية',
  'أخرى'
];

export const INCOME_CATEGORIES = [
  'راتب شهري',
  'عمل حر ومشاريع',
  'تجارة ومبيعات',
  'عوائد استثمار',
  'مكافأة أو هدية',
  'دخل إضافي'
];

export const ACCOUNT_TYPES = {
  bank: { label: 'حساب بنكي', icon: 'bank' },
  cash: { label: 'نقدي (كاش)', icon: 'cash' },
  wallet: { label: 'محفظة رقمية', icon: 'wallet' },
  card: { label: 'بطاقة ائتمانية', icon: 'card' },
  savings: { label: 'حساب ادخار', icon: 'shield' }
};

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatMoney(amount, currencyCode = 'SAR') {
  const num = Number(amount) || 0;
  const cur = CURRENCIES[currencyCode] || CURRENCIES.SAR;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Math.abs(num) % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  }).format(num);
  return `${formatted} ${cur.symbol}`;
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function currentMonthKey() {
  return todayISO().slice(0, 7);
}

export function formatDateAr(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate + (isoDate.length === 10 ? 'T12:00:00' : ''));
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat('ar-SA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(d);
}

export function formatMonthAr(yyyyMm) {
  if (!yyyyMm) return '';
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return new Intl.DateTimeFormat('ar-SA', { month: 'long', year: 'numeric' }).format(d);
}

export function getLastNMonths(n = 6) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const shortLabel = new Intl.DateTimeFormat('ar-SA', { month: 'short' }).format(d);
    out.push({ key, label: shortLabel });
  }
  return out;
}

export function showToast(message) {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 200ms ease';
    setTimeout(() => el.remove(), 220);
  }, 2800);
}

export function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
