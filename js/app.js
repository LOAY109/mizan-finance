// Mizan Finance v2.0 — Main Application Controller, Native-Style Modals & Router

import { icon } from './icons.js';
import {
  esc, todayISO, currentMonthKey, showToast, downloadFile, formatMoney,
  ACCOUNT_TYPES
} from './utils.js';
import {
  getState, subscribe, updateProfile, shiftMonthKey,
  getAllCategories, addCustomCategory, removeCustomCategory,
  addAccount, updateAccountBalance, deleteAccount,
  addTransaction, updateTransaction, deleteTransaction,
  upsertBudget, deleteBudget,
  addRecurring, payRecurringNow, deleteRecurring,
  addGoal, contributeGoal, deleteGoal,
  addDebt, recordDebtPayment, deleteDebt,
  appendChatMessage, clearChatHistory,
  exportBackupJSON, importBackupJSON, resetAllData
} from './store.js';
import { renderOnboarding } from './onboarding.js';
import {
  renderDashboardView,
  renderTransactionsView,
  renderAccountsView,
  renderBudgetsView,
  renderGoalsView,
  renderAnalyticsView,
  renderAdvisorView,
  renderSettingsView
} from './views.js';
import { askAdvisor, applySmartAutoBudgets, generateFinancialPlan } from './ai-engine.js';

let currentRoute = 'dashboard';
let activeMonth = currentMonthKey();
const txFilters = { q: '', type: '', accountId: '', month: '' };
const simState = { cutPct: 10 };

const NAV_ITEMS = [
  { id: 'dashboard', label: 'الرئيسية', icon: 'home', mobile: true },
  { id: 'transactions', label: 'المعاملات', icon: 'arrows', mobile: true },
  { id: 'accounts', label: 'الحسابات', icon: 'wallet', mobile: true },
  { id: 'budgets', label: 'الميزانيات', icon: 'pie', mobile: false },
  { id: 'goals', label: 'الأهداف والديون', icon: 'target', mobile: false },
  { id: 'analytics', label: 'التحليلات', icon: 'chart', mobile: true },
  { id: 'advisor', label: 'المستشار الذكي', icon: 'sparkles', mobile: true },
  { id: 'settings', label: 'الإعدادات', icon: 'settings', mobile: false }
];

function applyVisualModes(profile) {
  document.documentElement.setAttribute('data-theme', profile.theme === 'dark' ? 'dark' : 'light');
  document.body.classList.toggle('privacy-blur', Boolean(profile.privacyMode));
  const meta = document.getElementById('meta-theme-color');
  if (meta) meta.setAttribute('content', profile.theme === 'dark' ? '#0E1114' : '#F6F5F1');
}

