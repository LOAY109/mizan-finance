// Mizan Finance v5.0 — Mobile-First Motion-Graphics Controller

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
import {
  askAdvisor,
  applySmartAutoBudgets,
  generateFinancialPlan,
  testGeminiConnection
} from './ai-engine.js';
import { initMotionEngine } from './motion.js';

let currentRoute = 'dashboard';
let activeMonth = currentMonthKey();
const txFilters = { q: '', type: '', accountId: '', month: '' };
const simState = { cutPct: 15, customSaveAmount: 0, customSaveFreq: 'daily' };

const BOTTOM_TABS = [
  { id: 'dashboard', label: 'الرئيسية', icon: 'home' },
  { id: 'transactions', label: 'المعاملات', icon: 'arrows' },
  { id: 'accounts', label: 'الحسابات', icon: 'wallet' },
  { id: 'analytics', label: 'التحليلات', icon: 'chart' },
  { id: 'advisor', label: 'المستشار', icon: 'sparkles' }
];

// Magic 1-Tap Private Activation via URL Hash (#key=AIza...)
function ingestMagicKeyFromHash() {
  const hash = window.location.hash || '';
  const match = hash.match(/key=([^&]+)/);
  if (match && match[1]) {
    const key = decodeURIComponent(match[1]).trim();
    if (key) {
      updateProfile({ geminiApiKey: key });
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch { /* ignore */ }
      setTimeout(() => showToast('تم تفعيل Gemini AI على جوالك تلقائياً'), 400);
    }
  }
}

function applyVisualModes(profile) {
  document.documentElement.setAttribute('data-theme', profile.theme === 'dark' ? 'dark' : 'light');
  document.body.classList.toggle('privacy-blur', Boolean(profile.privacyMode));
  const meta = document.getElementById('meta-theme-color');
  if (meta) meta.setAttribute('content', profile.theme === 'dark' ? '#0B0E11' : '#F5F4F0');
}

function compressReceiptImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ملف الصورة غير صالح'));
      img.onload = () => {
        const maxDim = 1024;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const base64 = dataUrl.split(',')[1];
        resolve({ base64, mimeType: 'image/jpeg' });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function handleReceiptFileUpload(file) {
  if (!file) return;
  if (currentRoute !== 'advisor') {
    currentRoute = 'advisor';
    renderApp();
  }
  showToast('جاري قراءة وتحليل الفاتورة...');
  try {
    const imagePayload = await compressReceiptImage(file);
    appendChatMessage('user', 'تم رفع صورة فاتورة — حللها وسجلها في مصاريفي');
    const reply = await askAdvisor('حلل هذه الفاتورة بالكامل (المتجر، الموقع، الأصناف، السعر قبل الخصم، الخصم، الضريبة، الإجمالي النهائي) وسجلها كمصروف.', imagePayload);
    appendChatMessage('assistant', reply);
    showToast('تم تحليل الفاتورة');
  } catch (err) {
    showToast(err.message || 'تعذر معالجة الصورة');
  }
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
    initMotionEngine();
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

  const priv = Boolean(state.profile.privacyMode);
  const isDark = state.profile.theme === 'dark';

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="ambient-bg" aria-hidden="true">
      <div class="ambient-blob ambient-blob-1"></div>
      <div class="ambient-blob ambient-blob-2"></div>
    </div>

    <div class="mobile-frame">
      <header class="topbar">
        <button class="topbar-brand" data-nav="dashboard" style="text-align:start;">
          <span class="brand-mark">${icon('scale', 18)}</span>
          <span style="min-width:0;">
            <span class="topbar-title" style="display:block;">ميزان</span>
            <span class="topbar-sub" style="display:block;">أهلاً ${esc(state.profile.name)}</span>
          </span>
        </button>

        <div class="topbar-actions">
          <button class="btn-icon ${priv ? 'active' : ''}" data-action="toggle-privacy" aria-label="وضع الخصوصية">${icon(priv ? 'eyeOff' : 'eye', 17)}</button>
          <button class="btn-icon" data-action="toggle-theme" aria-label="تبديل المظهر">${icon(isDark ? 'sun' : 'moon', 17)}</button>
          <button class="btn-icon ${currentRoute === 'settings' ? 'active' : ''}" data-nav="settings" aria-label="الإعدادات">${icon('settings', 17)}</button>
        </div>

        <div class="scroll-progress-track" aria-hidden="true">
          <div id="scroll-progress-bar" class="scroll-progress-bar"></div>
        </div>
      </header>

      <main class="main-content">${viewHtml}</main>

      <div class="bottom-nav-wrap">
        <nav class="bottom-nav" aria-label="التنقل الرئيسي">
          ${BOTTOM_TABS.map((item) => `
            <button class="bottom-nav-btn ${currentRoute === item.id ? 'active' : ''}" data-nav="${item.id}">
              ${icon(item.icon, 20)}
              <span>${item.label}</span>
            </button>
          `).join('')}
        </nav>
      </div>
    </div>
  `;

  bindViewSpecificHandlers();
  initMotionEngine();
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

    const dashReceipt = document.getElementById('dash-receipt-input');
    if (dashReceipt) {
      dashReceipt.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) handleReceiptFileUpload(file);
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

    const quickKeyForm = document.getElementById('quick-gemini-form');
    if (quickKeyForm) {
      quickKeyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const key = (document.getElementById('quick-gemini-key')?.value || '').trim();
        if (!key) return;
        updateProfile({ geminiApiKey: key });
        showToast('تم حفظ المفتاح على جوالك — جاري الاختبار...');
        const res = await testGeminiConnection(key);
        showToast(res.message);
      });
    }

    const receiptInput = document.getElementById('ai-receipt-input');
    if (receiptInput) {
      receiptInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) handleReceiptFileUpload(file);
      });
    }

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

    const updateWhatIfUI = (pctVal) => {
      const pct = Math.max(0, Math.min(100, Number(pctVal) || 0));
      simState.cutPct = pct;
      const sliderEl = document.getElementById('sim-cut-range');
      const inputEl = document.getElementById('sim-cut-input');
      if (sliderEl && Number(sliderEl.value) !== pct) sliderEl.value = String(pct);
      if (inputEl && Number(inputEl.value) !== pct) inputEl.value = String(pct);

      const state = getState();
      const cur = state.profile.currency || 'SAR';
      const plan = generateFinancialPlan(currentMonthKey());
      const baseExp = plan.summary.monthExpense > 0 ? plan.summary.monthExpense : plan.allocation.wants;
      const monthly = Math.round((baseExp * pct) / 100) + Math.max(0, plan.allocation.savings);
      const mEl = document.getElementById('sim-monthly');
      const yEl = document.getElementById('sim-yearly');
      const tEl = document.getElementById('sim-3yr');
      if (mEl) mEl.textContent = formatMoney(monthly, cur);
      if (yEl) yEl.textContent = formatMoney(monthly * 12, cur);
      if (tEl) tEl.textContent = formatMoney(monthly * 36, cur);
    };

    document.getElementById('sim-cut-range')?.addEventListener('input', (e) => updateWhatIfUI(e.target.value));
    document.getElementById('sim-cut-input')?.addEventListener('input', (e) => updateWhatIfUI(e.target.value));

    const updateCustomSavingsUI = () => {
      const amt = Math.max(0, Number(document.getElementById('custom-save-amount')?.value) || 0);
      const freq = document.getElementById('custom-save-freq')?.value || 'daily';
      simState.customSaveAmount = amt;
      simState.customSaveFreq = freq;
      const cur = getState().profile.currency || 'SAR';
      const mult = freq === 'daily' ? 30 : freq === 'weekly' ? 4.333 : 1;
      const cMonth = Math.round(amt * mult);
      document.getElementById('cs-month').textContent = formatMoney(cMonth, cur);
      document.getElementById('cs-year').textContent = formatMoney(cMonth * 12, cur);
      document.getElementById('cs-3yr').textContent = formatMoney(cMonth * 36, cur);
      document.getElementById('cs-5yr').textContent = formatMoney(cMonth * 60, cur);
    };

    document.getElementById('custom-save-amount')?.addEventListener('input', updateCustomSavingsUI);
    document.getElementById('custom-save-freq')?.addEventListener('change', updateCustomSavingsUI);
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

// =========================================================================
// NATIVE iOS-STYLE BOTTOM-SHEET MODALS
// =========================================================================
function openModal(html) {
  const root = document.getElementById('modal-root');
  const container = document.getElementById('modal-container');
  container.innerHTML = `<div class="sheet-handle" aria-hidden="true"></div>${html}`;
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
      <button class="btn-icon" style="width:34px;height:34px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 16)}</button>
    </div>
    <p style="font-size:13.5px;color:var(--text-secondary);line-height:1.7;">${esc(message)}</p>
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
      <button class="btn-icon" style="width:34px;height:34px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 16)}</button>
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
        <button class="btn-icon" style="width:34px;height:34px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 16)}</button>
      </div>
      <form id="modal-tx-form" class="stack-sm">
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
          <button type="submit" class="btn btn-primary">${icon('check', 16)} ${editTx ? 'حفظ التعديلات' : 'حفظ'}</button>
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
      <button class="btn-icon" style="width:34px;height:34px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 16)}</button>
    </div>
    <form id="modal-acc-form" class="stack-sm">
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
      <button class="btn-icon" style="width:34px;height:34px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 16)}</button>
    </div>
    <form id="modal-bud-form" class="stack-sm">
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
      <button class="btn-icon" style="width:34px;height:34px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 16)}</button>
    </div>
    <form id="modal-rec-form" class="stack-sm">
      <div class="form-group">
        <label class="form-label" for="rec-title">اسم الالتزام</label>
        <input id="rec-title" class="form-input" type="text" required placeholder="مثال: إيجار، إنترنت، اشتراك نادي">
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
      <button class="btn-icon" style="width:34px;height:34px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 16)}</button>
    </div>
    <form id="modal-goal-form" class="stack-sm">
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
          <label class="form-label" for="g-current">المدخر حالياً</label>
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
      <button class="btn-icon" style="width:34px;height:34px;" data-action="close-modal" aria-label="إغلاق">${icon('close', 16)}</button>
    </div>
    <form id="modal-debt-form" class="stack-sm">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="d-person">الاسم أو الجهة</label>
          <input id="d-person" class="form-input" type="text" required placeholder="الاسم">
        </div>
        <div class="form-group">
          <label class="form-label" for="d-dir">النوع</label>
          <select id="d-dir" class="form-select">
            <option value="owed_by_me">دين عليك</option>
            <option value="owed_to_me">مبلغ لك</option>
          </select>
        </div>
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label" for="d-total">المبلغ الإجمالي</label>
          <input id="d-total" class="form-input num" type="number" inputmode="decimal" min="1" step="any" required>
        </div>
        <div class="form-group">
          <label class="form-label" for="d-paid">المسدد حتى الآن</label>
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

// =========================================================================
// GLOBAL EVENT DELEGATION
// =========================================================================
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
      if (m === 'transaction' || m === 'expense') showTransactionModal('expense');
      else if (m === 'income') showTransactionModal('income');
      else if (m === 'transfer') showTransactionModal('transfer');
      else if (m === 'account') showAccountModal();
      else if (m === 'budget') showBudgetModal();
      else if (m === 'recurring') showRecurringModal();
      else if (m === 'goal') showGoalModal();
      else if (m === 'debt') showDebtModal();
      break;
    }
    case 'test-gemini': {
      const inputKey = document.getElementById('set-apikey')?.value?.trim();
      const keyToTest = inputKey || (getState().profile.geminiApiKey || '').trim();
      if (inputKey && inputKey !== getState().profile.geminiApiKey) {
        updateProfile({ geminiApiKey: inputKey });
      }
      showToast('جاري اختبار الاتصال بـ Gemini...');
      const res = await testGeminiConnection(keyToTest);
      showToast(res.message);
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

ingestMagicKeyFromHash();
subscribe(renderApp);
renderApp();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
