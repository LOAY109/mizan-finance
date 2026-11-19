// Modular View Renderers v5.0 — Full Motion-Graphics Scroll Choreography & Mobile Polish
// Strictly Real User Data, Zero Demo Placeholders

import { icon } from './icons.js';
import {
  esc, formatMoney, formatDateAr, formatMonthAr, currentMonthKey,
  ACCOUNT_TYPES, CURRENCIES
} from './utils.js';
import { getState, getFinancialSummary, getAllCategories } from './store.js';
import { generateFinancialPlan } from './ai-engine.js';
import { renderDonutChart, renderCashflowBarChart, renderDailySpendChart } from './charts.js';

function accountNameById(accounts, id) {
  return accounts.find((a) => a.id === id)?.name || 'بدون حساب مرتبط';
}

function monthSwitcherHtml(activeMonth, onSurface = false) {
  return `
    <div class="month-switcher ${onSurface ? 'surface' : ''}" aria-label="تغيير الشهر">
      <button class="month-switcher-btn" data-action="shift-month" data-delta="-1" aria-label="الشهر السابق">${icon('chevronRight', 15)}</button>
      <span class="month-switcher-label">${esc(formatMonthAr(activeMonth))}</span>
      <button class="month-switcher-btn" data-action="shift-month" data-delta="1" aria-label="الشهر التالي">${icon('chevronLeft', 15)}</button>
    </div>
  `;
}

function txRowHtml(tx, accounts, cur, showActions = false) {
  const isIncome = tx.type === 'income';
  const isTransfer = tx.type === 'transfer';
  const sign = isIncome ? '+' : isTransfer ? '' : '-';
  const iconName = isIncome ? 'arrowDown' : isTransfer ? 'repeat' : 'arrowUp';
  const cls = isIncome ? 'income' : isTransfer ? 'transfer' : 'expense';
  const accLabel = isTransfer
    ? `${accountNameById(accounts, tx.accountId)} ← ${accountNameById(accounts, tx.toAccountId)}`
    : accountNameById(accounts, tx.accountId);

  return `
    <div class="list-row">
      <div class="row-lead">
        <div class="row-icon ${cls}">${icon(iconName, 16)}</div>
        <div style="min-width:0;flex:1;">
          <div class="row-title">${esc(tx.note || tx.category)}</div>
          <div class="row-meta">
            <span>${esc(tx.category)}</span>
            <span>·</span>
            <span>${esc(accLabel)}</span>
            <span>·</span>
            <span>${esc(formatDateAr(tx.date))}</span>
          </div>
        </div>
      </div>
      <div class="row-end">
        <span class="num amount-${cls}" style="font-size:13.5px;">${sign}${formatMoney(tx.amount, cur)}</span>
        ${showActions ? `
          <button class="btn-icon" style="width:30px;height:30px;" data-action="edit-tx" data-id="${tx.id}" aria-label="تعديل المعاملة">${icon('edit', 13)}</button>
          <button class="btn-icon" style="width:30px;height:30px;" data-action="delete-tx" data-id="${tx.id}" aria-label="حذف المعاملة">${icon('trash', 13)}</button>
        ` : ''}
      </div>
    </div>
  `;
}

