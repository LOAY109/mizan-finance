// Full-Access Agentic Financial AI Engine v4.0
// 1) Local deterministic analysis + Offline Arabic natural-language command parser
// 2) Live Gemini 2.5 Flash Multimodal Agent: full app control (CRUD actions) + Receipt/Invoice Vision OCR

import {
  getState, getFinancialSummary, getAllCategories,
  addTransaction, deleteTransaction,
  addAccount, updateAccountBalance,
  upsertBudget,
  addGoal, contributeGoal,
  addDebt, recordDebtPayment,
  addRecurring,
  updateProfile
} from './store.js';
import { formatMoney, currentMonthKey, todayISO } from './utils.js';

const RULES = {
  '50_30_20': { name: 'قاعدة 50 / 30 / 20 المتوازنة', needs: 0.50, wants: 0.30, savings: 0.20 },
  '60_20_20': { name: 'قاعدة 60 / 20 / 20 للاستقرار', needs: 0.60, wants: 0.20, savings: 0.20 },
  '70_20_10': { name: 'قاعدة 70 / 10 / 20 للالتزامات العالية', needs: 0.70, wants: 0.10, savings: 0.20 },
  'custom':   { name: 'توزيع مرن مخصص للادخار المكثف (50/20/30)', needs: 0.50, wants: 0.20, savings: 0.30 }
};

