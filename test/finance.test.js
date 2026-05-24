const test = require('node:test');
const assert = require('node:assert/strict');
const finance = require('../public/assets/js/finance');

const may2026 = [
  { description: 'Ifood', amount: 59.90, type: 'expense', category: 'Alimentação', date: '2026-05-22' },
  { description: 'Salário', amount: 2500, type: 'income', category: 'Salário', date: '2026-05-13' },
  { description: 'CDB Banco Inter', amount: 500, type: 'investment', category: 'Investimentos', date: '2026-05-06' },
  { description: 'Uber', amount: 30, type: 'expense', category: 'Transporte', date: '2026-05-10' },
  { description: 'Teste', amount: 10.89, type: 'expense', category: 'Alimentação', date: '2026-05-10' }
];

test('summarizes May 2026 transactions with investment as cash outflow', () => {
  const summary = finance.summarizeMonth(may2026, new Date(2026, 4, 1));

  assert.equal(summary.income, 2500);
  assert.equal(summary.expense, 100.79);
  assert.equal(summary.investment, 500);
  assert.equal(summary.economy, 2399.21);
  assert.equal(summary.netCashFlow, 1899.21);
  assert.equal(Number(summary.savingsRate.toFixed(2)), 95.97);
});

test('computes available balance and financial position consistently', () => {
  const position = finance.computeFinancialPosition(may2026, new Date(2026, 4, 1));

  assert.equal(position.availableBalance, 1899.21);
  assert.equal(position.investedBalance, 500);
  assert.equal(position.netWorth, 2399.21);
});

test('groups all monthly expenses by category, including same-day transactions', () => {
  const categories = finance.groupExpenseByCategory(may2026, new Date(2026, 4, 1));

  assert.equal(categories.Alimentação, 70.79);
  assert.equal(categories.Transporte, 30);
  assert.deepEqual(finance.getTopCategory(categories), { category: 'Alimentação', amount: 70.79 });
});

test('does not mix pending subscriptions into realized expense categories', () => {
  const categories = finance.groupExpenseByCategory(may2026, new Date(2026, 4, 1), [
    { name: 'Netflix', amount: 55.9, category: 'Assinaturas', active: true }
  ]);

  assert.equal(categories.Assinaturas, undefined);
});

test('tracks subscription payment and pending status by period', () => {
  const subscriptions = [
    {
      id: 'sub_1',
      amount: 55.9,
      dueDay: 10,
      active: true,
      payments: [{ periodMonth: '2026-05', paidAt: '2026-05-12', transactionId: 'tx_1' }]
    },
    { id: 'sub_2', amount: 19.9, dueDay: 5, active: true, payments: [] }
  ];

  assert.equal(finance.isSubscriptionPaid(subscriptions[0], '2026-05'), true);
  assert.equal(finance.getSubscriptionPayment(subscriptions[0], '2026-05').transactionId, 'tx_1');
  assert.deepEqual(finance.getPendingSubscriptions(subscriptions, '2026-05').map((item) => item.id), ['sub_2']);
  assert.equal(finance.getSubscriptionStatus(subscriptions[1], '2026-05', '2026-05-24'), 'overdue');
  assert.equal(finance.getSubscriptionDueDate({ dueDay: 31 }, '2026-02'), '2026-02-28');
});

test('uses cents-safe arithmetic for decimal money', () => {
  assert.equal(finance.addMoney(59.90, 10.89), 70.79);
  assert.equal(finance.subtractMoney(2500, 100.79, 500), 1899.21);
});
