(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.ObsydFinance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const TYPES = Object.freeze({
    INCOME: 'income',
    EXPENSE: 'expense',
    INVESTMENT: 'investment'
  });

  function toCents(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.round(numeric * 100);
  }

  function fromCents(value) {
    return Math.round(Number(value || 0)) / 100;
  }

  function addMoney(...values) {
    return fromCents(values.reduce((sum, value) => sum + toCents(value), 0));
  }

  function subtractMoney(start, ...values) {
    return fromCents(values.reduce((sum, value) => sum - toCents(value), toCents(start)));
  }

  function parseDateParts(value) {
    const [year, month, day] = String(value || '').slice(0, 10).split('-').map(Number);
    return {
      year: Number.isFinite(year) ? year : 0,
      month: Number.isFinite(month) ? month : 0,
      day: Number.isFinite(day) ? day : 0
    };
  }

  function monthKeyFromDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  function normalizeTransaction(tx) {
    const type = Object.values(TYPES).includes(tx?.type) ? tx.type : TYPES.EXPENSE;
    return {
      ...tx,
      type,
      amount: Math.max(0, fromCents(toCents(tx?.amount))),
      category: String(tx?.category || 'Outros').trim() || 'Outros',
      date: String(tx?.date || '').slice(0, 10)
    };
  }

  function getMonthTransactions(transactions, baseDate) {
    const monthKey = typeof baseDate === 'string' && /^\d{4}-\d{2}$/.test(baseDate)
      ? baseDate
      : monthKeyFromDate(baseDate instanceof Date ? baseDate : new Date());

    return (Array.isArray(transactions) ? transactions : [])
      .map(normalizeTransaction)
      .filter((tx) => tx.date.slice(0, 7) === monthKey);
  }

  function summarizeTransactions(transactions) {
    const totals = {
      income: 0,
      expense: 0,
      investment: 0
    };

    (Array.isArray(transactions) ? transactions : []).forEach((item) => {
      const tx = normalizeTransaction(item);
      totals[tx.type] = addMoney(totals[tx.type], tx.amount);
    });

    const economy = subtractMoney(totals.income, totals.expense);
    const netCashFlow = subtractMoney(totals.income, totals.expense, totals.investment);

    return {
      ...totals,
      economy,
      netCashFlow,
      savingsRate: totals.income > 0 ? Math.max(0, (economy / totals.income) * 100) : 0
    };
  }

  function summarizeMonth(transactions, baseDate) {
    return summarizeTransactions(getMonthTransactions(transactions, baseDate));
  }

  function computeAvailableBalance(transactions) {
    return summarizeTransactions(transactions).netCashFlow;
  }

  function computeInvestedBalance(transactions) {
    return summarizeTransactions(transactions).investment;
  }

  function computeFinancialPosition(transactions, baseDate) {
    const monthly = summarizeMonth(transactions, baseDate);
    const availableBalance = computeAvailableBalance(transactions);
    const investedBalance = computeInvestedBalance(transactions);

    return {
      monthly,
      availableBalance,
      investedBalance,
      netWorth: addMoney(availableBalance, investedBalance)
    };
  }

  function groupExpenseByCategory(transactions, baseDate) {
    const categories = {};

    getMonthTransactions(transactions, baseDate).forEach((tx) => {
      if (tx.type === TYPES.EXPENSE) {
        categories[tx.category] = addMoney(categories[tx.category] || 0, tx.amount);
      }
    });

    return categories;
  }

  function isSubscriptionPaid(subscription, periodMonth) {
    return Boolean(getSubscriptionPayment(subscription, periodMonth));
  }

  function getSubscriptionPayment(subscription, periodMonth) {
    return (Array.isArray(subscription?.payments) ? subscription.payments : [])
      .find((payment) => payment.periodMonth === periodMonth) || null;
  }

  function getPendingSubscriptions(subscriptions, periodMonth) {
    return (Array.isArray(subscriptions) ? subscriptions : [])
      .filter((subscription) => subscription?.active !== false && !isSubscriptionPaid(subscription, periodMonth));
  }

  function getSubscriptionDueDate(subscription, periodMonth) {
    const [year, month] = String(periodMonth || '').split('-').map(Number);
    if (!year || !month) return '';
    const lastDay = new Date(year, month, 0).getDate();
    const dueDay = Math.max(1, Math.min(lastDay, Number(subscription?.dueDay || 1)));
    return `${year}-${String(month).padStart(2, '0')}-${String(dueDay).padStart(2, '0')}`;
  }

  function getSubscriptionStatus(subscription, periodMonth, todayIso) {
    if (subscription?.active === false) return 'paused';
    const payment = getSubscriptionPayment(subscription, periodMonth);
    if (payment) return 'paid';
    const dueDate = getSubscriptionDueDate(subscription, periodMonth);
    return dueDate && String(todayIso || '').slice(0, 10) > dueDate ? 'overdue' : 'pending';
  }

  function getTopCategory(categoryMap) {
    const entries = Object.entries(categoryMap || {}).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return null;
    return { category: entries[0][0], amount: entries[0][1] };
  }

  function daysInMonth(baseDate) {
    const date = baseDate instanceof Date ? baseDate : new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  function computeRunway(availableBalance, monthlyExpense) {
    if (monthlyExpense <= 0) return null;
    return Math.max(0, availableBalance / monthlyExpense);
  }

  function compareMonths(transactions, currentDate) {
    const current = currentDate instanceof Date ? currentDate : new Date();
    const previous = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    const currentSummary = summarizeMonth(transactions, current);
    const previousSummary = summarizeMonth(transactions, previous);

    return {
      current: currentSummary,
      previous: previousSummary,
      delta: {
        income: subtractMoney(currentSummary.income, previousSummary.income),
        expense: subtractMoney(currentSummary.expense, previousSummary.expense),
        investment: subtractMoney(currentSummary.investment, previousSummary.investment),
        netCashFlow: subtractMoney(currentSummary.netCashFlow, previousSummary.netCashFlow)
      }
    };
  }

  return {
    TYPES,
    toCents,
    fromCents,
    addMoney,
    subtractMoney,
    parseDateParts,
    monthKeyFromDate,
    normalizeTransaction,
    getMonthTransactions,
    summarizeTransactions,
    summarizeMonth,
    computeAvailableBalance,
    computeInvestedBalance,
    computeFinancialPosition,
    groupExpenseByCategory,
    isSubscriptionPaid,
    getSubscriptionPayment,
    getPendingSubscriptions,
    getSubscriptionDueDate,
    getSubscriptionStatus,
    getTopCategory,
    daysInMonth,
    computeRunway,
    compareMonths
  };
});