export function generateFinancialPlan(monthKey = currentMonthKey()) {
  const state = getState();
  const { profile, accounts, transactions, budgets, goals } = state;
  const summary = getFinancialSummary(monthKey);
  const cur = profile.currency || 'SAR';

  const baseIncome = summary.monthIncome > 0 ? summary.monthIncome : (Number(profile.monthlyIncome) || 0);
  const rule = RULES[profile.budgetRule] || RULES['50_30_20'];
  const hasData = accounts.length > 0 || transactions.length > 0 || baseIncome > 0;

  const now = new Date();
  const isCurrentMonth = monthKey === currentMonthKey();
  const [y, m] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(y, m || 1, 0).getDate();
  const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - now.getDate() + 1) : 0;

  const allocation = {
    ruleName: rule.name,
    baseIncome,
    needs: Math.round(baseIncome * rule.needs),
    wants: Math.round(baseIncome * rule.wants),
    savings: Math.round(baseIncome * rule.savings)
  };

  const plannedSpendCeiling = allocation.needs + allocation.wants;
  const remainingBudget = Math.max(0, plannedSpendCeiling - summary.monthExpense);
  const safeDailySpend = baseIncome > 0 && daysLeft > 0 ? Math.round(remainingBudget / daysLeft) : 0;

  const savingsRate = baseIncome > 0
    ? Math.round(((baseIncome - summary.monthExpense) / baseIncome) * 100)
    : null;

  const sortedCats = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]);
  const topCategory = sortedCats.length ? { name: sortedCats[0][0], amount: sortedCats[0][1] } : null;

  const overBudgets = budgets
    .map((b) => ({ ...b, spent: summary.byCategory[b.category] || 0 }))
    .filter((b) => b.spent >= b.limit * 0.85);

  let score = null;
  if (transactions.length > 0 || accounts.length > 0) {
    let pts = 55;
    if (savingsRate !== null) {
      if (savingsRate >= 20) pts += 25;
      else if (savingsRate >= 10) pts += 15;
      else if (savingsRate >= 0) pts += 5;
      else pts -= 20;
    }
    if (summary.owedByMe === 0) pts += 10;
    else if (baseIncome > 0 && summary.owedByMe > baseIncome * 3) pts -= 15;
    if (overBudgets.some((b) => b.spent > b.limit)) pts -= 10;
    if (goals.length > 0) pts += 10;
    score = Math.max(15, Math.min(100, pts));
  }

  const insights = [];

  if (!hasData) {
    insights.push({
      level: 'info',
      title: 'ابدأ بإدخال بياناتك الحقيقية',
      body: 'أضف حساباتك أو قل للمستشار الذكي مثلاً: "اليوم دفعت 5 ريال عشان كوفي" أو ارفع صورة فاتورة وسيسجلها عنك فوراً.'
    });
  } else {
    if (baseIncome > 0 && isCurrentMonth) {
      insights.push({
        level: 'accent',
        title: `سقف الصرف اليومي الآمن: ${formatMoney(safeDailySpend, cur)}`,
        body: `بناءً على دخلك (${formatMoney(baseIncome, cur)}) ومصاريفك المسجلة هذا الشهر (${formatMoney(summary.monthExpense, cur)})، هذا هو الحد اليومي الآمن لباقي ${daysLeft} يوم لتحقيق هدف الادخار.`
      });
    }

    if (summary.expenseDeltaPct !== null) {
      const up = summary.expenseDeltaPct > 0;
      insights.push({
        level: up && summary.expenseDeltaPct >= 15 ? 'warning' : 'info',
        title: up
          ? `مصاريفك ارتفعت ${summary.expenseDeltaPct}% مقارنة بالشهر الماضي`
          : `ممتاز: مصاريفك أقل بـ ${Math.abs(summary.expenseDeltaPct)}% عن الشهر الماضي`,
        body: `الشهر الماضي صرفت ${formatMoney(summary.prevMonthExpense, cur)}، بينما هذا الشهر ${formatMoney(summary.monthExpense, cur)}.`
      });
    }

    if (topCategory && summary.monthExpense > 0) {
      const share = Math.round((topCategory.amount / summary.monthExpense) * 100);
      insights.push({
        level: share >= 40 ? 'warning' : 'info',
        title: `أعلى بند صرف: ${topCategory.name} (${share}%)`,
        body: `صرفت ${formatMoney(topCategory.amount, cur)} على "${topCategory.name}". ${share >= 40 ? 'يستحوذ هذا البند على نسبة كبيرة من مصاريفك — يُنصح بوضع ميزانية شهرية مخصصة له.' : 'توزيع متوازن، استمر بمراقبته أسبوعياً.'}`
      });
    }

    if (overBudgets.length > 0) {
      const names = overBudgets.map((b) => `${b.category} (${Math.round((b.spent / b.limit) * 100)}%)`).join('، ');
      insights.push({
        level: 'danger',
        title: 'تنبيه اقتراب أو تجاوز الميزانية',
        body: `الفئات التالية وصلت لحد التنبيه: ${names}.`
      });
    }

    if (summary.owedByMe > 0) {
      insights.push({
        level: 'warning',
        title: `خطة سداد الديون (${formatMoney(summary.owedByMe, cur)})`,
        body: baseIncome > 0
          ? `تخصيص 15% من دخلك (${formatMoney(Math.round(baseIncome * 0.15), cur)} شهرياً) يمكّنك من إغلاق التزاماتك خلال ${Math.ceil(summary.owedByMe / Math.max(1, baseIncome * 0.15))} شهر تقريباً.`
          : 'أضف دخلك الشهري في الإعدادات لحساب الجدول الزمني المثالي لسداد ديونك.'
      });
    }

    if (summary.monthlyRecurringTotal > 0 && baseIncome > 0) {
      const recPct = Math.round((summary.monthlyRecurringTotal / baseIncome) * 100);
      insights.push({
        level: recPct > 45 ? 'warning' : 'info',
        title: `الالتزامات الثابتة تشكل ${recPct}% من دخلك`,
        body: `مجموع اشتراكاتك وفواتيرك المتكررة ${formatMoney(summary.monthlyRecurringTotal, cur)} شهرياً. ${recPct > 45 ? 'نسبة الالتزامات مرتفعة؛ راجع الاشتراكات غير الضرورية.' : 'نسبة التزاماتك ضمن النطاق المريح.'}`
      });
    }

    const monthlyNeedEstimate = summary.monthExpense > 0 ? summary.monthExpense : allocation.needs;
    if (monthlyNeedEstimate > 0) {
      const emergencyTarget = monthlyNeedEstimate * 3;
      insights.push({
        level: 'info',
        title: `صندوق الطوارئ المقترح (3 أشهر): ${formatMoney(emergencyTarget, cur)}`,
        body: summary.totalBalance >= emergencyTarget
          ? 'سيولتك الحالية تغطي صندوق الطوارئ لـ 3 أشهر — وضع مستقر.'
          : `ينقصك ${formatMoney(Math.max(0, emergencyTarget - summary.totalBalance), cur)} للوصول لغطاء أمان يكفي 3 أشهر.`
      });
    }
  }

  const zakatEstimate = summary.totalBalance > 0 ? Math.round(summary.totalBalance * 0.025 * 100) / 100 : 0;

  return {
    hasData,
    score,
    daysLeft,
    safeDailySpend,
    savingsRate,
    allocation,
    topCategory,
    overBudgets,
    insights,
    zakatEstimate,
    summary
  };
}

