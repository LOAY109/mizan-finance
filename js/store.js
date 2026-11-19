// LocalStorage State Store — STRICTLY ZERO DEMO / SAMPLE DATA

import { uid, currentMonthKey } from './utils.js';

const STORAGE_KEY = 'mizan_finance_state_v1';

export function createCleanState() {
  return {
    version: 1,
    profile: {
      onboarded: false,
      name: '',
      currency: 'SAR',
      monthlyIncome: 0,
      incomeType: 'fixed',
      payday: 27,
      financialGoal: 'save',
      budgetRule: '50_30_20',
      theme: 'light',
      geminiApiKey: ''
    },
    accounts: [],
    transactions: [],
    budgets: [],
    recurring: [],
    goals: [],
    debts: [],
    aiChat: []
  };
}

let state = loadState();
const listeners = new Set();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createCleanState();
    const parsed = JSON.parse(raw);
    const base = createCleanState();
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...(parsed.profile || {}) },
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      budgets: Array.isArray(parsed.budgets) ? parsed.budgets : [],
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
      debts: Array.isArray(parsed.debts) ? parsed.debts : [],
      aiChat: Array.isArray(parsed.aiChat) ? parsed.aiChat : []
    };
  } catch {
    return createCleanState();
  }
}

function saveAndNotify() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Storage quota exceeded:', err);
  }
  listeners.forEach((fn) => fn(state));
}

export function getState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function updateProfile(patch) {
  state.profile = { ...state.profile, ...patch };
  saveAndNotify();
}

export function addAccount({ name, type, balance, notes = '' }) {
  const acc = {
    id: uid('acc'),
    name: name.trim(),
    type: type || 'bank',
    balance: Number(balance) || 0,
    notes: notes.trim(),
    createdAt: new Date().toISOString()
  };
  state.accounts.push(acc);
  saveAndNotify();
  return acc;
}

export function updateAccountBalance(id, newBalance) {
  const acc = state.accounts.find((a) => a.id === id);
  if (!acc) return;
  acc.balance = Number(newBalance) || 0;
  saveAndNotify();
}

export function deleteAccount(id) {
  state.accounts = state.accounts.filter((a) => a.id !== id);
  saveAndNotify();
}

export function addTransaction({ type, amount, category, accountId, toAccountId = null, date, note = '' }) {
  const amt = Math.abs(Number(amount) || 0);
  if (amt <= 0) return null;

  const tx = {
    id: uid('tx'),
    type,
    amount: amt,
    category: type === 'transfer' ? 'تحويل بين الحسابات' : (category || 'أخرى'),
    accountId: accountId || '',
    toAccountId: type === 'transfer' ? (toAccountId || '') : null,
    date,
    note: note.trim(),
    createdAt: new Date().toISOString()
  };

  const src = state.accounts.find((a) => a.id === tx.accountId);
  if (src) {
    if (tx.type === 'income') src.balance += amt;
    if (tx.type === 'expense') src.balance -= amt;
    if (tx.type === 'transfer') {
      src.balance -= amt;
      const dst = state.accounts.find((a) => a.id === tx.toAccountId);
      if (dst) dst.balance += amt;
    }
  }

  state.transactions.unshift(tx);
  saveAndNotify();
  return tx;
}

export function deleteTransaction(id) {
  const idx = state.transactions.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const tx = state.transactions[idx];

  const src = state.accounts.find((a) => a.id === tx.accountId);
  if (src) {
    if (tx.type === 'income') src.balance -= tx.amount;
    if (tx.type === 'expense') src.balance += tx.amount;
    if (tx.type === 'transfer') {
      src.balance += tx.amount;
      const dst = state.accounts.find((a) => a.id === tx.toAccountId);
      if (dst) dst.balance -= tx.amount;
    }
  }

  state.transactions.splice(idx, 1);
  saveAndNotify();
}

export function upsertBudget({ category, limit }) {
  const amt = Math.abs(Number(limit) || 0);
  if (!category || amt <= 0) return;
  const existing = state.budgets.find((b) => b.category === category);
  if (existing) {
    existing.limit = amt;
  } else {
    state.budgets.push({ id: uid('bud'), category, limit: amt });
  }
  saveAndNotify();
}

export function deleteBudget(id) {
  state.budgets = state.budgets.filter((b) => b.id !== id);
  saveAndNotify();
}

