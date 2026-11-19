// Modular View Renderers — Strictly Real User Data, Zero Demo Placeholders

import { icon } from './icons.js';
import {
  esc, formatMoney, formatDateAr, formatMonthAr, currentMonthKey,
  ACCOUNT_TYPES, CURRENCIES, EXPENSE_CATEGORIES
} from './utils.js';
import { getState, getFinancialSummary } from './store.js';
import { generateFinancialPlan } from './ai-engine.js';
import { renderDonutChart, renderCashflowBarChart } from './charts.js';

function accountNameById(accounts, id) {
  return accounts.find((a) => a.id === id)?.name || 'بدون حساب مرتبط';
}

function txRowHtml(tx, accounts, cur, showDelete = false) {
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
        <div class="row-icon ${cls}">${icon(iconName, 17)}</div>
        <div style="min-width:0;">
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
        <span class="num amount-${cls}">${sign}${formatMoney(tx.amount, cur)}</span>
        ${showDelete ? `<button class="btn-icon" style="width:36px;height:36px;" data-action="delete-tx" data-id="${tx.id}" aria-label="حذف المعاملة">${icon('trash', 15)}</button>` : ''}
      </div>
    </div>
  `;
}

export function renderDashboardView() {
  const state = getState();
  const cur = state.profile.currency || 'SAR';
  const mKey = currentMonthKey();
  const plan = generateFinancialPlan();
  const s = plan.summary;

  const recentTxs = state.transactions.slice(0, 6);
  const topInsight = plan.insights[0];

  return `
    <header class="page-header">
      <div>
        <h1 class="page-title">مرحباً ${esc(state.profile.name)}</h1>
        <p class="page-subtitle">ملخص ${esc(formatMonthAr(mKey))} — كل أرقامك حقيقية ومحدثة لحظياً</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" data-action="open-modal" data-modal="account">${icon('wallet', 16)} حساب جديد</button>
        <button class="btn btn-primary" data-action="open-modal" data-modal="transaction">${icon('plus', 17)} معاملة جديدة</button>
      </div>
    </header>

    <section class="kpi-grid" aria-label="المؤشرات المالية الرئيسية">
      <div class="kpi-card featured">
        <div class="kpi-top">
          <span class="kpi-label">إجمالي الأرصدة الحالية</span>
          ${icon('wallet', 18)}
        </div>
        <div class="kpi-value">${formatMoney(s.totalBalance, cur)}</div>
        <div class="kpi-meta">${state.accounts.length === 0 ? 'أضف أول حساب لتتبع رصيدك' : `عبر ${state.accounts.length} حساب · صافي الثروة ${formatMoney(s.netWorth, cur)}`}</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">دخل هذا الشهر</span>
          <span class="badge badge-income">${icon('arrowDown', 13)} دخل</span>
        </div>
        <div class="kpi-value amount-income">${formatMoney(s.monthIncome, cur)}</div>
        <div class="kpi-meta">${state.profile.monthlyIncome > 0 ? `الدخل المخطط: ${formatMoney(state.profile.monthlyIncome, cur)}` : 'من المعاملات المسجلة'}</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">مصاريف هذا الشهر</span>
          <span class="badge badge-expense">${icon('arrowUp', 13)} صرف</span>
        </div>
        <div class="kpi-value amount-expense">${formatMoney(s.monthExpense, cur)}</div>
        <div class="kpi-meta">${s.monthTxCount} معاملة مسجلة هذا الشهر</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-top">
          <span class="kpi-label">سقف الصرف اليومي الآمن</span>
          <span class="badge badge-accent">${icon('sparkles', 13)} ذكي</span>
        </div>
        <div class="kpi-value">${plan.allocation.baseIncome > 0 ? formatMoney(plan.safeDailySpend, cur) : '—'}</div>
        <div class="kpi-meta">${plan.allocation.baseIncome > 0 ? `لباقي ${plan.daysLeft} يوم في الشهر` : 'حدد دخلك الشهري لتفعيله'}</div>
      </div>
    </section>

    ${topInsight ? `
      <section class="ai-banner" style="margin-bottom:20px;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div class="row-icon" style="background:var(--accent-primary);color:#fff;">${icon('sparkles', 18)}</div>
          <div>
            <div style="font-weight:700;font-size:15px;margin-bottom:2px;">${esc(topInsight.title)}</div>
            <div style="font-size:13px;color:var(--text-secondary);">${esc(topInsight.body)}</div>
          </div>
        </div>
        <button class="btn btn-secondary btn-sm" data-nav="advisor">افتح المستشار الذكي</button>
      </section>
    ` : ''}

    <div class="grid-main-side">
      <div class="stack-md">
        <section class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">آخر المعاملات</h2>
              <p class="card-subtitle">سجل حركاتك المالية الفعلية</p>
            </div>
            ${state.transactions.length > 0 ? `<button class="btn btn-ghost btn-sm" data-nav="transactions">عرض الكل</button>` : ''}
          </div>
          ${recentTxs.length === 0 ? `
            <div class="empty-state">
              <div class="empty-icon">${icon('arrows', 22)}</div>
              <div class="empty-title">لا توجد معاملات مسجلة بعد</div>
              <p class="empty-desc">سجّل أول مصروف أو دخل حقيقي لك ليبدأ التتبع والتحليل التلقائي.</p>
              <button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="transaction">${icon('plus', 15)} إضافة أول معاملة</button>
            </div>
          ` : recentTxs.map((t) => txRowHtml(t, state.accounts, cur, false)).join('')}
        </section>

        <section class="card">
          <div class="card-header">
            <h2 class="card-title">توزيع مصاريف الشهر</h2>
            <button class="btn btn-ghost btn-sm" data-nav="analytics">التقارير الكاملة</button>
          </div>
          ${renderDonutChart(s.byCategory, cur)}
        </section>
      </div>

      <div class="stack-md">
        <section class="card">
          <div class="card-header">
            <h2 class="card-title">حساباتك ومحافظك</h2>
            <button class="btn btn-ghost btn-sm" data-nav="accounts">إدارة</button>
          </div>
          ${state.accounts.length === 0 ? `
            <div class="empty-state" style="padding:20px 10px;">
              <p class="empty-desc">أضف حساباتك البنكية أو المحافظ الرقمية أو الكاش لمعرفة رصيدك الكلي.</p>
              <button class="btn btn-secondary btn-sm" data-action="open-modal" data-modal="account">${icon('plus', 15)} إضافة حساب</button>
            </div>
          ` : state.accounts.map((acc) => {
            const meta = ACCOUNT_TYPES[acc.type] || ACCOUNT_TYPES.bank;
            return `
              <div class="list-row">
                <div class="row-lead">
                  <div class="row-icon">${icon(meta.icon, 17)}</div>
                  <div>
                    <div class="row-title">${esc(acc.name)}</div>
                    <div class="row-meta">${esc(meta.label)}</div>
                  </div>
                </div>
                <div class="num" style="font-weight:700;">${formatMoney(acc.balance, cur)}</div>
              </div>
            `;
          }).join('')}
        </section>

        <section class="card">
          <div class="card-header">
            <h2 class="card-title">الميزانيات الشهرية</h2>
            <button class="btn btn-ghost btn-sm" data-nav="budgets">ضبط</button>
          </div>
          ${state.budgets.length === 0 ? `
            <div class="empty-state" style="padding:20px 10px;">
              <p class="empty-desc">ضع سقف صرف شهري لفئاتك المهمة لتصلك تنبيهات قبل تجاوز الحد.</p>
              <button class="btn btn-secondary btn-sm" data-action="open-modal" data-modal="budget">${icon('plus', 15)} إضافة ميزانية</button>
            </div>
          ` : state.budgets.slice(0, 4).map((b) => {
            const spent = s.byCategory[b.category] || 0;
            const pct = Math.min(100, Math.round((spent / Math.max(1, b.limit)) * 100));
            const status = spent > b.limit ? 'danger' : pct >= 80 ? 'warning' : '';
            return `
              <div style="margin-bottom:14px;">
                <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;">
                  <span style="font-weight:600;">${esc(b.category)}</span>
                  <span class="num">${formatMoney(spent, cur)} / ${formatMoney(b.limit, cur)}</span>
                </div>
                <div class="progress-track"><div class="progress-fill ${status}" style="width:${pct}%"></div></div>
              </div>
            `;
          }).join('')}
        </section>
      </div>
    </div>
  `;
}

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
    <header class="page-header">
      <div>
        <h1 class="page-title">المعاملات المالية</h1>
        <p class="page-subtitle">سجّل وابحث في كل عمليات الدخل والمصاريف والتحويلات</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" data-action="export-csv">${icon('download', 16)} تصدير CSV</button>
        <button class="btn btn-primary" data-action="open-modal" data-modal="transaction">${icon('plus', 17)} معاملة جديدة</button>
      </div>
    </header>

    <section class="card">
      <div class="filter-bar">
        <input type="search" class="form-input" id="flt-q" placeholder="بحث بالملاحظة أو الفئة..." value="${esc(filters.q)}">
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
        <input type="month" class="form-input" id="flt-month" value="${esc(filters.month)}">
      </div>

      ${list.length > 0 ? `
        <div style="display:flex;gap:16px;flex-wrap:wrap;padding:10px 14px;background:var(--bg-surface-subtle);border-radius:var(--radius-md);margin-bottom:14px;font-size:13px;">
          <span>النتائج: <strong class="num">${list.length}</strong></span>
          <span>الدخل: <strong class="num amount-income">+${formatMoney(sumIn, cur)}</strong></span>
          <span>المصاريف: <strong class="num amount-expense">-${formatMoney(sumOut, cur)}</strong></span>
          <span>الصافي: <strong class="num">${formatMoney(sumIn - sumOut, cur)}</strong></span>
        </div>
      ` : ''}

      ${list.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">${icon('arrows', 22)}</div>
          <div class="empty-title">${state.transactions.length === 0 ? 'السجل فارغ تماماً' : 'لا توجد معاملات مطابقة للبحث'}</div>
          <p class="empty-desc">${state.transactions.length === 0 ? 'ابدأ بإضافة معاملاتك الحقيقية وسيتم تحديث أرصدة حساباتك تلقائياً.' : 'جرّب تغيير الفلاتر أو مسح خانة البحث.'}</p>
          ${state.transactions.length === 0 ? `<button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="transaction">${icon('plus', 15)} إضافة معاملة</button>` : ''}
        </div>
      ` : list.map((t) => txRowHtml(t, state.accounts, cur, true)).join('')}
    </section>
  `;
}

export function renderAccountsView() {
  const state = getState();
  const cur = state.profile.currency || 'SAR';
  const total = state.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);

  return `
    <header class="page-header">
      <div>
        <h1 class="page-title">الحسابات والمحافظ</h1>
        <p class="page-subtitle">إجمالي السيولة المتاحة: <strong class="num">${formatMoney(total, cur)}</strong></p>
      </div>
      <div class="header-actions">
        ${state.accounts.length >= 2 ? `<button class="btn btn-secondary" data-action="open-modal" data-modal="transfer">${icon('repeat', 16)} تحويل بين حسابين</button>` : ''}
        <button class="btn btn-primary" data-action="open-modal" data-modal="account">${icon('plus', 17)} إضافة حساب</button>
      </div>
    </header>

    ${state.accounts.length === 0 ? `
      <section class="card">
        <div class="empty-state">
          <div class="empty-icon">${icon('wallet', 24)}</div>
          <div class="empty-title">ما أضفت أي حساب بعد</div>
          <p class="empty-desc">أضف حساباتك البنكية، الكاش، البطاقات الائتمانية، أو المحافظ الرقمية لربط معاملاتك بها.</p>
          <button class="btn btn-primary" data-action="open-modal" data-modal="account">${icon('plus', 17)} إضافة أول حساب</button>
        </div>
      </section>
    ` : `
      <div class="grid-3">
        ${state.accounts.map((acc) => {
          const meta = ACCOUNT_TYPES[acc.type] || ACCOUNT_TYPES.bank;
          return `
            <article class="card stack-sm">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div style="display:flex;gap:10px;align-items:center;">
                  <div class="row-icon">${icon(meta.icon, 19)}</div>
                  <div>
                    <div style="font-weight:700;font-size:15px;">${esc(acc.name)}</div>
                    <div style="font-size:12px;color:var(--text-muted);">${esc(meta.label)}</div>
                  </div>
                </div>
                <button class="btn-icon" style="width:34px;height:34px;" data-action="delete-account" data-id="${acc.id}" aria-label="حذف الحساب">${icon('trash', 15)}</button>
              </div>
              <div class="kpi-value" style="margin-top:8px;">${formatMoney(acc.balance, cur)}</div>
              ${acc.notes ? `<p style="font-size:12px;color:var(--text-secondary);">${esc(acc.notes)}</p>` : ''}
              <div style="display:flex;gap:8px;margin-top:6px;">
                <button class="btn btn-secondary btn-sm" style="flex:1;" data-action="adjust-balance" data-id="${acc.id}">تعديل الرصيد</button>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `}
  `;
}