function renderApp() {
  const state = getState();
  applyVisualModes(state.profile);

  if (!state.profile.onboarded) {
    renderOnboarding(() => {
      currentRoute = 'dashboard';
      activeMonth = currentMonthKey();
      renderApp();
    });
    return;
  }

  let viewHtml = '';
  switch (currentRoute) {
    case 'transactions': viewHtml = renderTransactionsView(txFilters); break;
    case 'accounts':     viewHtml = renderAccountsView(); break;
    case 'budgets':      viewHtml = renderBudgetsView(); break;
    case 'goals':        viewHtml = renderGoalsView(); break;
    case 'analytics':    viewHtml = renderAnalyticsView(activeMonth); break;
    case 'advisor':      viewHtml = renderAdvisorView(simState); break;
    case 'settings':     viewHtml = renderSettingsView(); break;
    default:             viewHtml = renderDashboardView(activeMonth);
  }

  const initial = (state.profile.name || 'م').trim().charAt(0);
  const priv = Boolean(state.profile.privacyMode);

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="mobile-topbar">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="brand-mark" style="width:32px;height:32px;">${icon('scale', 17)}</div>
        <span style="font-weight:700;font-size:16px;">ميزان</span>
      </div>
      <div style="display:flex;gap:6px;">
        <button class="btn-icon ${priv ? 'active' : ''}" style="width:38px;height:38px;" data-action="toggle-privacy" aria-label="وضع الخصوصية">${icon(priv ? 'eyeOff' : 'eye', 17)}</button>
        <button class="btn-icon" style="width:38px;height:38px;" data-nav="budgets" aria-label="الميزانيات">${icon('pie', 17)}</button>
        <button class="btn-icon" style="width:38px;height:38px;" data-nav="goals" aria-label="الأهداف والديون">${icon('target', 17)}</button>
        <button class="btn-icon" style="width:38px;height:38px;" data-nav="settings" aria-label="الإعدادات">${icon('settings', 17)}</button>
      </div>
    </div>

    <div class="app-shell">
      <aside class="sidebar" aria-label="القائمة الرئيسية">
        <div class="brand-header">
          <div class="brand-left">
            <div class="brand-mark">${icon('scale', 20)}</div>
            <div>
              <div class="brand-title">ميزان</div>
              <div class="brand-subtitle">إدارة مالية ذكية</div>
            </div>
          </div>
          <button class="btn-icon ${priv ? 'active' : ''}" style="width:36px;height:36px;" data-action="toggle-privacy" title="${priv ? 'إظهار الأرقام' : 'إخفاء الأرقام'}" aria-label="وضع الخصوصية">
            ${icon(priv ? 'eyeOff' : 'eye', 16)}
          </button>
        </div>

        <ul class="nav-list">
          ${NAV_ITEMS.map((item) => `
            <li>
              <button class="nav-item ${currentRoute === item.id ? 'active' : ''}" data-nav="${item.id}">
                ${icon(item.icon, 18)}
                <span>${item.label}</span>
              </button>
            </li>
          `).join('')}
        </ul>

        <div class="sidebar-footer">
          <div class="user-pill">
            <div class="user-avatar">${esc(initial)}</div>
            <div style="min-width:0;flex:1;">
              <div class="user-pill-name">${esc(state.profile.name)}</div>
              <div class="user-pill-meta">حفظ محلي آمن</div>
            </div>
            <button class="btn-icon" style="width:34px;height:34px;" data-action="toggle-theme" aria-label="تبديل المظهر">
              ${icon(state.profile.theme === 'dark' ? 'sun' : 'moon', 15)}
            </button>
          </div>
        </div>
      </aside>

      <main class="main-content">${viewHtml}</main>
    </div>

    <button class="fab-add" data-action="open-modal" data-modal="transaction" aria-label="إضافة معاملة سريعة">${icon('plus', 24)}</button>

    <nav class="bottom-nav" aria-label="التنقل السريع">
      ${NAV_ITEMS.filter((i) => i.mobile).map((item) => `
        <button class="bottom-nav-btn ${currentRoute === item.id ? 'active' : ''}" data-nav="${item.id}">
          ${icon(item.icon, 20)}
          <span>${item.label}</span>
        </button>
      `).join('')}
    </nav>
  `;

  bindViewSpecificHandlers();
}

function bindViewSpecificHandlers() {
  if (currentRoute === 'dashboard') {
    const qaForm = document.getElementById('quick-add-form');
    if (qaForm) {
      qaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const amount = Number(document.getElementById('qa-amount').value);
        if (amount <= 0) return;
        const category = document.getElementById('qa-cat').value;
        const accountId = document.getElementById('qa-acc')?.value || '';
        const note = document.getElementById('qa-note').value;
        addTransaction({ type: 'expense', amount, category, accountId, date: todayISO(), note });
        showToast('تم تسجيل المصروف السريع');
      });
    }
  }

  if (currentRoute === 'transactions') {
    const bind = (id, key) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener(id === 'flt-q' ? 'input' : 'change', (e) => {
        txFilters[key] = e.target.value;
        renderApp();
        if (id === 'flt-q') {
          const next = document.getElementById('flt-q');
          if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
        }
      });
    };
    bind('flt-q', 'q');
    bind('flt-type', 'type');
    bind('flt-account', 'accountId');
    bind('flt-month', 'month');
  }

  if (currentRoute === 'advisor') {
    const box = document.getElementById('ai-chat-messages');
    if (box) box.scrollTop = box.scrollHeight;

    const form = document.getElementById('ai-chat-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('ai-chat-input');
        const q = (input?.value || '').trim();
        if (!q) return;
        input.value = '';
        await handleAdvisorQuestion(q);
      });
    }

    const slider = document.getElementById('sim-cut-range');
    if (slider) {
      slider.addEventListener('input', (e) => {
        simState.cutPct = Number(e.target.value) || 0;
        const state = getState();
        const cur = state.profile.currency || 'SAR';
        const plan = generateFinancialPlan(currentMonthKey());
        const baseExp = plan.summary.monthExpense > 0 ? plan.summary.monthExpense : plan.allocation.wants;
        const monthly = Math.round((baseExp * simState.cutPct) / 100) + Math.max(0, plan.allocation.savings);
        document.getElementById('sim-pct-label').textContent = `${simState.cutPct}%`;
        document.getElementById('sim-monthly').textContent = formatMoney(monthly, cur);
        document.getElementById('sim-yearly').textContent = formatMoney(monthly * 12, cur);
        document.getElementById('sim-3yr').textContent = formatMoney(monthly * 36, cur);
      });
    }
  }

  if (currentRoute === 'settings') {
    const form = document.getElementById('settings-profile-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        updateProfile({
          name: document.getElementById('set-name').value.trim() || 'مستخدم ميزان',
          currency: document.getElementById('set-currency').value,
          monthlyIncome: Number(document.getElementById('set-income').value) || 0,
          budgetRule: document.getElementById('set-rule').value,
          geminiApiKey: document.getElementById('set-apikey').value.trim()
        });
        showToast('تم حفظ الإعدادات بنجاح');
      });
    }

    const catForm = document.getElementById('custom-cat-form');
    if (catForm) {
      catForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('cc-type').value;
        const name = document.getElementById('cc-name').value.trim();
        if (addCustomCategory(type, name)) {
          showToast(`تمت إضافة فئة "${name}"`);
        } else {
          showToast('هذه الفئة موجودة مسبقاً');
        }
      });
    }

    const importInput = document.getElementById('import-json-input');
    if (importInput) {
      importInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            importBackupJSON(String(reader.result));
            showToast('تمت استعادة النسخة الاحتياطية بنجاح');
          } catch (err) {
            showToast(err.message || 'فشل قراءة الملف');
          }
        };
        reader.readAsText(file);
      });
    }
  }
}

async function handleAdvisorQuestion(q) {
  appendChatMessage('user', q);
  const reply = await askAdvisor(q);
  appendChatMessage('assistant', reply);
}

function openModal(html) {
  const root = document.getElementById('modal-root');
  const container = document.getElementById('modal-container');
  container.innerHTML = html;
  root.classList.remove('hidden');
  root.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const root = document.getElementById('modal-root');
  root.classList.add('hidden');
  root.setAttribute('aria-hidden', 'true');
  document.getElementById('modal-container').innerHTML = '';
}

function showConfirmModal({ title, message, confirmLabel = 'تأكيد', danger = false, onConfirm }) {
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">${esc(title)}</h2>
      <button class="btn-icon" style="width:36px;height:36px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 18)}</button>
    </div>
    <p style="font-size:14px;color:var(--text-secondary);line-height:1.7;">${esc(message)}</p>
    <div class="modal-footer">
      <button type="button" class="btn btn-secondary" data-action="close-modal">إلغاء</button>
      <button type="button" id="confirm-modal-ok" class="btn ${danger ? 'btn-danger' : 'btn-primary'}">${esc(confirmLabel)}</button>
    </div>
  `);
  document.getElementById('confirm-modal-ok').addEventListener('click', () => {
    closeModal();
    onConfirm();
  });
}