// =========================================================================
// 1. OVERVIEW DASHBOARD (Scroll-Choreographed Motion Graphics)
// =========================================================================
export function renderDashboardView(activeMonth) {
  const state = getState();
  const cur = state.profile.currency || 'SAR';
  const plan = generateFinancialPlan(activeMonth);
  const s = plan.summary;
  const expCats = getAllCategories('expense');

  const monthTxs = state.transactions.filter((t) => (t.date || '').startsWith(activeMonth)).slice(0, 5);
  const topInsight = plan.insights[0];

  return `
    <!-- Living 2.5D Scroll-Parallax Hero Card with Specular Sheen -->
    <section id="hero-parallax-card" class="hero-card" data-reveal="scale" aria-label="ملخص الرصيد">
      <div class="hero-orb hero-orb-1" aria-hidden="true"></div>
      <div class="hero-orb hero-orb-2" aria-hidden="true"></div>
      <div class="hero-sheen" aria-hidden="true"></div>
      <div class="hero-inner">
        <div class="hero-top-row">
          <span class="hero-label">إجمالي أرصدتك الحالية</span>
          ${monthSwitcherHtml(activeMonth, false)}
        </div>
        <div class="hero-balance num" data-count="${s.totalBalance}" data-currency="${esc(cur)}">${formatMoney(s.totalBalance, cur)}</div>
        <div class="hero-sub">
          ${state.accounts.length === 0
            ? 'أضف أول حساب حقيقي لتتبع رصيدك لحظياً'
            : `عبر ${state.accounts.length} حساب · صافي الثروة ${formatMoney(s.netWorth, cur)}`}
        </div>

        <div class="hero-stats-row">
          <div class="hero-stat-pill">
            <span class="hero-stat-label">${icon('arrowDown', 13)} دخل الشهر</span>
            <span class="hero-stat-val num">${formatMoney(s.monthIncome, cur)}</span>
          </div>
          <div class="hero-stat-pill">
            <span class="hero-stat-label">${icon('arrowUp', 13)} مصاريف الشهر</span>
            <span class="hero-stat-val num">${formatMoney(s.monthExpense, cur)}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 4-Button Spring Quick Action Dock -->
    <section class="action-dock" data-reveal="up" aria-label="إجراءات سريعة">
      <button class="dock-btn" data-action="open-modal" data-modal="expense">
        <span class="dock-icon expense">${icon('arrowUp', 18)}</span>
        <span>مصروف</span>
      </button>
      <button class="dock-btn" data-action="open-modal" data-modal="income">
        <span class="dock-icon income">${icon('arrowDown', 18)}</span>
        <span>دخل</span>
      </button>
      <label class="dock-btn" style="cursor:pointer;">
        <span class="dock-icon transfer">${icon('camera', 18)}</span>
        <span>فاتورة</span>
        <input type="file" id="dash-receipt-input" accept="image/*" class="hidden">
      </label>
      <button class="dock-btn" data-nav="advisor">
        <span class="dock-icon ai">${icon('sparkles', 18)}</span>
        <span>المستشار</span>
      </button>
    </section>

    <!-- Clean Quick-Access Pill Strip (Unclutters Topbar) -->
    <nav class="pill-strip" data-reveal="slide" aria-label="أقسام إضافية">
      <button class="pill-nav-btn" data-nav="budgets">${icon('pie', 14)} الميزانيات والالتزامات</button>
      <button class="pill-nav-btn" data-nav="goals">${icon('target', 14)} الأهداف والديون</button>
      <button class="pill-nav-btn" data-action="open-modal" data-modal="transfer">${icon('repeat', 14)} تحويل بين حسابين</button>
    </nav>

    <!-- Sleek Compact 1-Row Quick Expense Card -->
    <form id="quick-add-form" class="quick-add-card" data-reveal="up" aria-label="تسجيل مصروف سريع">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:var(--accent-primary);">
          ${icon('zap', 15)} مصروف سريع
        </span>
        ${plan.allocation.baseIncome > 0 && plan.daysLeft > 0
          ? `<span class="badge badge-accent num">الحد اليومي: ${formatMoney(plan.safeDailySpend, cur)}</span>`
          : ''}
      </div>
      <div class="quick-add-inline">
        <input id="qa-amount" class="form-input num" type="number" inputmode="decimal" min="0.01" step="any" required placeholder="المبلغ">
        <select id="qa-cat" class="form-select">
          ${expCats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
        </select>
        <button type="submit" class="btn btn-primary" style="padding:0 14px;" aria-label="حفظ">${icon('plus', 18)}</button>
      </div>
      <div class="quick-add-row">
        ${state.accounts.length > 0 ? `
          <select id="qa-acc" class="form-select" style="min-height:38px;font-size:12.5px;">
            ${state.accounts.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}
          </select>
        ` : `<input class="form-input" style="min-height:38px;font-size:12.5px;" disabled value="بدون حساب">`}
        <input id="qa-note" class="form-input" style="min-height:38px;font-size:12.5px;" type="text" placeholder="ملاحظة (اختياري)">
      </div>
    </form>

    <!-- Horizontal Swipeable Accounts Strip -->
    <section data-reveal="slide">
      <div class="card-header" style="margin-bottom:8px;">
        <h2 class="card-title">${icon('wallet', 16)} حساباتك ومحافظك</h2>
        <button class="btn btn-ghost" data-nav="accounts">إدارة الكل</button>
      </div>
      ${state.accounts.length === 0 ? `
        <div class="card empty-state" style="padding:18px 14px;">
          <p class="empty-desc">أضف حساباتك البنكية أو المحافظ الرقمية أو الكاش لمعرفة سيولتك بدقة.</p>
          <button class="btn btn-secondary btn-sm" data-action="open-modal" data-modal="account">${icon('plus', 15)} إضافة أول حساب</button>
        </div>
      ` : `
        <div class="h-scroll">
          ${state.accounts.map((acc) => {
            const meta = ACCOUNT_TYPES[acc.type] || ACCOUNT_TYPES.bank;
            return `
              <button class="acc-mini-card" style="text-align:start;" data-action="adjust-balance" data-id="${acc.id}">
                <div style="display:flex;align-items:center;justify-content:space-between;width:100%;">
                  <span class="row-icon" style="width:32px;height:32px;border-radius:9px;">${icon(meta.icon, 15)}</span>
                  <span style="font-size:10.5px;color:var(--text-muted);">${esc(meta.label)}</span>
                </div>
                <div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;width:100%;">${esc(acc.name)}</div>
                <div class="num" style="font-size:15px;font-weight:700;color:var(--accent-primary);">${formatMoney(acc.balance, cur)}</div>
              </button>
            `;
          }).join('')}
          <button class="acc-mini-card" style="justify-content:center;align-items:center;border-style:dashed;color:var(--text-secondary);" data-action="open-modal" data-modal="account">
            ${icon('plus', 20)}
            <span style="font-size:12px;font-weight:600;">حساب جديد</span>
          </button>
        </div>
      `}
    </section>

    <!-- Smart AI Insight Banner (Scroll Clip Reveal) -->
    ${topInsight ? `
      <section class="ai-banner" data-reveal="clip">
        <div style="display:flex;gap:11px;align-items:flex-start;">
          <div class="row-icon pulse-glow" style="background:var(--accent-primary);color:#fff;">${icon('sparkles', 17)}</div>
          <div style="min-width:0;">
            <div style="font-weight:700;font-size:14px;margin-bottom:2px;">${esc(topInsight.title)}</div>
            <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.55;">${esc(topInsight.body)}</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" style="align-self:flex-start;" data-nav="advisor">افتح المستشار ومحاكي «ماذا لو؟»</button>
      </section>
    ` : ''}

    <!-- Recent Month Transactions -->
    <section class="card" data-reveal="up">
      <div class="card-header">
        <div>
          <h2 class="card-title">آخر معاملات ${esc(formatMonthAr(activeMonth))}</h2>
          <p class="card-subtitle">${s.monthTxCount} عملية مسجلة</p>
        </div>
        ${state.transactions.length > 0 ? `<button class="btn btn-ghost" data-nav="transactions">عرض الكل</button>` : ''}
      </div>
      ${monthTxs.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icon('arrows', 20)}</div>
          <div class="empty-title">لا توجد معاملات في هذا الشهر</div>
          <p class="empty-desc">ابدأ بأول مصروف أو صوّر فاتورة من زر «فاتورة» بالأعلى.</p>
        </div>
      ` : monthTxs.map((t) => txRowHtml(t, state.accounts, cur, false)).join('')}
    </section>

    <!-- Scroll-Triggered Animated Expense Distribution -->
    <section class="card" data-reveal="scale">
      <div class="card-header">
        <h2 class="card-title">توزيع مصاريف الشهر</h2>
        <button class="btn btn-ghost" data-nav="analytics">التقارير</button>
      </div>
      ${renderDonutChart(s.byCategory, cur)}
    </section>

    <!-- Scroll-Triggered Budgets Preview -->
    <section class="card" data-reveal="up">
      <div class="card-header">
        <h2 class="card-title">الميزانيات الشهرية</h2>
        <button class="btn btn-ghost" data-nav="budgets">ضبط الكل</button>
      </div>
      ${state.budgets.length === 0 ? `
        <div class="empty-state" style="padding:16px 10px;">
          <p class="empty-desc">ضع سقفاً لفئاتك أو ولّد ميزانية ذكية تلقائياً حسب دخلك.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
            <button class="btn btn-secondary btn-sm" data-action="open-modal" data-modal="budget">${icon('plus', 14)} ميزانية</button>
            <button class="btn btn-primary btn-sm" data-action="auto-budgets">${icon('sparkles', 14)} توليد ذكي</button>
          </div>
        </div>
      ` : state.budgets.slice(0, 4).map((b) => {
        const spent = s.byCategory[b.category] || 0;
        const pct = Math.min(100, Math.round((spent / Math.max(1, b.limit)) * 100));
        const status = spent > b.limit ? 'danger' : pct >= 80 ? 'warning' : '';
        return `
          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;">
              <span style="font-weight:600;">${esc(b.category)}</span>
              <span class="num">${formatMoney(spent, cur)} / ${formatMoney(b.limit, cur)}</span>
            </div>
            <div class="progress-track"><div class="progress-fill ${status}" data-fill="${pct}"></div></div>
          </div>
        `;
      }).join('')}
    </section>
  `;
}

// =========================================================================
// 2. TRANSACTIONS LEDGER
// =========================================================================
export function renderTransactionsView(filters) {
  const state = getState();
  const cur = state.profile.currency || 'SAR';

  const list = state.transactions.filter((t) => {
    if (filters.type && t.type !== filters.type) return false;
    if (filters.accountId && t.accountId !== filters.accountId && t.toAccountId !== filters.accountId) return false;
    if (filters.month && !(t.date || '').startsWith(filters.month)) return false;
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const hay = `${t.note} ${t.category}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const sumIn = list.filter((t) => t.type === 'income').reduce((a, b) => a + b.amount, 0);
  const sumOut = list.filter((t) => t.type === 'expense').reduce((a, b) => a + b.amount, 0);

  return `
    <header class="page-header" data-reveal="up">
      <div>
        <h1 class="page-title">المعاملات المالية</h1>
        <p class="page-subtitle">سجّل وعدّل وابحث في كل عملياتك</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" data-action="export-csv">${icon('download', 15)} CSV</button>
        <button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="expense">${icon('plus', 15)} إضافة</button>
      </div>
    </header>

    <section class="card" data-reveal="up">
      <div class="filter-bar">
        <input type="search" class="form-input span-2" id="flt-q" placeholder="بحث بالملاحظة أو الفئة..." value="${esc(filters.q)}">
        <select class="form-select" id="flt-type">
          <option value="">كل الأنواع</option>
          <option value="expense" ${filters.type === 'expense' ? 'selected' : ''}>مصاريف</option>
          <option value="income" ${filters.type === 'income' ? 'selected' : ''}>دخل</option>
          <option value="transfer" ${filters.type === 'transfer' ? 'selected' : ''}>تحويلات</option>
        </select>
        <select class="form-select" id="flt-account">
          <option value="">كل الحسابات</option>
          ${state.accounts.map((a) => `<option value="${a.id}" ${filters.accountId === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')}
        </select>
        <input type="month" class="form-input span-2" id="flt-month" value="${esc(filters.month)}">
      </div>

      ${list.length > 0 ? `
        <div class="kpi-grid-2" style="margin-bottom:12px;">
          <div style="padding:10px 12px;background:var(--bg-surface-subtle);border-radius:14px;font-size:12px;">
            <div style="color:var(--text-muted);">الدخل (${list.length} عملية)</div>
            <div class="num amount-income" style="font-size:14px;margin-top:2px;">+${formatMoney(sumIn, cur)}</div>
          </div>
          <div style="padding:10px 12px;background:var(--bg-surface-subtle);border-radius:14px;font-size:12px;">
            <div style="color:var(--text-muted);">المصاريف</div>
            <div class="num amount-expense" style="font-size:14px;margin-top:2px;">-${formatMoney(sumOut, cur)}</div>
          </div>
        </div>
      ` : ''}

      ${list.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icon('arrows', 20)}</div>
          <div class="empty-title">${state.transactions.length === 0 ? 'السجل فارغ تماماً' : 'لا توجد معاملات مطابقة'}</div>
          <p class="empty-desc">${state.transactions.length === 0 ? 'أضف أول معاملة حقيقية وسيتم تحديث أرصدتك تلقائياً.' : 'جرّب تغيير الفلاتر أو مسح البحث.'}</p>
          ${state.transactions.length === 0 ? `<button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="expense">${icon('plus', 15)} إضافة معاملة</button>` : ''}
        </div>
      ` : list.map((t) => txRowHtml(t, state.accounts, cur, true)).join('')}
    </section>
  `;
}

