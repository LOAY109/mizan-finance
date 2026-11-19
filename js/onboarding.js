// Zero-Login Onboarding Survey (Name + Financial Profile + Optional First Account)
// Strictly NO dummy/sample data

import { icon } from './icons.js';
import { CURRENCIES, ACCOUNT_TYPES, esc, showToast } from './utils.js';
import { updateProfile, addAccount } from './store.js';

let draft = {
  step: 1,
  name: '',
  currency: 'SAR',
  monthlyIncome: '',
  incomeType: 'fixed',
  payday: 27,
  financialGoal: 'save',
  budgetRule: '50_30_20',
  firstAccountName: '',
  firstAccountType: 'bank',
  firstAccountBalance: ''
};

export function renderOnboarding(onComplete) {
  const app = document.getElementById('app');
  const step = draft.step;

  const dots = [1, 2, 3, 4].map((n) => `
    <div class="step-dot ${n < step ? 'done' : n === step ? 'current' : ''}"></div>
  `).join('');

  let bodyHtml = '';

  if (step === 1) {
    const currencyOpts = Object.values(CURRENCIES).map((c) =>
      `<option value="${c.code}" ${draft.currency === c.code ? 'selected' : ''}>${esc(c.name)} (${esc(c.symbol)})</option>`
    ).join('');

    bodyHtml = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;">
        <div class="brand-mark">${icon('scale', 20)}</div>
        <div>
          <div style="font-weight:700;font-size:18px;">أهلاً بك في ميزان</div>
          <div style="font-size:13px;color:var(--text-muted);">بدون تسجيل دخول ولا كلمة مرور — بياناتك محفوظة على جهازك فقط</div>
        </div>
      </div>

      <h1 style="font-size:22px;font-weight:700;margin-bottom:6px;">خلّنا نبدأ بالتعرف عليك</h1>
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:20px;">استبيان سريع من 4 خطوات عشان يضبط لك التحليل والخطط المالية على مقاسك بالضبط.</p>

      <div class="stack-md">
        <div class="form-group">
          <label class="form-label" for="ob-name">وش نناديك؟ (الاسم)</label>
          <input id="ob-name" class="form-input" type="text" placeholder="اكتب اسمك الأول" value="${esc(draft.name)}" autocomplete="given-name">
        </div>

        <div class="form-group">
          <label class="form-label" for="ob-currency">العملة الأساسية</label>
          <select id="ob-currency" class="form-select">${currencyOpts}</select>
        </div>
      </div>

      <div class="modal-footer" style="border-top:none;padding-top:24px;">
        <button id="ob-next" class="btn btn-primary" style="width:100%;">التالي</button>
      </div>
    `;
  } else if (step === 2) {
    const types = [
      { id: 'fixed', title: 'راتب شهري ثابت', desc: 'دخل منتظم في يوم محدد من الشهر' },
      { id: 'variable', title: 'دخل متغير / عمل حر', desc: 'يختلف من شهر لآخر حسب المشاريع' },
      { id: 'business', title: 'تجارة أو مشروع خاص', desc: 'مبيعات وتدفقات نقدية مستمرة' },
      { id: 'student', title: 'مكافأة / مصروف شهري', desc: 'ميزانية طالب أو مصروف شخصي' }
    ];

    bodyHtml = `
      <h1 style="font-size:21px;font-weight:700;margin-bottom:6px;">مصدر دخلك الشهري</h1>
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:18px;">يساعدنا الرقم هذا في حساب سقف الصرف اليومي وخطة الادخار المناسبة لك.</p>

      <div class="stack-md">
        <div class="form-group">
          <label class="form-label" for="ob-income">متوسط الدخل الشهري (${esc(CURRENCIES[draft.currency]?.symbol || '')}) — اختياري</label>
          <input id="ob-income" class="form-input num" type="number" inputmode="decimal" min="0" step="any" placeholder="0" value="${esc(draft.monthlyIncome)}">
          <span class="form-hint">تقدر تتركه فاضي وتعدّله لاحقاً أو تعتمد على الدخل اللي تسجله شهرياً.</span>
        </div>

        <div class="form-group">
          <label class="form-label">طبيعة الدخل</label>
          <div class="choice-grid">
            ${types.map((t) => `
              <button type="button" class="choice-card ${draft.incomeType === t.id ? 'selected' : ''}" data-income-type="${t.id}">
                <span class="choice-title">${t.title}</span>
                <span class="choice-desc">${t.desc}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="modal-footer" style="border-top:none;padding-top:24px;justify-content:space-between;">
        <button id="ob-prev" class="btn btn-secondary">رجوع</button>
        <button id="ob-next" class="btn btn-primary">التالي</button>
      </div>
    `;
  } else if (step === 3) {
    const goals = [
      { id: 'control', title: 'ضبط المصاريف اليومية', desc: 'معرفة وين تروح الفلوس وتقليل الهدر' },
      { id: 'save', title: 'بناء ادخار وصندوق طوارئ', desc: 'تخصيص نسبة ثابتة للادخار شهرياً' },
      { id: 'debt', title: 'تصفية الديون والالتزامات', desc: 'جدولة السداد والتخلص من الأقساط' },
      { id: 'invest', title: 'تنمية المال والاستثمار', desc: 'رفع الفائض الشهري وتوجيهه لأهدافك' }
    ];

    const rules = [
      { id: '50_30_20', title: '50 / 30 / 20 المتوازنة', desc: '50% أساسيات · 30% رغبات · 20% ادخار' },
      { id: '60_20_20', title: '60 / 20 / 20 للاستقرار', desc: '60% أساسيات · 20% رغبات · 20% ادخار' },
      { id: '70_20_10', title: '70 / 10 / 20 للالتزامات', desc: '70% التزامات · 10% رغبات · 20% ادخار' },
      { id: 'custom', title: '50 / 20 / 30 ادخار مكثف', desc: '50% أساسيات · 20% رغبات · 30% ادخار' }
    ];

    bodyHtml = `
      <h1 style="font-size:21px;font-weight:700;margin-bottom:6px;">هدفك المالي وأسلوب الميزانية</h1>
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:18px;">المستشار الذكي راح يبني لك خططك وتوصياتك بناءً على اختيارك هنا.</p>

      <div class="stack-md">
        <div class="form-group">
          <label class="form-label">أولويتك الحالية</label>
          <div class="choice-grid">
            ${goals.map((g) => `
              <button type="button" class="choice-card ${draft.financialGoal === g.id ? 'selected' : ''}" data-goal="${g.id}">
                <span class="choice-title">${g.title}</span>
                <span class="choice-desc">${g.desc}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">قاعدة توزيع الميزانية المفضلة</label>
          <div class="choice-grid">
            ${rules.map((r) => `
              <button type="button" class="choice-card ${draft.budgetRule === r.id ? 'selected' : ''}" data-rule="${r.id}">
                <span class="choice-title">${r.title}</span>
                <span class="choice-desc">${r.desc}</span>
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="modal-footer" style="border-top:none;padding-top:24px;justify-content:space-between;">
        <button id="ob-prev" class="btn btn-secondary">رجوع</button>
        <button id="ob-next" class="btn btn-primary">التالي</button>
      </div>
    `;
  } else if (step === 4) {
    const accOpts = Object.entries(ACCOUNT_TYPES).map(([k, v]) =>
      `<option value="${k}" ${draft.firstAccountType === k ? 'selected' : ''}>${v.label}</option>`
    ).join('');

    bodyHtml = `
      <h1 style="font-size:21px;font-weight:700;margin-bottom:6px;">أضف أول حساب حقيقي لك (اختياري)</h1>
      <p style="font-size:14px;color:var(--text-secondary);margin-bottom:18px;">التطبيق يبدأ نظيف 100% بدون أي أرقام تجريبية. تقدر تضيف حسابك الرئيسي الآن أو تتخطى وتضيفه من الداخل.</p>

      <div class="stack-md">
        <div class="form-group">
          <label class="form-label" for="ob-acc-name">اسم الحساب (مثلاً: الراجحي، المحفظة، كاش)</label>
          <input id="ob-acc-name" class="form-input" type="text" placeholder="اتركه فاضي للتخطي الآن" value="${esc(draft.firstAccountName)}">
        </div>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label" for="ob-acc-type">نوع الحساب</label>
            <select id="ob-acc-type" class="form-select">${accOpts}</select>
          </div>
          <div class="form-group">
            <label class="form-label" for="ob-acc-bal">الرصيد الحالي</label>
            <input id="ob-acc-bal" class="form-input num" type="number" inputmode="decimal" step="any" placeholder="0" value="${esc(draft.firstAccountBalance)}">
          </div>
        </div>
      </div>

      <div class="modal-footer" style="border-top:none;padding-top:24px;justify-content:space-between;">
        <button id="ob-prev" class="btn btn-secondary">رجوع</button>
        <button id="ob-finish" class="btn btn-primary">${icon('check', 17)} ابدأ استخدام ميزان</button>
      </div>
    `;
  }

  app.innerHTML = `
    <div class="onboarding-wrap">
      <div class="onboarding-card">
        <div class="step-dots">${dots}</div>
        ${bodyHtml}
      </div>
    </div>
  `;

  app.querySelectorAll('[data-income-type]').forEach((btn) => {
    btn.addEventListener('click', () => {
      draft.incomeType = btn.dataset.incomeType;
      renderOnboarding(onComplete);
    });
  });

  app.querySelectorAll('[data-goal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      draft.financialGoal = btn.dataset.goal;
      renderOnboarding(onComplete);
    });
  });

  app.querySelectorAll('[data-rule]').forEach((btn) => {
    btn.addEventListener('click', () => {
      draft.budgetRule = btn.dataset.rule;
      renderOnboarding(onComplete);
    });
  });

  const prevBtn = document.getElementById('ob-prev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      captureStepInputs(step);
      draft.step = Math.max(1, draft.step - 1);
      renderOnboarding(onComplete);
    });
  }

  const nextBtn = document.getElementById('ob-next');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      captureStepInputs(step);
      if (step === 1 && !draft.name.trim()) {
        showToast('اكتب اسمك أولاً عشان نبدأ');
        document.getElementById('ob-name')?.focus();
        return;
      }
      draft.step = Math.min(4, draft.step + 1);
      renderOnboarding(onComplete);
    });
  }

  const finishBtn = document.getElementById('ob-finish');
  if (finishBtn) {
    finishBtn.addEventListener('click', () => {
      captureStepInputs(4);
      updateProfile({
        onboarded: true,
        name: draft.name.trim(),
        currency: draft.currency,
        monthlyIncome: Number(draft.monthlyIncome) || 0,
        incomeType: draft.incomeType,
        financialGoal: draft.financialGoal,
        budgetRule: draft.budgetRule
      });
      if (draft.firstAccountName.trim()) {
        addAccount({
          name: draft.firstAccountName.trim(),
          type: draft.firstAccountType,
          balance: Number(draft.firstAccountBalance) || 0
        });
      }
      showToast(`حياك الله يا ${draft.name.trim()} — مساحتك المالية جاهزة`);
      onComplete();
    });
  }
}

function captureStepInputs(step) {
  if (step === 1) {
    const n = document.getElementById('ob-name');
    const c = document.getElementById('ob-currency');
    if (n) draft.name = n.value;
    if (c) draft.currency = c.value;
  } else if (step === 2) {
    const inc = document.getElementById('ob-income');
    if (inc) draft.monthlyIncome = inc.value;
  } else if (step === 4) {
    const an = document.getElementById('ob-acc-name');
    const at = document.getElementById('ob-acc-type');
    const ab = document.getElementById('ob-acc-bal');
    if (an) draft.firstAccountName = an.value;
    if (at) draft.firstAccountType = at.value;
    if (ab) draft.firstAccountBalance = ab.value;
  }
}