export function applySmartAutoBudgets() {
  const plan = generateFinancialPlan(currentMonthKey());
  const income = plan.allocation.baseIncome;
  if (income <= 0) return { ok: false, count: 0 };

  const spendable = plan.allocation.needs + plan.allocation.wants;
  const split = [
    { category: 'مقاضي وسوبرماركت', ratio: 0.24 },
    { category: 'طعام ومقاهي', ratio: 0.16 },
    { category: 'مواصلات ووقود', ratio: 0.14 },
    { category: 'فواتير واتصالات', ratio: 0.12 },
    { category: 'تسوق وملابس', ratio: 0.14 },
    { category: 'ترفيه وسفر', ratio: 0.10 }
  ];

  let count = 0;
  split.forEach((item) => {
    const limit = Math.max(50, Math.round((spendable * item.ratio) / 50) * 50);
    upsertBudget({ category: item.category, limit });
    count++;
  });

  return { ok: true, count };
}

export async function testGeminiConnection(rawKey) {
  const apiKey = (rawKey || '').trim();
  if (!apiKey) return { ok: false, message: 'أدخل مفتاح Gemini API أولاً' };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'رد بكلمة واحدة فقط: متصل' }] }]
        })
      }
    );
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const reason = errData?.error?.message || `HTTP ${res.status}`;
      return { ok: false, message: `تعذر الاتصال (${reason})` };
    }
    return { ok: true, message: 'تم الاتصال بـ Gemini بنجاح وهو جاهز لتنفيذ أوامرك وقراءة الفواتير' };
  } catch {
    return { ok: false, message: 'تعذر الوصول للإنترنت حالياً' };
  }
}

// =========================================================================
// FULL-ACCESS ACTION EXECUTOR (AI -> Real App State Mutations)
// =========================================================================
function findAccountIdByName(accounts, nameHint) {
  if (!accounts.length) return '';
  if (!nameHint) return accounts[0].id;
  const q = String(nameHint).trim().toLowerCase();
  const found = accounts.find((a) => a.name.toLowerCase().includes(q) || q.includes(a.name.toLowerCase()));
  return found ? found.id : accounts[0].id;
}