function showNumberModal({ title, label, initialValue = '', submitLabel = 'حفظ', onSubmit }) {
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">${esc(title)}</h2>
      <button class="btn-icon" style="width:36px;height:36px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 18)}</button>
    </div>
    <form id="num-modal-form" class="stack-md">
      <div class="form-group">
        <label class="form-label" for="num-modal-val">${esc(label)}</label>
        <input id="num-modal-val" class="form-input num" type="number" inputmode="decimal" step="any" required value="${esc(initialValue)}" placeholder="0">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="close-modal">إلغاء</button>
        <button type="submit" class="btn btn-primary">${icon('check', 16)} ${esc(submitLabel)}</button>
      </div>
    </form>
  `);
  const input = document.getElementById('num-modal-val');
  input?.focus();
  document.getElementById('num-modal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const val = Number(input.value);
    if (!Number.isNaN(val)) {
      closeModal();
      onSubmit(val);
    }
  });
}

function showTransactionModal(defaultType = 'expense', editTx = null) {
  const state = getState();
  let txType = editTx ? editTx.type : defaultType;

  const renderForm = () => {
    const cats = getAllCategories(txType === 'income' ? 'income' : 'expense');
    const accOpts = (selectedId) => state.accounts.length
      ? state.accounts.map((a) => `<option value="${a.id}" ${selectedId === a.id ? 'selected' : ''}>${esc(a.name)}</option>`).join('')
      : `<option value="">بدون حساب (أضف حساباً لاحقاً)</option>`;

    openModal(`
      <div class="modal-header">
        <h2 class="modal-title">${editTx ? 'تعديل المعاملة' : 'إضافة معاملة جديدة'}</h2>
        <button class="btn-icon" style="width:36px;height:36px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 18)}</button>
      </div>
      <form id="modal-tx-form" class="stack-md">
        <div class="segmented">
          <button type="button" class="segmented-btn ${txType === 'expense' ? 'active' : ''}" data-tx-type="expense">مصروف</button>
          <button type="button" class="segmented-btn ${txType === 'income' ? 'active' : ''}" data-tx-type="income">دخل</button>
          <button type="button" class="segmented-btn ${txType === 'transfer' ? 'active' : ''}" data-tx-type="transfer">تحويل</button>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="tx-amount">المبلغ</label>
            <input id="tx-amount" class="form-input num" type="number" inputmode="decimal" min="0.01" step="any" required placeholder="0.00" value="${editTx ? esc(editTx.amount) : ''}">
          </div>
          <div class="form-group">
            <label class="form-label" for="tx-date">التاريخ</label>
            <input id="tx-date" class="form-input" type="date" required value="${editTx ? esc(editTx.date) : todayISO()}">
          </div>
        </div>

        ${txType !== 'transfer' ? `
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="tx-cat">الفئة</label>
              <select id="tx-cat" class="form-select">${cats.map((c) => `<option value="${esc(c)}" ${editTx?.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
            </div>
            <div class="form-group">
              <label class="form-label" for="tx-acc">الحساب</label>
              <select id="tx-acc" class="form-select">${accOpts(editTx?.accountId)}</select>
            </div>
          </div>
        ` : `
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label" for="tx-acc">من حساب</label>
              <select id="tx-acc" class="form-select">${accOpts(editTx?.accountId)}</select>
            </div>
            <div class="form-group">
              <label class="form-label" for="tx-to-acc">إلى حساب</label>
              <select id="tx-to-acc" class="form-select">${accOpts(editTx?.toAccountId)}</select>
            </div>
          </div>
        `}

        <div class="form-group">
          <label class="form-label" for="tx-note">وصف أو ملاحظة (اختياري)</label>
          <input id="tx-note" class="form-input" type="text" placeholder="مثال: قهوة، راتب، فاتورة كهرباء..." value="${editTx ? esc(editTx.note) : ''}">
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-action="close-modal">إلغاء</button>
          <button type="submit" class="btn btn-primary">${icon('check', 16)} ${editTx ? 'حفظ التعديلات' : 'حفظ المعاملة'}</button>
        </div>
      </form>
    `);

    document.querySelectorAll('[data-tx-type]').forEach((b) => {
      b.addEventListener('click', () => {
        txType = b.dataset.txType;
        renderForm();
      });
    });

    document.getElementById('modal-tx-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const payload = {
        type: txType,
        amount: Number(document.getElementById('tx-amount').value),
        date: document.getElementById('tx-date').value,
        accountId: document.getElementById('tx-acc')?.value || '',
        toAccountId: document.getElementById('tx-to-acc')?.value || '',
        category: document.getElementById('tx-cat')?.value || 'تحويل بين الحسابات',
        note: document.getElementById('tx-note').value
      };

      if (txType === 'transfer' && (!payload.accountId || !payload.toAccountId || payload.accountId === payload.toAccountId)) {
        showToast('اختر حسابين مختلفين للتحويل');
        return;
      }

      if (editTx) {
        updateTransaction(editTx.id, payload);
        showToast('تم تحديث المعاملة والرصيد');
      } else {
        addTransaction(payload);
        showToast('تم تسجيل المعاملة وتحديث الرصيد');
      }
      closeModal();
    });
  };

  renderForm();
}