// =========================================================================
// 3. ACCOUNTS & WALLETS
// =========================================================================
export function renderAccountsView() {
  const state = getState();
  const cur = state.profile.currency || 'SAR';
  const total = state.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);

  return `
    <header class="page-header" data-reveal="up">
      <div>
        <h1 class="page-title">الحسابات والمحافظ</h1>
        <p class="page-subtitle">إجمالي السيولة: <strong class="num">${formatMoney(total, cur)}</strong></p>
      </div>
      <div class="header-actions">
        ${state.accounts.length >= 2 ? `<button class="btn btn-secondary btn-sm" data-action="open-modal" data-modal="transfer">${icon('repeat', 15)} تحويل</button>` : ''}
        <button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="account">${icon('plus', 15)} حساب</button>
      </div>
    </header>

    ${state.accounts.length === 0 ? `
      <section class="card" data-reveal="scale">
        <div class="empty-state">
          <div class="empty-icon">${icon('wallet', 22)}</div>
          <div class="empty-title">ما أضفت أي حساب بعد</div>
          <p class="empty-desc">أضف حساباتك البنكية، الكاش، البطاقات الائتمانية، أو المحافظ الرقمية لربط معاملاتك بها.</p>
          <button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="account">${icon('plus', 15)} إضافة أول حساب</button>
        </div>
      </section>
    ` : `
      <div class="stack-sm">
        ${state.accounts.map((acc) => {
          const meta = ACCOUNT_TYPES[acc.type] || ACCOUNT_TYPES.bank;
          return `
            <article class="card stack-sm" data-reveal="up">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div style="display:flex;gap:10px;align-items:center;">
                  <div class="row-icon">${icon(meta.icon, 18)}</div>
                  <div>
                    <div style="font-weight:700;font-size:14.5px;">${esc(acc.name)}</div>
                    <div style="font-size:11.5px;color:var(--text-muted);">${esc(meta.label)}</div>
                  </div>
                </div>
                <button class="btn-icon" style="width:34px;height:34px;" data-action="delete-account" data-id="${acc.id}" aria-label="حذف الحساب">${icon('trash', 15)}</button>
              </div>
              <div class="kpi-value num" data-count="${acc.balance}" data-currency="${esc(cur)}">${formatMoney(acc.balance, cur)}</div>
              ${acc.notes ? `<p style="font-size:12px;color:var(--text-secondary);">${esc(acc.notes)}</p>` : ''}
              <button class="btn btn-secondary btn-sm" style="width:100%;" data-action="adjust-balance" data-id="${acc.id}">تعديل الرصيد</button>
            </article>
          `;
        }).join('')}
      </div>
    `}
  `;
}