function guessExpenseCategory(text) {
  const t = String(text || '').toLowerCase();
  if (/كوفي|قهوة|قهوه|مطعم|أكل|اكل|غداء|عشاء|فطور|برجر|شاورما|بيتزا|حلى|دانكن|ستاربكس/.test(t)) return 'طعام ومقاهي';
  if (/سوبرماركت|مقاضي|بقالة|بقاله|تموينات|العثيم|بنده|الدانوب|لولو/.test(t)) return 'مقاضي وسوبرماركت';
  if (/بنزين|وقود|محطة|اوبر|أوبر|كريم|مواصلات|سيارة|تأمين|موقف/.test(t)) return 'مواصلات ووقود';
  if (/إيجار|ايجار|سكن|كهرباء|ماء|مياه/.test(t)) return 'سكن وإيجار';
  if (/جوال|نت|إنترنت|انترنت|فاتورة|فاتوره|stc|موبايلي|زين|اتصالات/.test(t)) return 'فواتير واتصالات';
  if (/ملابس|تسوق|سوق|أمازون|امازون|نون|شي ان|شراء|حذاء|عطر/.test(t)) return 'تسوق وملابس';
  if (/صيدلية|صيدليه|مستشفى|دواء|طبيب|علاج|صحة/.test(t)) return 'صحة وعلاج';
  if (/سينما|ترفيه|سفر|فندق|لعبة|العاب|ألعاب|نادي/.test(t)) return 'ترفيه وسفر';
  if (/تعليم|دورة|كتاب|جامعة|مدرسة/.test(t)) return 'تعليم وتطوير';
  return 'أخرى';
}

export function executeAiActions(actions) {
  if (!Array.isArray(actions) || actions.length === 0) return [];
  const executed = [];

  for (const act of actions) {
    if (!act || !act.action) continue;
    const state = getState();
    const cur = state.profile.currency || 'SAR';

    switch (act.action) {
      case 'add_transaction': {
        const type = ['expense', 'income', 'transfer'].includes(act.type) ? act.type : 'expense';
        const amount = Math.abs(Number(act.amount) || 0);
        if (amount <= 0) break;
        const accountId = findAccountIdByName(state.accounts, act.accountName);
        const toAccountId = type === 'transfer' ? findAccountIdByName(state.accounts, act.toAccountName) : null;
        const category = act.category || (type === 'income' ? 'دخل إضافي' : guessExpenseCategory(act.note));
        const tx = addTransaction({
          type,
          amount,
          category,
          accountId,
          toAccountId,
          date: act.date || todayISO(),
          note: act.note || category
        });
        if (tx) {
          const lbl = type === 'income' ? 'دخل' : type === 'transfer' ? 'تحويل' : 'مصروف';
          executed.push(`تم تسجيل ${lbl} بقيمة ${formatMoney(amount, cur)} (${category})`);
        }
        break;
      }
      case 'delete_last_transaction': {
        const latest = state.transactions[0];
        if (latest) {
          deleteTransaction(latest.id);
          executed.push(`تم حذف آخر معاملة (${latest.note || latest.category} — ${formatMoney(latest.amount, cur)})`);
        }
        break;
      }
      case 'add_account': {
        if (!act.name) break;
        addAccount({
          name: act.name,
          type: act.type || 'bank',
          balance: Number(act.balance) || 0,
          notes: act.notes || ''
        });
        executed.push(`تمت إضافة حساب "${act.name}" برصيد ${formatMoney(Number(act.balance) || 0, cur)}`);
        break;
      }
      case 'update_account_balance': {
        const accId = findAccountIdByName(state.accounts, act.accountName);
        if (accId && act.newBalance !== undefined) {
          updateAccountBalance(accId, Number(act.newBalance) || 0);
          executed.push(`تم تحديث رصيد الحساب إلى ${formatMoney(Number(act.newBalance) || 0, cur)}`);
        }
        break;
      }
      case 'set_budget': {
        const limit = Math.abs(Number(act.limit) || 0);
        if (act.category && limit > 0) {
          upsertBudget({ category: act.category, limit });
          executed.push(`تم ضبط ميزانية "${act.category}" بحد ${formatMoney(limit, cur)}`);
        }
        break;
      }
      case 'add_goal': {
        const target = Math.abs(Number(act.targetAmount) || 0);
        if (act.title && target > 0) {
          addGoal({
            title: act.title,
            targetAmount: target,
            currentAmount: Number(act.currentAmount) || 0,
            targetDate: act.targetDate || ''
          });
          executed.push(`تم إنشاء هدف "${act.title}" بقيمة ${formatMoney(target, cur)}`);
        }
        break;
      }
      case 'contribute_goal': {
        const amt = Math.abs(Number(act.amount) || 0);
        const q = String(act.goalTitle || '').toLowerCase();
        const g = state.goals.find((x) => x.title.toLowerCase().includes(q)) || state.goals[0];
        if (g && amt > 0) {
          contributeGoal(g.id, amt);
          executed.push(`تمت إضافة ${formatMoney(amt, cur)} لهدف "${g.title}"`);
        }
        break;
      }
      case 'add_debt': {
        const total = Math.abs(Number(act.totalAmount) || 0);
        if (act.person && total > 0) {
          addDebt({
            person: act.person,
            direction: act.direction === 'owed_to_me' ? 'owed_to_me' : 'owed_by_me',
            totalAmount: total,
            paidAmount: Number(act.paidAmount) || 0
          });
          executed.push(`تم تسجيل دين (${act.person}) بقيمة ${formatMoney(total, cur)}`);
        }
        break;
      }
      case 'pay_debt': {
        const amt = Math.abs(Number(act.amount) || 0);
        const q = String(act.person || '').toLowerCase();
        const d = state.debts.find((x) => x.person.toLowerCase().includes(q)) || state.debts[0];
        if (d && amt > 0) {
          recordDebtPayment(d.id, amt);
          executed.push(`تم تسجيل دفعة ${formatMoney(amt, cur)} لسجل "${d.person}"`);
        }
        break;
      }
      case 'add_recurring': {
        const amt = Math.abs(Number(act.amount) || 0);
        if (act.title && amt > 0) {
          addRecurring({
            title: act.title,
            amount: amt,
            dueDay: Number(act.dueDay) || 1,
            category: act.category || 'فواتير واتصالات',
            accountId: findAccountIdByName(state.accounts, act.accountName)
          });
          executed.push(`تمت إضافة التزام متكرر "${act.title}" (${formatMoney(amt, cur)} شهرياً)`);
        }
        break;
      }
      case 'update_profile': {
        const patch = {};
        if (act.name) patch.name = String(act.name);
        if (act.monthlyIncome !== undefined) patch.monthlyIncome = Number(act.monthlyIncome) || 0;
        if (act.currency) patch.currency = String(act.currency);
        if (act.budgetRule) patch.budgetRule = String(act.budgetRule);
        if (Object.keys(patch).length > 0) {
          updateProfile(patch);
          executed.push('تم تحديث بيانات ملفك الشخصي');
        }
        break;
      }
    }
  }
  return executed;
}