function showAccountModal() {
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">إضافة حساب أو محفظة</h2>
      <button class="btn-icon" style="width:36px;height:36px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 18)}</button>
    </div>
    <form id="modal-acc-form" class="stack-md">
      <div class="form-group">
        <label class="form-label" for="acc-name">اسم الحساب</label>
        <input id="acc-name" class="form-input" type="text" required placeholder="مثلاً: بنك الراجحي، كاش، STC Pay">
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="acc-type">النوع</label>
          <select id="acc-type" class="form-select">
            ${Object.entries(ACCOUNT_TYPES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="acc-bal">الرصيد الحالي</label>
          <input id="acc-bal" class="form-input num" type="number" inputmode="decimal" step="any" required value="0">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="acc-notes">ملاحظة (اختياري)</label>
        <input id="acc-notes" class="form-input" type="text" placeholder="مثال: حساب الراتب الرئيسي">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="close-modal">إلغاء</button>
        <button type="submit" class="btn btn-primary">${icon('check', 16)} حفظ الحساب</button>
      </div>
    </form>
  `);

  document.getElementById('modal-acc-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addAccount({
      name: document.getElementById('acc-name').value,
      type: document.getElementById('acc-type').value,
      balance: document.getElementById('acc-bal').value,
      notes: document.getElementById('acc-notes').value
    });
    closeModal();
    showToast('تمت إضافة الحساب بنجاح');
  });
}

function showBudgetModal() {
  const cats = getAllCategories('expense');
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">تحديد ميزانية شهرية لفئة</h2>
      <button class="btn-icon" style="width:36px;height:36px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 18)}</button>
    </div>
    <form id="modal-bud-form" class="stack-md">
      <div class="form-group">
        <label class="form-label" for="bud-cat">الفئة</label>
        <select id="bud-cat" class="form-select">
          ${cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label" for="bud-limit">الحد الشهري</label>
        <input id="bud-limit" class="form-input num" type="number" inputmode="decimal" min="1" step="any" required placeholder="0">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="close-modal">إلغاء</button>
        <button type="submit" class="btn btn-primary">${icon('check', 16)} حفظ الميزانية</button>
      </div>
    </form>
  `);

  document.getElementById('modal-bud-form').addEventListener('submit', (e) => {
    e.preventDefault();
    upsertBudget({
      category: document.getElementById('bud-cat').value,
      limit: document.getElementById('bud-limit').value
    });
    closeModal();
    showToast('تم حفظ الميزانية الشهرية');
  });
}

function showRecurringModal() {
  const state = getState();
  const cats = getAllCategories('expense');
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">إضافة التزام أو اشتراك متكرر</h2>
      <button class="btn-icon" style="width:36px;height:36px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 18)}</button>
    </div>
    <form id="modal-rec-form" class="stack-md">
      <div class="form-group">
        <label class="form-label" for="rec-title">اسم الالتزام</label>
        <input id="rec-title" class="form-input" type="text" required placeholder="مثال: إيجار، فاتورة إنترنت، اشتراك نادي">
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="rec-amount">المبلغ الشهري</label>
          <input id="rec-amount" class="form-input num" type="number" inputmode="decimal" min="1" step="any" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="rec-day">يوم الاستحقاق (1-31)</label>
          <input id="rec-day" class="form-input num" type="number" min="1" max="31" required value="1">
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="rec-cat">الفئة</label>
          <select id="rec-cat" class="form-select">${cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select>
        </div>
        <div class="form-group">
          <label class="form-label" for="rec-acc">الحساب المرتبط</label>
          <select id="rec-acc" class="form-select">
            <option value="">بدون حساب</option>
            ${state.accounts.map((a) => `<option value="${a.id}">${esc(a.name)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="close-modal">إلغاء</button>
        <button type="submit" class="btn btn-primary">${icon('check', 16)} حفظ الالتزام</button>
      </div>
    </form>
  `);

  document.getElementById('modal-rec-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addRecurring({
      title: document.getElementById('rec-title').value,
      amount: document.getElementById('rec-amount').value,
      dueDay: document.getElementById('rec-day').value,
      category: document.getElementById('rec-cat').value,
      accountId: document.getElementById('rec-acc').value
    });
    closeModal();
    showToast('تمت إضافة الالتزام المتكرر');
  });
}