export function renderBudgetsView() {
  const state = getState();
  const cur = state.profile.currency || 'SAR';
  const mKey = currentMonthKey();
  const s = getFinancialSummary(mKey);

  return `
    <header class="page-header">
      <div>
        <h1 class="page-title">الميزانيات والالتزامات المتكررة</h1>
        <p class="page-subtitle">تحكّم بحدود الصرف الشهري وتابع فواتيرك واشتراكاتك</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" data-action="open-modal" data-modal="recurring">${icon('calendar', 16)} التزام متكرر</button>
        <button class="btn btn-primary" data-action="open-modal" data-modal="budget">${icon('plus', 17)} ميزانية فئة</button>
      </div>
    </header>

    <div class="grid-2">
      <section class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">حدود الميزانيات (${esc(formatMonthAr(mKey))})</h2>
            <p class="card-subtitle">تتحدث تلقائياً مع كل مصروف تسجله</p>
          </div>
        </div>
        ${state.budgets.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">${icon('pie', 22)}</div>
            <div class="empty-title">لا توجد ميزانيات محددة</div>
            <p class="empty-desc">حدد سقفاً شهرياً لأهم فئات صرفك مثل الطعام أو المقاضي أو التسوق.</p>
            <button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="budget">${icon('plus', 15)} إضافة ميزانية</button>
          </div>
        ` : state.budgets.map((b) => {
          const spent = s.byCategory[b.category] || 0;
          const remaining = b.limit - spent;
          const pct = Math.min(100, Math.round((spent / Math.max(1, b.limit)) * 100));
          const status = spent > b.limit ? 'danger' : pct >= 80 ? 'warning' : '';
          return `
            <div style="padding:12px 0;border-bottom:1px solid var(--border-subtle);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <div>
                  <span style="font-weight:700;font-size:14px;">${esc(b.category)}</span>
                  <span class="badge ${status === 'danger' ? 'badge-expense' : status === 'warning' ? 'badge-warning' : 'badge-neutral'}" style="margin-inline-start:8px;">${pct}%</span>
                </div>
                <button class="btn-icon" style="width:32px;height:32px;" data-action="delete-budget" data-id="${b.id}" aria-label="حذف الميزانية">${icon('trash', 14)}</button>
              </div>
              <div class="progress-track" style="margin-bottom:6px;"><div class="progress-fill ${status}" style="width:${pct}%"></div></div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);">
                <span class="num">المصروف: ${formatMoney(spent, cur)}</span>
                <span class="num">${remaining >= 0 ? `المتبقي: ${formatMoney(remaining, cur)}` : `تجاوزت الحد بـ ${formatMoney(Math.abs(remaining), cur)}`}</span>
              </div>
            </div>
          `;
        }).join('')}
      </section>

      <section class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">الفواتير والاشتراكات المتكررة</h2>
            <p class="card-subtitle">إجمالي الالتزامات الشهرية: <strong class="num">${formatMoney(s.monthlyRecurringTotal, cur)}</strong></p>
          </div>
        </div>
        ${state.recurring.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">${icon('calendar', 22)}</div>
            <div class="empty-title">لا توجد التزامات متكررة</div>
            <p class="empty-desc">أضف الإيجار، فواتير الجوال والإنترنت، أو اشتراكاتك الشهرية لتسجيل سدادها بضغطة زر.</p>
            <button class="btn btn-secondary btn-sm" data-action="open-modal" data-modal="recurring">${icon('plus', 15)} إضافة التزام</button>
          </div>
        ` : state.recurring.map((r) => {
          const paidThisMonth = r.lastPaidMonth === mKey;
          return `
            <div class="list-row">
              <div class="row-lead">
                <div class="row-icon ${paidThisMonth ? 'income' : ''}">${icon(paidThisMonth ? 'check' : 'calendar', 17)}</div>
                <div>
                  <div class="row-title">${esc(r.title)}</div>
                  <div class="row-meta">يوم ${r.dueDay} من كل شهر · ${esc(r.category)}</div>
                </div>
              </div>
              <div class="row-end">
                <span class="num" style="font-weight:700;">${formatMoney(r.amount, cur)}</span>
                ${paidThisMonth
                  ? `<span class="badge badge-income">مدفوع</span>`
                  : `<button class="btn btn-primary btn-sm" data-action="pay-recurring" data-id="${r.id}">سداد الآن</button>`}
                <button class="btn-icon" style="width:34px;height:34px;" data-action="delete-recurring" data-id="${r.id}" aria-label="حذف الالتزام">${icon('trash', 14)}</button>
              </div>
            </div>
          `;
        }).join('')}
      </section>
    </div>
  `;
}

