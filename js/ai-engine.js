// Dual Smart Financial Intelligence Engine
// 1) Local real-time deterministic analysis & planning (works offline, strictly real user data)
// 2) Optional live Gemini API advisor chat (user's own key stored locally on device)

import { getState, getFinancialSummary } from './store.js';
import { formatMoney, currentMonthKey } from './utils.js';

const RULES = {
  '50_30_20': { name: 'قاعدة 50 / 30 / 20 المتوازنة', needs: 0.50, wants: 0.30, savings: 0.20 },
  '60_20_20': { name: 'قاعدة 60 / 20 / 20 للاستقرار', needs: 0.60, wants: 0.20, savings: 0.20 },
  '70_20_10': { name: 'قاعدة 70 / 10 / 20 للالتزامات العالية', needs: 0.70, wants: 0.10, savings: 0.20 },
  'custom':   { name: 'توزيع مرن مخصص للادخار المكثف (50/20/30)', needs: 0.50, wants: 0.20, savings: 0.30 }
};

export function generateFinancialPlan() {
  const state = getState();
  const { profile, accounts, transactions, budgets, goals } = state;
  const summary = getFinancialSummary(currentMonthKey());
  const cur = profile.currency || 'SAR';

  const baseIncome = summary.monthIncome > 0 ? summary.monthIncome : (Number(profile.monthlyIncome) || 0);
  const rule = RULES[profile.budgetRule] || RULES['50_30_20'];

  const hasData = accounts.length > 0 || transactions.length > 0 || baseIncome > 0;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);

  const allocation = {
    ruleName: rule.name,
    baseIncome,
    needs: Math.round(baseIncome * rule.needs),
    wants: Math.round(baseIncome * rule.wants),
    savings: Math.round(baseIncome * rule.savings)
  };

  const plannedSpendCeiling = allocation.needs + allocation.wants;
  const remainingBudget = Math.max(0, plannedSpendCeiling - summary.monthExpense);
  const safeDailySpend = baseIncome > 0 ? Math.round(remainingBudget / daysLeft) : 0;

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
      body: 'أضف حساباتك الحالية وأول معاملاتك، وسيقوم المحلل الذكي تلقائياً بحساب سقف الصرف اليومي وتقييم صحتك المالية.'
    });
  } else {
    if (baseIncome > 0) {
      insights.push({
        level: 'accent',
        title: `سقف الصرف اليومي الآمن: ${formatMoney(safeDailySpend, cur)}`,
        body: `بناءً على دخلك (${formatMoney(baseIncome, cur)}) ومصاريفك المسجلة هذا الشهر (${formatMoney(summary.monthExpense, cur)})، هذا هو الحد اليومي الآمن لباقي ${daysLeft} يوم في الشهر لتحقيق هدف الادخار.`
      });
    }

    if (topCategory && summary.monthExpense > 0) {
      const share = Math.round((topCategory.amount / summary.monthExpense) * 100);
      insights.push({
        level: share >= 40 ? 'warning' : 'info',
        title: `أعلى بند صرف هذا الشهر: ${topCategory.name} (${share}%)`,
        body: `صرفت ${formatMoney(topCategory.amount, cur)} على "${topCategory.name}". ${share >= 40 ? 'يستحوذ هذا البند على نسبة كبيرة من مصاريفك — يُنصح بوضع ميزانية شهرية مخصصة له.' : 'توزيع جيد، استمر بمراقبته أسبوعياً.'}`
      });
    }

    if (overBudgets.length > 0) {
      const names = overBudgets.map((b) => `${b.category} (${Math.round((b.spent / b.limit) * 100)}%)`).join('، ');
      insights.push({
        level: 'danger',
        title: 'تنبيه اقتراب أو تجاوز الميزانية',
        body: `الفئات التالية وصلت لحد التنبيه هذا الشهر: ${names}.`
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
          ? 'سيولتك الحالية تغطي صندوق الطوارئ لـ 3 أشهر — وضع ممتاز ومستقر.'
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

function answerLocally(question) {
  const state = getState();
  const plan = generateFinancialPlan();
  const cur = state.profile.currency || 'SAR';
  const q = question.trim();

  if (/صرف|مصاريفي|تحليل|هذا الشهر/.test(q)) {
    if (plan.summary.monthTxCount === 0) {
      return `ما سجّلت أي معاملات في هذا الشهر حتى الآن يا ${state.profile.name || 'صديقي'}. أضف أول مصروف أو دخل من زر "+ معاملة جديدة" وسأحلل لك أرقامك الحقيقية فوراً.`;
    }
    const topTxt = plan.topCategory
      ? `أعلى بند صرف عندك هو "${plan.topCategory.name}" بقيمة ${formatMoney(plan.topCategory.amount, cur)}.`
      : '';
    return `ملخصك الحقيقي لهذا الشهر:\n• إجمالي الدخل المسجل: ${formatMoney(plan.summary.monthIncome, cur)}\n• إجمالي المصاريف: ${formatMoney(plan.summary.monthExpense, cur)}\n• الصافي: ${formatMoney(plan.summary.monthNet, cur)}\n${topTxt}\n• سقف الصرف اليومي الآمن لباقي ${plan.daysLeft} يوم: ${formatMoney(plan.safeDailySpend, cur)}.`;
  }

  if (/خطة|ادخار|اوفر|أوفر|ميزانية/.test(q)) {
    if (plan.allocation.baseIncome <= 0) {
      return 'حدد دخلك الشهري في صفحة الإعدادات (أو سجّل أول دخل لك) عشان أبني لك خطة توزيع دقيقة بأرقامك.';
    }
    return `بناءً على دخلك (${formatMoney(plan.allocation.baseIncome, cur)}) وأسلوب "${plan.allocation.ruleName}":\n• الاحتياجات الأساسية: ${formatMoney(plan.allocation.needs, cur)}\n• المصاريف المرنة والترفيه: ${formatMoney(plan.allocation.wants, cur)}\n• الادخار والأهداف: ${formatMoney(plan.allocation.savings, cur)}\n\nنصيحة عملية: حوّل مبلغ الادخار فور نزول الراتب لحساب ادخار مستقل قبل ما تبدأ الصرف.`;
  }

  if (/ديون|دين|سداد/.test(q)) {
    if (plan.summary.owedByMe <= 0 && plan.summary.owedToMe <= 0) {
      return 'سجل الديون عندك نظيف حالياً (ما فيه ديون مسجلة عليك أو لك). إذا عندك التزامات ودّك ترتب سدادها، أضفها من صفحة "الأهداف والديون".';
    }
    return `وضع الديون المسجل عندك:\n• إجمالي الديون اللي عليك: ${formatMoney(plan.summary.owedByMe, cur)}\n• إجمالي المبالغ اللي لك عند الغير: ${formatMoney(plan.summary.owedToMe, cur)}\n\nأفضل استراتيجية عملية: ابدأ بسداد أصغر دين بالكامل لإغلاقه سريعاً (أسلوب كرة الثلج) أو ركّز على الدين الأعلى أولوية بمبلغ شهري ثابت.`;
  }

  if (/زكاة|زكاتي/.test(q)) {
    return `إجمالي أرصدتك الحالية المسجلة هو ${formatMoney(plan.summary.totalBalance, cur)}.\nتقدير الزكاة (2.5% في حال بلوغ النصاب وحولان الحول): ${formatMoney(plan.zakatEstimate, cur)}.`;
  }

  if (/يومي|أصرف يومياً|كم أقدر/.test(q)) {
    if (plan.allocation.baseIncome <= 0) {
      return 'أضف دخلك الشهري أولاً من الإعدادات لحساب الحد اليومي الآمن بدقة.';
    }
    return `تقدر تصرف حتى ${formatMoney(plan.safeDailySpend, cur)} يومياً خلال الـ ${plan.daysLeft} يوم المتبقية من الشهر، مع الحفاظ على هدف الادخار الشهري (${formatMoney(plan.allocation.savings, cur)}).`;
  }

  const lines = [
    `هذا وضعك المالي الحالي يا ${state.profile.name || 'صديقي'}:`,
    `• إجمالي أرصدة الحسابات: ${formatMoney(plan.summary.totalBalance, cur)}`,
    `• مصاريف الشهر الحالي: ${formatMoney(plan.summary.monthExpense, cur)}`,
    plan.allocation.baseIncome > 0 ? `• هدف الادخار الشهري المقترح: ${formatMoney(plan.allocation.savings, cur)}` : null,
    plan.score !== null ? `• مؤشر الصحة المالية: ${plan.score} من 100` : null,
    '',
    'تقدر تسألني عن: "تحليل مصاريفي هذا الشهر"، "خطة ادخار"، "كم أقدر أصرف يومياً؟"، أو "حساب الزكاة". ولإجابات محادثة مفتوحة أعمق، تقدر تربط مفتاح Gemini API مجاناً من الإعدادات.'
  ].filter((x) => x !== null);
  return lines.join('\n');
}

export async function askAdvisor(question) {
  const state = getState();
  const apiKey = (state.profile.geminiApiKey || '').trim();

  if (!apiKey) {
    return answerLocally(question);
  }

  const plan = generateFinancialPlan();
  const contextPayload = {
    userName: state.profile.name,
    currency: state.profile.currency,
    monthlyIncome: plan.allocation.baseIncome,
    goal: state.profile.financialGoal,
    budgetRule: plan.allocation.ruleName,
    accountsCount: state.accounts.length,
    totalBalance: plan.summary.totalBalance,
    netWorth: plan.summary.netWorth,
    monthIncome: plan.summary.monthIncome,
    monthExpense: plan.summary.monthExpense,
    topExpenseCategory: plan.topCategory,
    categoryBreakdown: plan.summary.byCategory,
    owedByMe: plan.summary.owedByMe,
    owedToMe: plan.summary.owedToMe,
    monthlyRecurringTotal: plan.summary.monthlyRecurringTotal,
    safeDailySpend: plan.safeDailySpend,
    daysLeftInMonth: plan.daysLeft,
    goals: state.goals.map((g) => ({ title: g.title, current: g.currentAmount, target: g.targetAmount }))
  };

  const systemPrompt = `أنت مستشار مالي شخصي ذكي داخل تطبيق "ميزان". أجب بالعربية الواضحة والمختصرة والعملية (بلهجة مهذبة وطبيعية بدون مبالغة أو حشو). اعتمد حصرياً على أرقام المستخدم الحقيقية التالية ولا تخترع أي أرقام غير موجودة:\n${JSON.stringify(contextPayload)}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nسؤال المستخدم: ${question}` }] }
          ]
        })
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (reply) return reply.trim();
    return answerLocally(question);
  } catch {
    return `${answerLocally(question)}\n\n(ملاحظة: تعذر الاتصال بمفتاح Gemini API حالياً، فتم التحليل بالمحرك الذكي المحلي داخل جهازك).`;
  }
}