function showGoalModal() {
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">إنشاء هدف ادخاري جديد</h2>
      <button class="btn-icon" style="width:36px;height:36px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 18)}</button>
    </div>
    <form id="modal-goal-form" class="stack-md">
      <div class="form-group">
        <label class="form-label" for="g-title">اسم الهدف</label>
        <input id="g-title" class="form-input" type="text" required placeholder="مثال: صندوق طوارئ، سفر، جهاز جديد">
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="g-target">المبلغ المستهدف</label>
          <input id="g-target" class="form-input num" type="number" inputmode="decimal" min="1" step="any" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="g-current">المبلغ المدخر حالياً</label>
          <input id="g-current" class="form-input num" type="number" inputmode="decimal" min="0" step="any" value="0">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label" for="g-date">التاريخ المستهدف (اختياري)</label>
        <input id="g-date" class="form-input" type="date">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="close-modal">إلغاء</button>
        <button type="submit" class="btn btn-primary">${icon('check', 16)} حفظ الهدف</button>
      </div>
    </form>
  `);

  document.getElementById('modal-goal-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addGoal({
      title: document.getElementById('g-title').value,
      targetAmount: document.getElementById('g-target').value,
      currentAmount: document.getElementById('g-current').value,
      targetDate: document.getElementById('g-date').value
    });
    closeModal();
    showToast('تم إنشاء الهدف الادخاري');
  });
}

function showDebtModal() {
  openModal(`
    <div class="modal-header">
      <h2 class="modal-title">تسجيل دين أو التزام</h2>
      <button class="btn-icon" style="width:36px;height:36px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 18)}</button>
    </div>
    <form id="modal-debt-form" class="stack-md">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="d-person">اسم الشخص أو الجهة</label>
          <input id="d-person" class="form-input" type="text" required placeholder="الاسم">
        </div>
        <div class="form-group">
          <label class="form-label" for="d-dir">نوع السجل</label>
          <select id="d-dir" class="form-select">
            <option value="owed_by_me">دين عليك (تحتاج تسدده)</option>
            <option value="owed_to_me">مبلغ لك عند غيرك</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="d-total">المبلغ الإجمالي</label>
          <input id="d-total" class="form-input num" type="number" inputmode="decimal" min="1" step="any" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="d-paid">المسدد منه حتى الآن</label>
          <input id="d-paid" class="form-input num" type="number" inputmode="decimal" min="0" step="any" value="0">
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-action="close-modal">إلغاء</button>
        <button type="submit" class="btn btn-primary">${icon('check', 16)} حفظ السجل</button>
      </div>
    </form>
  `);

  document.getElementById('modal-debt-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addDebt({
      person: document.getElementById('d-person').value,
      direction: document.getElementById('d-dir').value,
      totalAmount: document.getElementById('d-total').value,
      paidAmount: document.getElementById('d-paid').value
    });
    closeModal();
    showToast('تم تسجيل السجل في الديون');
  });
}

document.addEventListener('click', async (e) => {
  const navBtn = e.target.closest('[data-nav]');
  if (navBtn) {
    currentRoute = navBtn.dataset.nav;
    renderApp();
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }

  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;
  const id = actionEl.dataset.id;

  switch (action) {
    case 'close-modal': closeModal(); break;
    case 'open-modal': {
      const m = actionEl.dataset.modal;
      if (m === 'transaction') showTransactionModal('expense');
      else if (m === 'transfer') showTransactionModal('transfer');
      else if (m === 'account') showAccountModal();
      else if (m === 'budget') showBudgetModal();
      else if (m === 'recurring') showRecurringModal();
      else if (m === 'goal') showGoalModal();
      else if (m === 'debt') showDebtModal();
      break;
    }
    case 'shift-month': {
      const delta = Number(actionEl.dataset.delta) || 0;
      activeMonth = shiftMonthKey(activeMonth, delta);
      renderApp();
      break;
    }
    case 'toggle-theme': {
      const cur = getState().profile.theme;
      updateProfile({ theme: cur === 'dark' ? 'light' : 'dark' });
      break;
    }
    case 'toggle-privacy': {
      const priv = !getState().profile.privacyMode;
      updateProfile({ privacyMode: priv });
      showToast(priv ? 'تم تفعيل وضع الخصوصية وإخفاء الأرقام' : 'تم إظهار الأرقام');
      break;
    }
    case 'edit-tx': {
      const tx = getState().transactions.find((t) => t.id === id);
      if (tx) showTransactionModal(tx.type, tx);
      break;
    }
    case 'delete-tx':
      showConfirmModal({
        title: 'حذف المعاملة',
        message: 'سيتم حذف هذه المعاملة وعكس أثرها على رصيد الحساب المرتبط تلقائياً.',
        confirmLabel: 'حذف',
        danger: true,
        onConfirm: () => {
          deleteTransaction(id);
          showToast('تم حذف المعاملة');
        }
      });
      break;
    case 'delete-account':
      showConfirmModal({
        title: 'حذف الحساب',
        message: 'هل تريد حذف هذا الحساب من قائمة حساباتك؟',
        confirmLabel: 'حذف الحساب',
        danger: true,
        onConfirm: () => {
          deleteAccount(id);
          showToast('تم حذف الحساب');
        }
      });
      break;
    case 'adjust-balance': {
      const acc = getState().accounts.find((a) => a.id === id);
      if (!acc) break;
      showNumberModal({
        title: `تعديل رصيد "${acc.name}"`,
        label: 'أدخل الرصيد الفعلي الجديد',
        initialValue: acc.balance,
        submitLabel: 'تحديث الرصيد',
        onSubmit: (val) => {
          updateAccountBalance(id, val);
          showToast('تم تحديث الرصيد بنجاح');
        }
      });
      break;
    }
    case 'auto-budgets': {
      const res = applySmartAutoBudgets();
      if (res.ok) {
        showToast(`تم توليد ${res.count} ميزانيات ذكية بناءً على دخلك`);
      } else {
        showToast('أضف دخلك الشهري في الإعدادات أولاً لتوليد الميزانيات');
      }
      break;
    }
    case 'delete-budget':
      deleteBudget(id);
      showToast('تم حذف الميزانية');
      break;
    case 'pay-recurring':
      payRecurringNow(id, todayISO());
      showToast('تم تسجيل السداد وإضافته للمعاملات');
      break;
    case 'delete-recurring':
      deleteRecurring(id);
      showToast('تم حذف الالتزام');
      break;
    case 'contribute-goal': {
      const g = getState().goals.find((x) => x.id === id);
      if (!g) break;
      showNumberModal({
        title: `إضافة مبلغ لهدف "${g.title}"`,
        label: 'المبلغ المضاف للادخار',
        submitLabel: 'إضافة للهدف',
        onSubmit: (val) => {
          if (val > 0) {
            contributeGoal(id, val);
            showToast('تم تحديث تقدم الهدف');
          }
        }
      });
      break;
    }
    case 'delete-goal':
      deleteGoal(id);
      showToast('تم حذف الهدف');
      break;
    case 'pay-debt': {
      const d = getState().debts.find((x) => x.id === id);
      if (!d) break;
      showNumberModal({
        title: `تسجيل دفعة — ${d.person}`,
        label: 'قيمة الدفعة المسددة',
        submitLabel: 'تسجيل الدفعة',
        onSubmit: (val) => {
          if (val > 0) {
            recordDebtPayment(id, val);
            showToast('تم تسجيل الدفعة وتحديث المتبقي');
          }
        }
      });
      break;
    }
    case 'delete-debt':
      deleteDebt(id);
      showToast('تم حذف سجل الدين');
      break;
    case 'remove-cat':
      removeCustomCategory(actionEl.dataset.type, actionEl.dataset.name);
      showToast('تم حذف الفئة المخصصة');
      break;
    case 'quick-prompt':
      await handleAdvisorQuestion(actionEl.dataset.prompt || '');
      break;
    case 'clear-chat':
      clearChatHistory();
      showToast('تم مسح سجل المحادثة');
      break;
    case 'export-json':
      downloadFile(`mizan-backup-${todayISO()}.json`, exportBackupJSON(), 'application/json');
      showToast('تم تنزيل النسخة الاحتياطية');
      break;
    case 'export-csv': {
      const state = getState();
      const header = ['التاريخ', 'النوع', 'الفئة', 'المبلغ', 'الملاحظة'];
      const rows = state.transactions.map((t) => [t.date, t.type, t.category, t.amount, (t.note || '').replace(/,/g, ' ')]);
      const csv = '\uFEFF' + [header, ...rows].map((r) => r.join(',')).join('\n');
      downloadFile(`mizan-transactions-${todayISO()}.csv`, csv, 'text/csv;charset=utf-8');
      showToast('تم تصدير ملف CSV');
      break;
    }
    case 'reset-all':
      showConfirmModal({
        title: 'تصفير جميع البيانات',
        message: 'سيتم حذف جميع الحسابات والمعاملات والأهداف نهائياً والعودة لشاشة الاستبيان الأولى. لا يمكن التراجع عن هذا الإجراء.',
        confirmLabel: 'نعم، مسح الكل',
        danger: true,
        onConfirm: () => {
          resetAllData();
          currentRoute = 'dashboard';
          activeMonth = currentMonthKey();
          showToast('تم تصفير جميع البيانات');
        }
      });
      break;
  }
});

document.getElementById('modal-root')?.addEventListener('click', (e) => {
  if (e.target.id === 'modal-root') closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

subscribe(renderApp);
renderApp();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