// =========================================================================
// 4. BUDGETS & RECURRING BILLS
// =========================================================================
export function renderBudgetsView() {
  const state = getState();
  const cur = state.profile.currency || 'SAR';
  const mKey = currentMonthKey();
  const s = getFinancialSummary(mKey);

  return `
    <header class="page-header" data-reveal="up">
      <div>
        <h1 class="page-title">الميزانيات والالتزامات</h1>
        <p class="page-subtitle">سقف الصرف الشهري والفواتير المتكررة</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" data-action="auto-budgets">${icon('sparkles', 15)} توليد ذكي</button>
        <button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="budget">${icon('plus', 15)} ميزانية</button>
      </div>
    </header>

    <section class="card" data-reveal="up">
      <div class="card-header">
        <div>
          <h2 class="card-title">حدود الميزانيات (${esc(formatMonthAr(mKey))})</h2>
          <p class="card-subtitle">تتحدث تلقائياً مع كل مصروف تسجله</p>
        </div>
      </div>
      ${state.budgets.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icon('pie', 20)}</div>
          <div class="empty-title">لا توجد ميزانيات محددة</div>
          <p class="empty-desc">حدد سقفاً يدوياً أو اضغط "توليد ذكي" لتقسيم دخلك تلقائياً على الفئات.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
            <button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="budget">${icon('plus', 14)} ميزانية</button>
            <button class="btn btn-secondary btn-sm" data-action="auto-budgets">${icon('sparkles', 14)} توليد ذكي</button>
          </div>
        </div>
      ` : state.budgets.map((b) => {
        const spent = s.byCategory[b.category] || 0;
        const remaining = b.limit - spent;
        const pct = Math.min(100, Math.round((spent / Math.max(1, b.limit)) * 100));
        const status = spent > b.limit ? 'danger' : pct >= 80 ? 'warning' : '';
        return `
          <div style="padding:11px 0;border-bottom:1px solid var(--border-subtle);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <div>
                <span style="font-weight:700;font-size:13.5px;">${esc(b.category)}</span>
                <span class="badge ${status === 'danger' ? 'badge-expense' : status === 'warning' ? 'badge-warning' : 'badge-neutral'}" style="margin-inline-start:6px;">${pct}%</span>
              </div>
              <button class="btn-icon" style="width:32px;height:32px;" data-action="delete-budget" data-id="${b.id}" aria-label="حذف الميزانية">${icon('trash', 14)}</button>
            </div>
            <div class="progress-track" style="margin-bottom:5px;"><div class="progress-fill ${status}" data-fill="${pct}"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-secondary);">
              <span class="num">المصروف: ${formatMoney(spent, cur)}</span>
              <span class="num">${remaining >= 0 ? `المتبقي: ${formatMoney(remaining, cur)}` : `تجاوز بـ ${formatMoney(Math.abs(remaining), cur)}`}</span>
            </div>
          </div>
        `;
      }).join('')}
    </section>

    <section class="card" data-reveal="up">
      <div class="card-header">
        <div>
          <h2 class="card-title">الفواتير والاشتراكات المتكررة</h2>
          <p class="card-subtitle">الإجمالي الشهري: <strong class="num">${formatMoney(s.monthlyRecurringTotal, cur)}</strong></p>
        </div>
        <button class="btn btn-secondary btn-sm" data-action="open-modal" data-modal="recurring">${icon('plus', 14)} التزام</button>
      </div>
      ${state.recurring.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icon('calendar', 20)}</div>
          <div class="empty-title">لا توجد التزامات متكررة</div>
          <p class="empty-desc">أضف الإيجار، فواتير الجوال والإنترنت، أو اشتراكاتك لسدادها بضغطة زر.</p>
        </div>
      ` : state.recurring.map((r) => {
        const paidThisMonth = r.lastPaidMonth === mKey;
        return `
          <div class="list-row">
            <div class="row-lead">
              <div class="row-icon ${paidThisMonth ? 'income' : ''}">${icon(paidThisMonth ? 'check' : 'calendar', 16)}</div>
              <div style="min-width:0;">
                <div class="row-title">${esc(r.title)}</div>
                <div class="row-meta">يوم ${r.dueDay} · ${esc(r.category)}</div>
              </div>
            </div>
            <div class="row-end">
              <span class="num" style="font-weight:700;font-size:13px;">${formatMoney(r.amount, cur)}</span>
              ${paidThisMonth
                ? `<span class="badge badge-income">مدفوع</span>`
                : `<button class="btn btn-primary btn-sm" data-action="pay-recurring" data-id="${r.id}">سداد</button>`}
              <button class="btn-icon" style="width:32px;height:32px;" data-action="delete-recurring" data-id="${r.id}" aria-label="حذف">${icon('trash', 14)}</button>
            </div>
          </div>
        `;
      }).join('')}
    </section>
  `;
}