// Offline Arabic Natural-Language Command Parser (works even without Gemini key)
function tryLocalCommand(question) {
  const q = question.trim();
  const normalized = q.replace(/[٠-٩]/g, (d) => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
  const numMatch = normalized.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return null;
  const amount = Number(numMatch[1]);
  if (amount <= 0) return null;

  const isExpense = /صرفت|دفعت|اشتريت|شريت|مصروف|خصم|حاسبت|عشان/.test(normalized);
  const isIncome = /استلمت|جاني|دخل|راتب|مكافأة|مكافأه|ربحت|حول لي/.test(normalized);

  if (isExpense || isIncome) {
    const type = isIncome && !isExpense ? 'income' : 'expense';
    const cleanNote = q
      .replace(/اليوم|امس|أمس|صرفت|دفعت|اشتريت|شريت|استلمت|جاني|ريال|دولار|درهم|دينار|عشان|على|بـ|ب|في|حاسبت/g, ' ')
      .replace(/[0-9٠-٩.]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const category = type === 'income' ? (/راتب/.test(q) ? 'راتب شهري' : 'دخل إضافي') : guessExpenseCategory(q);
    const executed = executeAiActions([{
      action: 'add_transaction',
      type,
      amount,
      category,
      note: cleanNote || category,
      date: todayISO()
    }]);
    if (executed.length > 0) {
      return `أبشر، نفذت طلبك فوراً:\n• ${executed[0]}\n• الوصف: ${cleanNote || category}`;
    }
  }
  return null;
}

function answerLocally(question) {
  const localCmd = tryLocalCommand(question);
  if (localCmd) return localCmd;

  const state = getState();
  const plan = generateFinancialPlan(currentMonthKey());
  const cur = state.profile.currency || 'SAR';
  const q = question.trim();

  if (/مقارنة|الشهر الماضي|سابق|فرق/.test(q)) {
    if (plan.summary.prevMonthExpense <= 0) {
      return 'لا توجد مصاريف مسجلة في الشهر الماضي للمقارنة حتى الآن.';
    }
    const diff = plan.summary.monthExpense - plan.summary.prevMonthExpense;
    return `مقارنة الشهر الحالي بالشهر الماضي:\n• الشهر الماضي: ${formatMoney(plan.summary.prevMonthExpense, cur)}\n• هذا الشهر: ${formatMoney(plan.summary.monthExpense, cur)}\n• الفرق: ${diff >= 0 ? `زيادة بـ ${formatMoney(diff, cur)}` : `توفير بـ ${formatMoney(Math.abs(diff), cur)}`}.`;
  }

  if (/صرف|مصاريفي|تحليل|هذا الشهر/.test(q)) {
    if (plan.summary.monthTxCount === 0) {
      return `ما سجّلت أي معاملات في هذا الشهر حتى الآن يا ${state.profile.name || 'صديقي'}. جرّب تكتب لي مثلاً: "اليوم دفعت 5 ريال عشان كوفي" وبأسجلها لك فوراً.`;
    }
    const topTxt = plan.topCategory ? `• أعلى بند صرف: "${plan.topCategory.name}" (${formatMoney(plan.topCategory.amount, cur)})` : '';
    return `ملخصك الحقيقي لهذا الشهر:\n• الدخل: ${formatMoney(plan.summary.monthIncome, cur)}\n• المصاريف: ${formatMoney(plan.summary.monthExpense, cur)}\n• الصافي: ${formatMoney(plan.summary.monthNet, cur)}\n${topTxt}\n• سقف الصرف اليومي الآمن: ${formatMoney(plan.safeDailySpend, cur)}.`;
  }

  if (/خطة|ادخار|اوفر|أوفر|ميزانية/.test(q)) {
    if (plan.allocation.baseIncome <= 0) {
      return 'حدد دخلك الشهري في الإعدادات (أو قل لي مثلاً: راتبي 8000) عشان أبني لك خطة توزيع دقيقة.';
    }
    return `خطتك الشهرية حسب ${plan.allocation.ruleName}:\n• الأساسيات: ${formatMoney(plan.allocation.needs, cur)}\n• المصاريف المرنة: ${formatMoney(plan.allocation.wants, cur)}\n• الادخار والأهداف: ${formatMoney(plan.allocation.savings, cur)}.`;
  }

  if (/زكاة|زكاتي/.test(q)) {
    return `إجمالي أرصدتك الحالية: ${formatMoney(plan.summary.totalBalance, cur)}\nتقدير الزكاة (2.5% عند حولان الحول): ${formatMoney(plan.zakatEstimate, cur)}.`;
  }

  if (/يومي|أصرف يومياً|كم أقدر/.test(q)) {
    if (plan.allocation.baseIncome <= 0) return 'أضف دخلك الشهري أولاً لحساب الحد اليومي الآمن.';
    return `تقدر تصرف حتى ${formatMoney(plan.safeDailySpend, cur)} يومياً لباقي ${plan.daysLeft} يوم من الشهر.`;
  }

  return [
    `وضعك المالي الحالي يا ${state.profile.name || 'صديقي'}:`,
    `• إجمالي الأرصدة: ${formatMoney(plan.summary.totalBalance, cur)}`,
    `• مصاريف الشهر: ${formatMoney(plan.summary.monthExpense, cur)}`,
    '',
    'تقدر تأمرني مباشرة مثل: "اليوم دفعت 5 ريال عشان كوفي"، أو ترفع صورة فاتورة من أيقونة الكاميرا تحت وبأقرأها وأسجلها لك تلقائياً.'
  ].join('\n');
}

// =========================================================================
// MAIN MULTIMODAL AGENTIC ADVISOR (Text + Receipt Vision + Full App Control)
// =========================================================================
export async function askAdvisor(question, imagePayload = null) {
  const state = getState();
  const apiKey = (state.profile.geminiApiKey || '').trim();

  if (!apiKey) {
    if (imagePayload) {
      return 'لقراءة وتحليل صور الفواتير تلقائياً، فعّل مفتاح Gemini AI أولاً من البطاقة الموجودة أعلى هذه الصفحة.';
    }
    return answerLocally(question);
  }

  const plan = generateFinancialPlan(currentMonthKey());
  const contextPayload = {
    today: todayISO(),
    userName: state.profile.name,
    currency: state.profile.currency,
    monthlyIncome: plan.allocation.baseIncome,
    budgetRule: plan.allocation.ruleName,
    expenseCategories: getAllCategories('expense'),
    incomeCategories: getAllCategories('income'),
    accounts: state.accounts.map((a) => ({ name: a.name, type: a.type, balance: a.balance })),
    totalBalance: plan.summary.totalBalance,
    netWorth: plan.summary.netWorth,
    monthIncome: plan.summary.monthIncome,
    monthExpense: plan.summary.monthExpense,
    categoryBreakdown: plan.summary.byCategory,
    budgets: state.budgets.map((b) => ({ category: b.category, limit: b.limit })),
    goals: state.goals.map((g) => ({ title: g.title, current: g.currentAmount, target: g.targetAmount })),
    debts: state.debts.map((d) => ({ person: d.person, direction: d.direction, total: d.totalAmount, paid: d.paidAmount })),
    recentTransactions: state.transactions.slice(0, 8).map((t) => ({ type: t.type, amount: t.amount, category: t.category, note: t.note, date: t.date }))
  };

  const systemPrompt = `أنت المساعد الذكي كامل الصلاحيات داخل تطبيق "ميزان" لإدارة المصاريف.
لديك وصول كامل للتنفيذ المباشر داخل التطبيق! إذا طلب المستخدم تسجيل مصروف أو دخل أو تحويل أو إضافة حساب أو ميزانية أو هدف أو دين أو التزام متكرر أو حذف آخر معاملة أو تحديث دخله — أو إذا أرسل صورة فاتورة/إيصال — قم بإرجاع الأوامر في مصفوفة actions ليتم تنفيذها فوراً.

يجب أن يكون ردك JSON صالح فقط بهذا الشكل الدقيق:
{
  "reply": "رد عربي طبيعي ومختصر ومفيد يشرح للمستخدم ماذا فعلت أو يجيب عن سؤاله",
  "receipt": null أو { "merchant": "اسم المتجر/المطعم", "location": "الموقع أو الفرع إن وجد", "items": ["الأصناف"], "subtotal": 0, "discount": 0, "tax": 0, "total": 0, "date": "YYYY-MM-DD" },
  "actions": [
    // أمثلة للأوامر المتاحة (أضف فقط ما يطلبه المستخدم أو ما تستخرجه من الفاتورة):
    // { "action": "add_transaction", "type": "expense|income|transfer", "amount": 5, "category": "طعام ومقاهي", "accountName": "", "toAccountName": "", "date": "YYYY-MM-DD", "note": "كوفي" }
    // { "action": "delete_last_transaction" }
    // { "action": "add_account", "name": "الراجحي", "type": "bank|cash|card|wallet|savings", "balance": 1000 }
    // { "action": "update_account_balance", "accountName": "الراجحي", "newBalance": 1500 }
    // { "action": "set_budget", "category": "طعام ومقاهي", "limit": 800 }
    // { "action": "add_goal", "title": "سفر", "targetAmount": 5000, "currentAmount": 0, "targetDate": "" }
    // { "action": "contribute_goal", "goalTitle": "سفر", "amount": 500 }
    // { "action": "add_debt", "person": "أحمد", "direction": "owed_by_me|owed_to_me", "totalAmount": 300, "paidAmount": 0 }
    // { "action": "pay_debt", "person": "أحمد", "amount": 100 }
    // { "action": "add_recurring", "title": "إنترنت", "amount": 250, "dueDay": 1, "category": "فواتير واتصالات" }
    // { "action": "update_profile", "monthlyIncome": 10000 }
  ]
}

عند تحليل صورة فاتورة: اقرأ اسم المتجر/المطعم والموقع والأصناف والسعر قبل الخصم وقيمة الخصم والضريبة والمبلغ النهائي المدفوع بدقة، وضع تفاصيلها في receipt وملخص واضح في reply، وسجّل المبلغ النهائي المدفوع في actions عبر add_transaction مع اختيار أنسب فئة من expenseCategories.
بيانات المستخدم الحقيقية الحالية (لا تخترع أرقاماً غيرها):
${JSON.stringify(contextPayload)}`;

  const userParts = [{ text: question || 'حلل هذه الفاتورة بالكامل (المتجر، الموقع، الأصناف، السعر قبل الخصم، الخصم، الضريبة، الإجمالي النهائي) وسجّلها في مصاريفي.' }];
  if (imagePayload?.base64) {
    userParts.push({
      inline_data: {
        mime_type: imagePayload.mimeType || 'image/jpeg',
        data: imagePayload.base64
      }
    });
  }

  const recentHistory = state.aiChat.slice(-6).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.text }]
  }));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [...recentHistory, { role: 'user', parts: userParts }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawText) return answerLocally(question);

    let parsed = null;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return rawText.trim();
    }

    const executed = executeAiActions(parsed.actions || []);
    const lines = [];

    if (parsed.receipt && typeof parsed.receipt === 'object') {
      const r = parsed.receipt;
      const cur = state.profile.currency || 'SAR';
      lines.push(`تفاصيل الفاتورة المقروءة:`);
      if (r.merchant) lines.push(`• المتجر/المطعم: ${r.merchant}${r.location ? ` (${r.location})` : ''}`);
      if (Array.isArray(r.items) && r.items.length) lines.push(`• المشتريات: ${r.items.slice(0, 6).join('، ')}`);
      if (r.subtotal) lines.push(`• السعر قبل الخصم: ${formatMoney(r.subtotal, cur)}`);
      if (r.discount) lines.push(`• الخصم: ${formatMoney(r.discount, cur)}`);
      if (r.tax) lines.push(`• الضريبة: ${formatMoney(r.tax, cur)}`);
      if (r.total) lines.push(`• الإجمالي المدفوع: ${formatMoney(r.total, cur)}`);
      lines.push('');
    }

    if (parsed.reply) lines.push(parsed.reply.trim());

    if (executed.length > 0) {
      lines.push('');
      lines.push('التنفيذ التلقائي في التطبيق:');
      executed.forEach((item) => lines.push(`✓ ${item}`));
    }

    return lines.join('\n').trim();
  } catch {
    if (imagePayload) {
      return 'تعذر تحليل صورة الفاتورة حالياً عبر Gemini. تأكد من الاتصال بالإنترنت وصحة مفتاح Gemini في الإعدادات.';
    }
    return `${answerLocally(question)}\n\n(ملاحظة: تم استخدام المحرك المحلي لتعذر الاتصال بـ Gemini حالياً).`;
  }
}