export function addRecurring({ title, amount, category, accountId, dueDay }) {
  state.recurring.push({
    id: uid('rec'),
    title: title.trim(),
    amount: Math.abs(Number(amount) || 0),
    category: category || 'فواتير واتصالات',
    accountId: accountId || '',
    dueDay: Math.min(31, Math.max(1, Number(dueDay) || 1)),
    lastPaidMonth: ''
  });
  saveAndNotify();
}

export function payRecurringNow(id, todayDate) {
  const item = state.recurring.find((r) => r.id === id);
  if (!item) return;
  item.lastPaidMonth = currentMonthKey();
  addTransaction({
    type: 'expense',
    amount: item.amount,
    category: item.category,
    accountId: item.accountId,
    date: todayDate,
    note: `سداد التزام متكرر: ${item.title}`
  });
}

export function deleteRecurring(id) {
  state.recurring = state.recurring.filter((r) => r.id !== id);
  saveAndNotify();
}

export function addGoal({ title, targetAmount, currentAmount = 0, targetDate = '' }) {
  state.goals.push({
    id: uid('goal'),
    title: title.trim(),
    targetAmount: Math.abs(Number(targetAmount) || 0),
    currentAmount: Math.max(0, Number(currentAmount) || 0),
    targetDate: targetDate || ''
  });
  saveAndNotify();
}

export function contributeGoal(id, amount) {
  const g = state.goals.find((x) => x.id === id);
  if (!g) return;
  g.currentAmount = Math.max(0, g.currentAmount + (Number(amount) || 0));
  saveAndNotify();
}

export function deleteGoal(id) {
  state.goals = state.goals.filter((g) => g.id !== id);
  saveAndNotify();
}

export function addDebt({ person, direction, totalAmount, paidAmount = 0, dueDate = '', note = '' }) {
  state.debts.push({
    id: uid('debt'),
    person: person.trim(),
    direction: direction === 'owed_to_me' ? 'owed_to_me' : 'owed_by_me',
    totalAmount: Math.abs(Number(totalAmount) || 0),
    paidAmount: Math.max(0, Number(paidAmount) || 0),
    dueDate,
    note: note.trim()
  });
  saveAndNotify();
}

export function recordDebtPayment(id, amount) {
  const d = state.debts.find((x) => x.id === id);
  if (!d) return;
  d.paidAmount = Math.min(d.totalAmount, d.paidAmount + Math.abs(Number(amount) || 0));
  saveAndNotify();
}

export function deleteDebt(id) {
  state.debts = state.debts.filter((d) => d.id !== id);
  saveAndNotify();
}

export function appendChatMessage(role, text) {
  state.aiChat.push({
    id: uid('msg'),
    role,
    text,
    ts: new Date().toISOString()
  });
  if (state.aiChat.length > 40) state.aiChat = state.aiChat.slice(-40);
  saveAndNotify();
}

export function clearChatHistory() {
  state.aiChat = [];
  saveAndNotify();
}

export function exportBackupJSON() {
  return JSON.stringify(state, null, 2);
}

export function importBackupJSON(jsonString) {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object' || !parsed.profile) {
    throw new Error('ملف النسخة الاحتياطية غير صالح');
  }
  const base = createCleanState();
  state = {
    ...base,
    ...parsed,
    profile: { ...base.profile, ...(parsed.profile || {}) }
  };
  saveAndNotify();
}

export function resetAllData() {
  state = createCleanState();
  localStorage.removeItem(STORAGE_KEY);
  listeners.forEach((fn) => fn(state));
}

export function getFinancialSummary(monthKey = currentMonthKey()) {
  const totalBalance = state.accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0);
  const monthTxs = state.transactions.filter((t) => (t.date || '').startsWith(monthKey));

  const monthIncome = monthTxs
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTxs
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0);

  const byCategory = {};
  monthTxs
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

  const owedByMe = state.debts
    .filter((d) => d.direction === 'owed_by_me')
    .reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0);
  const owedToMe = state.debts
    .filter((d) => d.direction === 'owed_to_me')
    .reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0);

  const netWorth = totalBalance + owedToMe - owedByMe;
  const monthlyRecurringTotal = state.recurring.reduce((s, r) => s + r.amount, 0);

  return {
    totalBalance,
    netWorth,
    monthIncome,
    monthExpense,
    monthNet: monthIncome - monthExpense,
    monthTxCount: monthTxs.length,
    byCategory,
    owedByMe,
    owedToMe,
    monthlyRecurringTotal
  };
}