// =========================================================================
// 5. GOALS & DEBTS
// =========================================================================
export function renderGoalsView() {
  const state = getState();
  const cur = state.profile.currency || 'SAR';
  const s = getFinancialSummary();

  return `
    <header class="page-header" data-reveal="up">
      <div>
        <h1 class="page-title">الأهداف والديون</h1>
        <p class="page-subtitle">خطط لمدخراتك وتابع كل مبلغ لك أو عليك</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary btn-sm" data-action="open-modal" data-modal="debt">${icon('handshake', 15)} دين</button>
        <button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="goal">${icon('target', 15)} هدف</button>
      </div>
    </header>

    <section class="card" data-reveal="up">
      <div class="card-header"><h2 class="card-title">الأهداف الادخارية</h2></div>
      ${state.goals.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icon('target', 20)}</div>
          <div class="empty-title">لا توجد أهداف مسجلة</div>
          <p class="empty-desc">أنشئ هدفاً لصندوق الطوارئ، السفر، أو مشروعك وتابع تقدمك خطوة بخطوة.</p>
          <button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="goal">${icon('plus', 14)} إنشاء هدف</button>
        </div>
      ` : state.goals.map((g) => {
        const pct = Math.min(100, Math.round((g.currentAmount / Math.max(1, g.targetAmount)) * 100));
        const rem = Math.max(0, g.targetAmount - g.currentAmount);
        return `
          <div style="padding:12px 0;border-bottom:1px solid var(--border-subtle);">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
              <div style="min-width:0;">
                <div style="font-weight:700;font-size:14px;">${esc(g.title)}</div>
                <div style="font-size:11.5px;color:var(--text-muted);">${g.targetDate ? `الموعد: ${esc(formatDateAr(g.targetDate))}` : 'مفتوح المدة'}</div>
              </div>
              <div style="display:flex;gap:6px;">
                <button class="btn btn-secondary btn-sm" data-action="contribute-goal" data-id="${g.id}">+ مبلغ</button>
                <button class="btn-icon" style="width:32px;height:32px;" data-action="delete-goal" data-id="${g.id}" aria-label="حذف">${icon('trash', 14)}</button>
              </div>
            </div>
            <div class="progress-track" style="margin-bottom:5px;"><div class="progress-fill" data-fill="${pct}"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-secondary);">
              <span class="num">${formatMoney(g.currentAmount, cur)} / ${formatMoney(g.targetAmount, cur)} (${pct}%)</span>
              <span class="num">${rem === 0 ? 'مكتمل' : `متبقي ${formatMoney(rem, cur)}`}</span>
            </div>
          </div>
        `;
      }).join('')}
    </section>

    <section class="card" data-reveal="up">
      <div class="card-header">
        <div>
          <h2 class="card-title">الديون والالتزامات</h2>
          <p class="card-subtitle">عليك: <strong class="num amount-expense">${formatMoney(s.owedByMe, cur)}</strong> · لك: <strong class="num amount-income">${formatMoney(s.owedToMe, cur)}</strong></p>
        </div>
      </div>
      ${state.debts.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icon('handshake', 20)}</div>
          <div class="empty-title">لا توجد ديون مسجلة</div>
          <p class="empty-desc">سجّل المبالغ المستحقة لك أو عليك لمتابعة الدفعات الجزئية.</p>
          <button class="btn btn-secondary btn-sm" data-action="open-modal" data-modal="debt">${icon('plus', 14)} إضافة دين</button>
        </div>
      ` : state.debts.map((d) => {
        const rem = Math.max(0, d.totalAmount - d.paidAmount);
        const pct = Math.min(100, Math.round((d.paidAmount / Math.max(1, d.totalAmount)) * 100));
        const isToMe = d.direction === 'owed_to_me';
        return `
          <div style="padding:12px 0;border-bottom:1px solid var(--border-subtle);">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
              <div>
                <span style="font-weight:700;font-size:14px;">${esc(d.person)}</span>
                <span class="badge ${isToMe ? 'badge-income' : 'badge-expense'}" style="margin-inline-start:6px;">${isToMe ? 'لك' : 'عليك'}</span>
              </div>
              <div style="display:flex;gap:6px;">
                ${rem > 0 ? `<button class="btn btn-secondary btn-sm" data-action="pay-debt" data-id="${d.id}">دفعة</button>` : `<span class="badge badge-income">مسدد</span>`}
                <button class="btn-icon" style="width:32px;height:32px;" data-action="delete-debt" data-id="${d.id}" aria-label="حذف">${icon('trash', 14)}</button>
              </div>
            </div>
            <div class="progress-track" style="margin-bottom:5px;"><div class="progress-fill" data-fill="${pct}"></div></div>
            <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-secondary);">
              <span class="num">المسدد: ${formatMoney(d.paidAmount, cur)}</span>
              <span class="num">المتبقي: ${formatMoney(rem, cur)}</span>
            </div>
          </div>
        `;
      }).join('')}
    </section>
  `;
}

// =========================================================================
// 6. ANALYTICS & REPORTS (Scroll-Triggered Animated Charts)
// =========================================================================
export function renderAnalyticsView(activeMonth) {
  const state = getState();
  const cur = state.profile.currency || 'SAR';
  const plan = generateFinancialPlan(activeMonth);
  const s = plan.summary;

  return `
    <header class="page-header" data-reveal="up">
      <div>
        <h1 class="page-title">التحليلات والتقارير</h1>
        <p class="page-subtitle">قراءة بصرية لتدفقاتك المالية</p>
      </div>
      ${monthSwitcherHtml(activeMonth, true)}
    </header>

    <section class="kpi-grid-2" data-reveal="scale">
      <div class="kpi-card">
        <span class="kpi-label">الصحة المالية</span>
        <div class="kpi-value num">${plan.score !== null ? `${plan.score} / 100` : '—'}</div>
        <div class="kpi-meta">${plan.score !== null ? (plan.score >= 75 ? 'وضع قوي ومستقر' : plan.score >= 50 ? 'جيد وقابل للتحسين' : 'يحتاج ضبط') : 'بعد أول معاملة'}</div>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">نسبة الادخار</span>
        <div class="kpi-value num">${plan.savingsRate !== null ? `${plan.savingsRate}%` : '—'}</div>
        <div class="kpi-meta">الهدف الموصى به 20%+</div>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">صافي الثروة</span>
        <div class="kpi-value num">${formatMoney(s.netWorth, cur)}</div>
        <div class="kpi-meta">الأرصدة + لك − عليك</div>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">الزكاة التقديرية (2.5%)</span>
        <div class="kpi-value num">${formatMoney(plan.zakatEstimate, cur)}</div>
        <div class="kpi-meta">عند حولان الحول</div>
      </div>
    </section>

    <section class="card" data-reveal="clip">
      <div class="card-header">
        <div>
          <h2 class="card-title">منحنى الصرف اليومي</h2>
          <p class="card-subtitle">${esc(formatMonthAr(activeMonth))}</p>
        </div>
      </div>
      ${renderDailySpendChart(s.byDay, activeMonth, cur)}
    </section>

    <section class="card" data-reveal="scale">
      <div class="card-header"><h2 class="card-title">توزيع مصاريف الشهر</h2></div>
      ${renderDonutChart(s.byCategory, cur)}
    </section>

    <section class="card" data-reveal="up">
      <div class="card-header"><h2 class="card-title">الدخل والمصاريف (آخر 6 أشهر)</h2></div>
      ${renderCashflowBarChart(state.transactions, cur)}
    </section>
  `;
}