export function renderGoalsView() {
  const state = getState();
  const cur = state.profile.currency || 'SAR';
  const s = getFinancialSummary();

  return `
    <header class="page-header">
      <div>
        <h1 class="page-title">الأهداف الادخارية والديون</h1>
        <p class="page-subtitle">خطط لأهدافك المالية وتابع كل مبلغ لك أو عليك بدقة</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" data-action="open-modal" data-modal="debt">${icon('handshake', 16)} تسجيل دين</button>
        <button class="btn btn-primary" data-action="open-modal" data-modal="goal">${icon('target', 16)} هدف ادخاري جديد</button>
      </div>
    </header>

    <div class="grid-2">
      <section class="card">
        <div class="card-header">
          <h2 class="card-title">الأهداف الادخارية</h2>
        </div>
        ${state.goals.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">${icon('target', 22)}</div>
            <div class="empty-title">لا توجد أهداف مسجلة</div>
            <p class="empty-desc">أنشئ هدفاً لصندوق الطوارئ، السفر، سيارة، أو مشروعك القادم وتابع تقدمك خطوة بخطوة.</p>
            <button class="btn btn-primary btn-sm" data-action="open-modal" data-modal="goal">${icon('plus', 15)} إنشاء هدف</button>
          </div>
        ` : state.goals.map((g) => {
          const pct = Math.min(100, Math.round((g.currentAmount / Math.max(1, g.targetAmount)) * 100));
          const rem = Math.max(0, g.targetAmount - g.currentAmount);
          return `
            <div style="padding:14px 0;border-bottom:1px solid var(--border-subtle);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <div>
                  <div style="font-weight:700;">${esc(g.title)}</div>
                  <div style="font-size:12px;color:var(--text-muted);">${g.targetDate ? `التاريخ المستهدف: ${esc(formatDateAr(g.targetDate))}` : 'هدف مفتوح المدة'}</div>
                </div>
                <div style="display:flex;gap:6px;">
                  <button class="btn btn-secondary btn-sm" data-action="contribute-goal" data-id="${g.id}">+ إضافة مبلغ</button>
                  <button class="btn-icon" style="width:34px;height:34px;" data-action="delete-goal" data-id="${g.id}" aria-label="حذف الهدف">${icon('trash', 14)}</button>
                </div>
              </div>
              <div class="progress-track" style="margin-bottom:6px;"><div class="progress-fill" style="width:${pct}%"></div></div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);">
                <span class="num">${formatMoney(g.currentAmount, cur)} / ${formatMoney(g.targetAmount, cur)} (${pct}%)</span>
                <span class="num">${rem === 0 ? 'مكتمل' : `متبقي ${formatMoney(rem, cur)}`}</span>
              </div>
            </div>
          `;
        }).join('')}
      </section>

      <section class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">الديون والالتزامات (لك / عليك)</h2>
            <p class="card-subtitle">عليك: <strong class="num amount-expense">${formatMoney(s.owedByMe, cur)}</strong> · لك: <strong class="num amount-income">${formatMoney(s.owedToMe, cur)}</strong></p>
          </div>
        </div>
        ${state.debts.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">${icon('handshake', 22)}</div>
            <div class="empty-title">لا توجد ديون مسجلة</div>
            <p class="empty-desc">سجّل أي مبالغ مستحقة لك عند الآخرين أو التزامات عليك لمتابعة الدفعات الجزئية.</p>
            <button class="btn btn-secondary btn-sm" data-action="open-modal" data-modal="debt">${icon('plus', 15)} إضافة سجل دين</button>
          </div>
        ` : state.debts.map((d) => {
          const rem = Math.max(0, d.totalAmount - d.paidAmount);
          const pct = Math.min(100, Math.round((d.paidAmount / Math.max(1, d.totalAmount)) * 100));
          const isToMe = d.direction === 'owed_to_me';
          return `
            <div style="padding:14px 0;border-bottom:1px solid var(--border-subtle);">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <div>
                  <span style="font-weight:700;">${esc(d.person)}</span>
                  <span class="badge ${isToMe ? 'badge-income' : 'badge-expense'}" style="margin-inline-start:8px;">${isToMe ? 'لك عنده' : 'عليك له'}</span>
                </div>
                <div style="display:flex;gap:6px;">
                  ${rem > 0 ? `<button class="btn btn-secondary btn-sm" data-action="pay-debt" data-id="${d.id}">تسجيل دفعة</button>` : `<span class="badge badge-income">مسدد</span>`}
                  <button class="btn-icon" style="width:34px;height:34px;" data-action="delete-debt" data-id="${d.id}" aria-label="حذف السجل">${icon('trash', 14)}</button>
                </div>
              </div>
              <div class="progress-track" style="margin-bottom:6px;"><div class="progress-fill" style="width:${pct}%"></div></div>
              <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-secondary);">
                <span class="num">المسدد: ${formatMoney(d.paidAmount, cur)} من ${formatMoney(d.totalAmount, cur)}</span>
                <span class="num">المتبقي: ${formatMoney(rem, cur)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </section>
    </div>
  `;
}

export function renderAnalyticsView() {
  const state = getState();
  const cur = state.profile.currency || 'SAR';
  const plan = generateFinancialPlan();
  const s = plan.summary;

  return `
    <header class="page-header">
      <div>
        <h1 class="page-title">التحليلات والتقارير</h1>
        <p class="page-subtitle">قراءة بصرية دقيقة لتدفقاتك المالية الحقيقية</p>
      </div>
    </header>

    <section class="kpi-grid">
      <div class="kpi-card">
        <span class="kpi-label">مؤشر الصحة المالية</span>
        <div class="kpi-value">${plan.score !== null ? `${plan.score} / 100` : '—'}</div>
        <div class="kpi-meta">${plan.score !== null ? (plan.score >= 75 ? 'وضع مالي قوي ومستقر' : plan.score >= 50 ? 'وضع جيد قابل للتحسين' : 'يحتاج إعادة ضبط للمصاريف') : 'يُحسب بعد تسجيل بياناتك'}</div>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">نسبة الادخار هذا الشهر</span>
        <div class="kpi-value">${plan.savingsRate !== null ? `${plan.savingsRate}%` : '—'}</div>
        <div class="kpi-meta">الهدف الموصى به 20% فأكثر</div>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">صافي الثروة</span>
        <div class="kpi-value">${formatMoney(s.netWorth, cur)}</div>
        <div class="kpi-meta">الأرصدة + ما لك − ما عليك</div>
      </div>
      <div class="kpi-card">
        <span class="kpi-label">حاسبة الزكاة التقديرية (2.5%)</span>
        <div class="kpi-value">${formatMoney(plan.zakatEstimate, cur)}</div>
        <div class="kpi-meta">على إجمالي الأرصدة عند حولان الحول</div>
      </div>
    </section>

    <div class="grid-2">
      <section class="card">
        <div class="card-header"><h2 class="card-title">توزيع مصاريف الشهر حسب الفئة</h2></div>
        ${renderDonutChart(s.byCategory, cur)}
      </section>
      <section class="card">
        <div class="card-header"><h2 class="card-title">مقارنة الدخل والمصاريف (آخر 6 أشهر)</h2></div>
        ${renderCashflowBarChart(state.transactions, cur)}
      </section>
    </div>
  `;
}

export function renderAdvisorView() {
  const state = getState();
  const cur = state.profile.currency || 'SAR';
  const plan = generateFinancialPlan();
  const hasKey = Boolean((state.profile.geminiApiKey || '').trim());

  const quickPrompts = [
    'حلل مصاريفي هذا الشهر',
    'اقترح لي خطة ادخار مناسبة',
    'كم أقدر أصرف يومياً؟',
    'رتب لي سداد ديوني',
    'كم زكاتي التقديرية؟'
  ];

  return `
    <header class="page-header">
      <div>
        <h1 class="page-title">المستشار المالي الذكي</h1>
        <p class="page-subtitle">تحليل وتخطيط مبني بالكامل على استبيانك وأرقامك الحقيقية</p>
      </div>
      <div class="header-actions">
        <span class="badge ${hasKey ? 'badge-income' : 'badge-accent'}">${icon('sparkles', 13)} ${hasKey ? 'متصل بـ Gemini AI' : 'المحرك الذكي المحلي نشط'}</span>
        ${state.aiChat.length > 0 ? `<button class="btn btn-secondary btn-sm" data-action="clear-chat">مسح المحادثة</button>` : ''}
      </div>
    </header>

    <div class="grid-main-side">
      <section class="card stack-md">
        <div class="card-header" style="margin-bottom:4px;">
          <div>
            <h2 class="card-title">${icon('sparkles', 18)} خطتك الشهرية المقترحة</h2>
            <p class="card-subtitle">${esc(plan.allocation.ruleName)}</p>
          </div>
          ${plan.score !== null ? `<span class="badge badge-accent">الصحة المالية: ${plan.score}/100</span>` : ''}
        </div>

        ${plan.allocation.baseIncome > 0 ? `
          <div class="grid-3">
            <div style="padding:14px;border-radius:var(--radius-md);background:var(--bg-surface-subtle);">
              <div style="font-size:12px;color:var(--text-muted);">الأساسيات والالتزامات</div>
              <div class="num" style="font-size:19px;font-weight:700;margin-top:4px;">${formatMoney(plan.allocation.needs, cur)}</div>
            </div>
            <div style="padding:14px;border-radius:var(--radius-md);background:var(--bg-surface-subtle);">
              <div style="font-size:12px;color:var(--text-muted);">المصاريف المرنة</div>
              <div class="num" style="font-size:19px;font-weight:700;margin-top:4px;">${formatMoney(plan.allocation.wants, cur)}</div>
            </div>
            <div style="padding:14px;border-radius:var(--radius-md);background:var(--accent-primary-soft);border:1px solid var(--accent-primary-border);">
              <div style="font-size:12px;color:var(--accent-primary);font-weight:600;">الادخار والأهداف</div>
              <div class="num" style="font-size:19px;font-weight:700;color:var(--accent-primary);margin-top:4px;">${formatMoney(plan.allocation.savings, cur)}</div>
            </div>
          </div>
        ` : `
          <div class="empty-state" style="padding:18px;">
            <p class="empty-desc">أضف دخلك الشهري في الإعدادات أو سجّل أول دخل لك ليتم تقسيم ميزانيتك تلقائياً.</p>
            <button class="btn btn-secondary btn-sm" data-nav="settings">ضبط الدخل في الإعدادات</button>
          </div>
        `}

        <div class="stack-sm">
          <div style="font-size:13px;font-weight:700;color:var(--text-secondary);">توصيات وتنبيهات مخصصة لك</div>
          ${plan.insights.map((ins) => `
            <div style="padding:14px;border-radius:var(--radius-md);border:1px solid var(--border-subtle);background:var(--bg-surface);">
              <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${esc(ins.title)}</div>
              <div style="font-size:13px;color:var(--text-secondary);">${esc(ins.body)}</div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">محادثة المستشار</h2>
            <p class="card-subtitle">${hasKey ? 'مدعوم بـ Gemini API مع قراءة أرقامك الحقيقية' : 'يحلل أرقامك محلياً · يمكنك ربط Gemini API من الإعدادات'}</p>
          </div>
        </div>

        <div class="chat-prompts">
          ${quickPrompts.map((p) => `<button type="button" class="prompt-chip" data-action="quick-prompt" data-prompt="${esc(p)}">${esc(p)}</button>`).join('')}
        </div>

        <div class="chat-box">
          <div id="ai-chat-messages" class="chat-messages">
            ${state.aiChat.length === 0 ? `
              <div class="chat-msg assistant">حياك الله يا ${esc(state.profile.name)}. أنا جاهز أحلل مصاريفك الحقيقية وأرتب لك خطط الادخار وسداد الديون. اختر سؤال سريع فوق أو اكتب اللي في بالك تحت.</div>
            ` : state.aiChat.map((m) => `
              <div class="chat-msg ${m.role === 'user' ? 'user' : 'assistant'}">${esc(m.text)}</div>
            `).join('')}
          </div>
          <form id="ai-chat-form" class="chat-input-row">
            <input id="ai-chat-input" class="form-input" type="text" placeholder="اسأل المستشار عن ميزانيتك أو خطتك..." autocomplete="off">
            <button type="submit" class="btn btn-primary" aria-label="إرسال">${icon('send', 16)}</button>
          </form>
        </div>
      </section>
    </div>
  `;
}

export function renderSettingsView() {
  const state = getState();
  const p = state.profile;

  return `
    <header class="page-header">
      <div>
        <h1 class="page-title">الإعدادات والبيانات</h1>
        <p class="page-subtitle">تحكّم بملفك الشخصي، الذكاء الاصطناعي، والنسخ الاحتياطي</p>
      </div>
    </header>

    <div class="grid-2">
      <section class="card">
        <div class="card-header"><h2 class="card-title">الملف الشخصي والاستبيان</h2></div>
        <form id="settings-profile-form" class="stack-md">
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
              <label class="form-label" for="set-income">الدخل الشهري المتوقع</label>
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
            <label class="form-label" for="set-apikey">مفتاح Gemini API (اختياري للمحادثة الحية)</label>
            <input id="set-apikey" class="form-input" type="password" placeholder="AIza..." value="${esc(p.geminiApiKey || '')}">
            <span class="form-hint">يُحفظ محلياً على جهازك فقط ولا يُرسل لأي طرف ثالث غير Google Gemini عند محادثتك.</span>
          </div>
          <button type="submit" class="btn btn-primary">${icon('check', 16)} حفظ التعديلات</button>
        </form>
      </section>

      <div class="stack-md">
        <section class="card stack-sm">
          <div class="card-header" style="margin-bottom:4px;"><h2 class="card-title">${icon('tablet', 18)} تثبيت ميزان على الآيباد</h2></div>
          <p style="font-size:13px;color:var(--text-secondary);">افتح الموقع من متصفح <strong>Safari</strong> على الآيباد ← اضغط زر <strong>المشاركة</strong> في الأعلى ← اختر <strong>إضافة إلى الصفحة الرئيسية (Add to Home Screen)</strong>. سيفتح معك كتطبيق مستقل بملء الشاشة ويعمل حتى بدون إنترنت.</p>
        </section>

        <section class="card stack-sm">
          <div class="card-header" style="margin-bottom:4px;"><h2 class="card-title">المظهر والنسخ الاحتياطي</h2></div>
          <div style="display:flex;flex-wrap:wrap;gap:10px;">
            <button class="btn btn-secondary" data-action="toggle-theme">${icon(p.theme === 'dark' ? 'sun' : 'moon', 16)} ${p.theme === 'dark' ? 'التبديل للوضع الفاتح' : 'التبديل للوضع الداكن'}</button>
            <button class="btn btn-secondary" data-action="export-json">${icon('download', 16)} حفظ نسخة احتياطية</button>
            <label class="btn btn-secondary" style="cursor:pointer;">
              ${icon('upload', 16)} استعادة نسخة
              <input type="file" id="import-json-input" accept="application/json" class="hidden">
            </label>
          </div>
        </section>

        <section class="card stack-sm" style="border-color:rgba(180,35,24,0.28);">
          <div class="card-header" style="margin-bottom:4px;"><h2 class="card-title" style="color:var(--color-expense);">${icon('alert', 18)} تصفير البيانات</h2></div>
          <p style="font-size:13px;color:var(--text-secondary);">حذف جميع الحسابات والمعاملات وإعادة بدء الاستبيان التعريفي من الصفر.</p>
          <div>
            <button class="btn btn-danger btn-sm" data-action="reset-all">${icon('trash', 15)} مسح كل البيانات</button>
          </div>
        </section>
      </div>
    </div>
  `;
}

export { EXPENSE_CATEGORIES };