// =========================================================================
// 7. FULL-ACCESS AGENTIC AI ADVISOR, RECEIPT SCANNER & UNLIMITED WHAT-IF
// =========================================================================
export function renderAdvisorView(simState) {
  const state = getState();
  const cur = state.profile.currency || 'SAR';
  const plan = generateFinancialPlan(currentMonthKey());
  const hasKey = Boolean((state.profile.geminiApiKey || '').trim());

  const quickPrompts = [
    'اليوم دفعت 5 ريال عشان كوفي',
    'حلل مصاريفي هذا الشهر',
    'اقترح لي خطة ادخار',
    'كم أقدر أصرف يومياً؟',
    'كم زكاتي التقديرية؟'
  ];

  const baseExpense = plan.summary.monthExpense > 0 ? plan.summary.monthExpense : plan.allocation.wants;
  const cutPct = Math.max(0, Math.min(100, Number(simState.cutPct) || 0));
  const monthlySaved = Math.round((baseExpense * cutPct) / 100) + Math.max(0, plan.allocation.savings);
  const yearlySaved = monthlySaved * 12;
  const threeYearSaved = monthlySaved * 36;

  const customAmt = Math.max(0, Number(simState.customSaveAmount) || 0);
  const customFreq = simState.customSaveFreq || 'daily';
  const multToMonth = customFreq === 'daily' ? 30 : customFreq === 'weekly' ? 4.333 : 1;
  const cMonth = Math.round(customAmt * multToMonth);
  const cYear = Math.round(cMonth * 12);
  const c3Yr = Math.round(cMonth * 36);
  const c5Yr = Math.round(cMonth * 60);

  return `
    <header class="page-header" data-reveal="up">
      <div>
        <h1 class="page-title">المستشار الذكي</h1>
        <p class="page-subtitle">تحكم كامل بالتطبيق + قراءة الفواتير + ماذا لو</p>
      </div>
      <span class="badge ${hasKey ? 'badge-income' : 'badge-accent'}">
        ${icon('sparkles', 13)} ${hasKey ? 'Gemini AI متصل' : 'المحرك المحلي نشط'}
      </span>
    </header>

    <!-- Quick Gemini API Connect / Test Card -->
    <section class="card stack-sm" data-reveal="scale">
      ${hasKey ? `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="row-icon income">${icon('check', 16)}</span>
            <div>
              <div style="font-size:13.5px;font-weight:700;">Gemini AI مفعّل بالكامل</div>
              <div style="font-size:11.5px;color:var(--text-muted);">ينفذ أوامرك ويقرأ صور الفواتير تلقائياً</div>
            </div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" data-action="test-gemini">اختبار</button>
        </div>
      ` : `
        <div class="card-header" style="margin-bottom:2px;">
          <div>
            <h2 class="card-title">${icon('sparkles', 16)} تفعيل Gemini AI على جوالك</h2>
            <p class="card-subtitle">يُحفظ المفتاح محلياً في جوالك مرة واحدة فقط لتفعيل قراءة الفواتير والأوامر الذكية</p>
          </div>
        </div>
        <form id="quick-gemini-form" style="display:flex;gap:8px;">
          <input id="quick-gemini-key" class="form-input" type="password" placeholder="الصق مفتاح AIza..." required autocomplete="off">
          <button type="submit" class="btn btn-primary btn-sm" style="min-height:44px;">تفعيل</button>
        </form>
      `}
    </section>

    <!-- Full-Access Agentic Chat + Receipt Vision Camera -->
    <section class="card" data-reveal="up">
      <div class="card-header">
        <div>
          <h2 class="card-title">${icon('receipt', 16)} محادثة وأوامر المستشار</h2>
          <p class="card-subtitle">اكتب أي أمر ("دفعت 5 ريال كوفي") أو ارفع صورة فاتورة</p>
        </div>
        ${state.aiChat.length > 0 ? `<button class="btn btn-ghost" data-action="clear-chat">مسح</button>` : ''}
      </div>

      <div class="chat-prompts">
        ${quickPrompts.map((p) => `<button type="button" class="prompt-chip" data-action="quick-prompt" data-prompt="${esc(p)}">${esc(p)}</button>`).join('')}
      </div>

      <div class="chat-box">
        <div id="ai-chat-messages" class="chat-messages">
          ${state.aiChat.length === 0 ? `
            <div class="chat-msg assistant">أهلاً يا ${esc(state.profile.name)}! عندي صلاحية كاملة أساعدك داخل ميزان:
• قل لي مثلاً: «اليوم دفعت 5 ريال عشان كوفي» وبأسجلها فوراً في مصاريفك.
• أو اضغط أيقونة الكاميرا تحت وارفع صورة فاتورة وبأقرأ المتجر والأصناف والخصم والإجمالي وأسجلها عنك تلقائياً.</div>
          ` : state.aiChat.map((m) => `
            <div class="chat-msg ${m.role === 'user' ? 'user' : 'assistant'}">${esc(m.text)}</div>
          `).join('')}
        </div>
        <form id="ai-chat-form" class="chat-input-row">
          <label class="btn-icon" style="width:44px;height:44px;flex-shrink:0;cursor:pointer;" title="تصوير أو رفع فاتورة" aria-label="رفع صورة فاتورة">
            ${icon('camera', 18)}
            <input type="file" id="ai-receipt-input" accept="image/*" class="hidden">
          </label>
          <input id="ai-chat-input" class="form-input" type="text" placeholder="اكتب أمرك أو سؤالك..." autocomplete="off">
          <button type="submit" class="btn btn-primary" aria-label="إرسال">${icon('send', 16)}</button>
        </form>
      </div>
    </section>

    <!-- Dedicated "لو ادخرت" Calculator -->
    <section class="card stack-sm" data-reveal="clip">
      <div class="card-header" style="margin-bottom:2px;">
        <div>
          <h2 class="card-title">${icon('target', 16)} حاسبة «لو ادخرت»</h2>
          <p class="card-subtitle">اكتب أي مبلغ تدخره وشوف كم يطلع لك شهرياً وسنوياً</p>
        </div>
      </div>

      <div class="quick-add-row">
        <input id="custom-save-amount" class="form-input num" type="number" inputmode="decimal" min="0" step="any" placeholder="مبلغ الادخار..." value="${customAmt > 0 ? esc(customAmt) : ''}">
        <select id="custom-save-freq" class="form-select">
          <option value="daily" ${customFreq === 'daily' ? 'selected' : ''}>يومياً</option>
          <option value="weekly" ${customFreq === 'weekly' ? 'selected' : ''}>أسبوعياً</option>
          <option value="monthly" ${customFreq === 'monthly' ? 'selected' : ''}>شهرياً</option>
        </select>
      </div>

      <div class="kpi-grid-2">
        <div style="padding:11px;border-radius:14px;background:var(--bg-surface-subtle);">
          <div style="font-size:11px;color:var(--text-muted);">في الشهر</div>
          <div class="num" style="font-size:16px;font-weight:700;margin-top:2px;" id="cs-month">${formatMoney(cMonth, cur)}</div>
        </div>
        <div style="padding:11px;border-radius:14px;background:var(--bg-surface-subtle);">
          <div style="font-size:11px;color:var(--text-muted);">في السنة (12 شهر)</div>
          <div class="num amount-income" style="font-size:16px;font-weight:700;margin-top:2px;" id="cs-year">${formatMoney(cYear, cur)}</div>
        </div>
        <div style="padding:11px;border-radius:14px;background:var(--bg-surface-subtle);">
          <div style="font-size:11px;color:var(--text-muted);">في 3 سنوات</div>
          <div class="num" style="font-size:16px;font-weight:700;margin-top:2px;" id="cs-3yr">${formatMoney(c3Yr, cur)}</div>
        </div>
        <div style="padding:11px;border-radius:14px;background:var(--accent-primary-soft);border:1px solid var(--accent-primary-border);">
          <div style="font-size:11px;color:var(--accent-primary);font-weight:600;">في 5 سنوات</div>
          <div class="num" style="font-size:16px;font-weight:700;color:var(--accent-primary);margin-top:2px;" id="cs-5yr">${formatMoney(c5Yr, cur)}</div>
        </div>
      </div>
    </section>

    <!-- Unlimited What-If Expense Cut Simulator (0% to 100%) -->
    <section class="card stack-sm" data-reveal="up">
      <div class="card-header" style="margin-bottom:2px;">
        <div>
          <h2 class="card-title">${icon('sliders', 16)} محاكي «ماذا لو خفضت مصاريفك؟»</h2>
          <p class="card-subtitle">اختر أي نسبة بدون حد (من 0% حتى 100%)</p>
        </div>
        <div style="display:flex;align-items:center;gap:4px;">
          <input id="sim-cut-input" class="form-input num" type="number" min="0" max="100" value="${cutPct}" style="width:66px;min-height:34px;padding:4px 8px;text-align:center;font-weight:700;">
          <span style="font-size:13px;font-weight:700;">%</span>
        </div>
      </div>
      ${baseExpense > 0 || plan.allocation.savings > 0 ? `
        <input id="sim-cut-range" class="sim-range" type="range" min="0" max="100" step="1" value="${cutPct}">
        <div class="kpi-grid-2" style="margin-top:4px;">
          <div style="padding:11px;border-radius:14px;background:var(--bg-surface-subtle);">
            <div style="font-size:11px;color:var(--text-muted);">الادخار الشهري</div>
            <div class="num" style="font-size:16px;font-weight:700;margin-top:2px;" id="sim-monthly">${formatMoney(monthlySaved, cur)}</div>
          </div>
          <div style="padding:11px;border-radius:14px;background:var(--bg-surface-subtle);">
            <div style="font-size:11px;color:var(--text-muted);">خلال سنة (12 شهر)</div>
            <div class="num amount-income" style="font-size:16px;font-weight:700;margin-top:2px;" id="sim-yearly">${formatMoney(yearlySaved, cur)}</div>
          </div>
        </div>
        <div style="padding:12px;border-radius:14px;background:var(--accent-primary-soft);border:1px solid var(--accent-primary-border);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12.5px;color:var(--accent-primary);font-weight:700;">المتوقع خلال 3 سنوات</span>
          <span class="num" style="font-size:18px;font-weight:700;color:var(--accent-primary);" id="sim-3yr">${formatMoney(threeYearSaved, cur)}</span>
        </div>
      ` : `
        <p style="font-size:12.5px;color:var(--text-secondary);">سجّل دخلك أو أول مصاريفك ليعمل المحاكي تلقائياً بأرقامك الحقيقية.</p>
      `}
    </section>

    <!-- Monthly Plan & Insights -->
    <section class="card stack-sm" data-reveal="up">
      <div class="card-header" style="margin-bottom:2px;">
        <div>
          <h2 class="card-title">${icon('sparkles', 16)} خطتك الشهرية المقترحة</h2>
          <p class="card-subtitle">${esc(plan.allocation.ruleName)}</p>
        </div>
      </div>

      ${plan.allocation.baseIncome > 0 ? `
        <div class="kpi-grid-2">
          <div style="padding:11px;border-radius:14px;background:var(--bg-surface-subtle);">
            <div style="font-size:11px;color:var(--text-muted);">الأساسيات</div>
            <div class="num" style="font-size:16px;font-weight:700;margin-top:2px;">${formatMoney(plan.allocation.needs, cur)}</div>
          </div>
          <div style="padding:11px;border-radius:14px;background:var(--bg-surface-subtle);">
            <div style="font-size:11px;color:var(--text-muted);">المصاريف المرنة</div>
            <div class="num" style="font-size:16px;font-weight:700;margin-top:2px;">${formatMoney(plan.allocation.wants, cur)}</div>
          </div>
        </div>
        <div style="padding:12px;border-radius:14px;background:var(--accent-primary-soft);border:1px solid var(--accent-primary-border);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12.5px;color:var(--accent-primary);font-weight:700;">المخصص للادخار والأهداف</span>
          <span class="num" style="font-size:17px;font-weight:700;color:var(--accent-primary);">${formatMoney(plan.allocation.savings, cur)}</span>
        </div>
      ` : `
        <div class="empty-state" style="padding:14px;">
          <p class="empty-desc">أضف دخلك الشهري في الإعدادات لتقسيم ميزانيتك تلقائياً.</p>
          <button class="btn btn-secondary btn-sm" data-nav="settings">ضبط الدخل</button>
        </div>
      `}

      <div class="stack-sm" style="margin-top:4px;">
        ${plan.insights.map((ins) => `
          <div style="padding:12px;border-radius:14px;border:1px solid var(--border-subtle);background:var(--bg-surface);">
            <div style="font-weight:700;font-size:13.5px;margin-bottom:3px;">${esc(ins.title)}</div>
            <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.55;">${esc(ins.body)}</div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

// =========================================================================
// 8. SETTINGS
// =========================================================================
export function renderSettingsView() {
  const state = getState();
  const p = state.profile;
  const customExp = state.customCategories?.expense || [];
  const customInc = state.customCategories?.income || [];

  return `
    <header class="page-header" data-reveal="up">
      <div>
        <h1 class="page-title">الإعدادات والبيانات</h1>
        <p class="page-subtitle">ملفك الشخصي، الذكاء الاصطناعي، والنسخ الاحتياطي</p>
      </div>
    </header>

    <section class="card" data-reveal="up">
      <div class="card-header"><h2 class="card-title">الملف الشخصي والاستبيان</h2></div>
      <form id="settings-profile-form" class="stack-sm">
        <div class="form-group">
          <label class="form-label" for="set-name">الاسم</label>
          <input id="set-name" class="form-input" type="text" required value="${esc(p.name)}">
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="set-currency">العملة</label>
            <select id="set-currency" class="form-select">
              ${Object.values(CURRENCIES).map((c) => `<option value="${c.code}" ${p.currency === c.code ? 'selected' : ''}>${esc(c.name)} (${esc(c.symbol)})</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="set-income">الدخل الشهري</label>
            <input id="set-income" class="form-input num" type="number" inputmode="decimal" min="0" step="any" value="${esc(p.monthlyIncome)}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="set-rule">قاعدة توزيع الميزانية</label>
          <select id="set-rule" class="form-select">
            <option value="50_30_20" ${p.budgetRule === '50_30_20' ? 'selected' : ''}>50 / 30 / 20 المتوازنة</option>
            <option value="60_20_20" ${p.budgetRule === '60_20_20' ? 'selected' : ''}>60 / 20 / 20 للاستقرار</option>
            <option value="70_20_10" ${p.budgetRule === '70_20_10' ? 'selected' : ''}>70 / 10 / 20 للالتزامات العالية</option>
            <option value="custom" ${p.budgetRule === 'custom' ? 'selected' : ''}>50 / 20 / 30 للادخار المكثف</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="set-apikey">مفتاح Gemini API (يُحفظ على جوالك فقط)</label>
          <div style="display:flex;gap:8px;">
            <input id="set-apikey" class="form-input" type="password" placeholder="AIza..." value="${esc(p.geminiApiKey || '')}">
            <button type="button" class="btn btn-secondary btn-sm" style="min-height:44px;" data-action="test-gemini">اختبار</button>
          </div>
          <span class="form-hint">يُحفظ محلياً في جوالك فقط ولا يُرسل لأي جهة غير Google Gemini عند محادثتك.</span>
        </div>
        <button type="submit" class="btn btn-primary" style="width:100%;">${icon('check', 16)} حفظ التعديلات</button>
      </form>
    </section>

    <section class="card stack-sm" data-reveal="up">
      <div class="card-header" style="margin-bottom:2px;"><h2 class="card-title">فئاتك المخصصة</h2></div>
      <form id="custom-cat-form" style="display:flex;gap:8px;">
        <select id="cc-type" class="form-select" style="width:95px;flex-shrink:0;">
          <option value="expense">مصروف</option>
          <option value="income">دخل</option>
        </select>
        <input id="cc-name" class="form-input" type="text" placeholder="اسم الفئة..." required>
        <button type="submit" class="btn btn-secondary btn-sm" style="min-height:44px;">${icon('plus', 15)}</button>
      </form>
      ${customExp.length === 0 && customInc.length === 0 ? `
        <p style="font-size:12px;color:var(--text-muted);">أضف فئات إضافية تناسب نمط حياتك وستظهر فوراً في المعاملات.</p>
      ` : `
        <div class="tag-list">
          ${customExp.map((c) => `<span class="tag-chip">${esc(c)} (مصروف) <button type="button" data-action="remove-cat" data-type="expense" data-name="${esc(c)}" aria-label="حذف">${icon('close', 12)}</button></span>`).join('')}
          ${customInc.map((c) => `<span class="tag-chip">${esc(c)} (دخل) <button type="button" data-action="remove-cat" data-type="income" data-name="${esc(c)}" aria-label="حذف">${icon('close', 12)}</button></span>`).join('')}
        </div>
      `}
    </section>

    <section class="card stack-sm" data-reveal="up">
      <div class="card-header" style="margin-bottom:2px;"><h2 class="card-title">المظهر والخصوصية والنسخ الاحتياطي</h2></div>
      <div class="kpi-grid-2">
        <button class="btn btn-secondary btn-sm" data-action="toggle-theme">${icon(p.theme === 'dark' ? 'sun' : 'moon', 15)} ${p.theme === 'dark' ? 'فاتح' : 'داكن'}</button>
        <button class="btn btn-secondary btn-sm" data-action="toggle-privacy">${icon(p.privacyMode ? 'eye' : 'eyeOff', 15)} ${p.privacyMode ? 'إظهار الأرقام' : 'إخفاء الأرقام'}</button>
        <button class="btn btn-secondary btn-sm" data-action="export-json">${icon('download', 15)} نسخة احتياطية</button>
        <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
          ${icon('upload', 15)} استعادة نسخة
          <input type="file" id="import-json-input" accept="application/json" class="hidden">
        </label>
      </div>
    </section>

    <section class="card stack-sm" data-reveal="up">
      <div class="card-header" style="margin-bottom:2px;"><h2 class="card-title">${icon('tablet', 16)} تثبيت ميزان على الجوال</h2></div>
      <p style="font-size:12.5px;color:var(--text-secondary);line-height:1.6;">في <strong>آيفون (Safari)</strong>: اضغط زر المشاركة بالأسفل ← اختر <strong>إضافة إلى الشاشة الرئيسية</strong>.<br>في <strong>أندرويد (Chrome)</strong>: اضغط القائمة ⋮ ← اختر <strong>تثبيت التطبيق</strong>.</p>
    </section>

    <section class="card stack-sm" data-reveal="up" style="border-color:rgba(180,35,24,0.28);">
      <div class="card-header" style="margin-bottom:2px;"><h2 class="card-title" style="color:var(--color-expense);">${icon('alert', 16)} تصفير البيانات</h2></div>
      <p style="font-size:12.5px;color:var(--text-secondary);">حذف جميع الحسابات والمعاملات وإعادة بدء الاستبيان من الصفر.</p>
      <button class="btn btn-danger btn-sm" style="align-self:flex-start;" data-action="reset-all">${icon('trash', 14)} مسح كل البيانات</button>
    </section>
  `;
}
