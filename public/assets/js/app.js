const API_BASE = '';
const BRAND_NAME = 'Obsyd';
const finance = window.ObsydFinance;

const app = document.getElementById('app');

const routes = [
  { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { key: 'transactions', label: 'Transações', icon: 'arrow-right-left' },
  { key: 'investments', label: 'Cofrinhos', icon: 'piggy-bank' },
  { key: 'accounts', label: 'Contas', icon: 'landmark' },
  { key: 'budgets', label: 'Categorias', icon: 'tags' },
  { key: 'reports', label: 'Relatórios', icon: 'chart-no-axes-combined' },
  { key: 'backup', label: 'Configurações', icon: 'settings' },
  { key: 'goals', label: 'Meta principal', icon: 'target' },
  { key: 'calendar', label: 'Calendário', icon: 'calendar-days' },
  { key: 'subscriptions', label: 'Assinaturas', icon: 'repeat-2' },
  { key: 'calculator', label: 'Juros Compostos', icon: 'calculator' },
  { key: 'alerts', label: 'Alertas', icon: 'bell-ring' },
];

const primaryNavKeys = ['dashboard', 'transactions', 'investments', 'accounts', 'budgets', 'reports', 'backup'];
const secondaryNavKeys = ['goals', 'calendar', 'subscriptions', 'calculator', 'alerts'];

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const designColors = {
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  grid: 'rgba(148, 163, 184, 0.10)',
  border: 'rgba(148, 163, 184, 0.16)',
  accent: '#8b7cf6',
  accentSoft: 'rgba(139, 124, 246, 0.14)',
  success: '#34d399',
  successSoft: 'rgba(52, 211, 153, 0.12)',
  danger: '#fb7185',
  dangerSoft: 'rgba(251, 113, 133, 0.12)',
  warning: '#fbbf24',
  warningSoft: 'rgba(251, 191, 36, 0.12)',
  info: '#38bdf8',
  infoSoft: 'rgba(56, 189, 248, 0.12)'
};

const accountTypeOptions = [
  ['checking_account', 'Conta corrente'],
  ['savings_account', 'Conta poupança'],
  ['credit_card', 'Cartão de crédito'],
  ['debit_card', 'Cartão de débito'],
  ['cash', 'Dinheiro físico'],
  ['digital_wallet', 'Carteira digital'],
  ['investment_account', 'Investimentos'],
  ['prepaid_card', 'Cartão pré-pago'],
  ['benefits_card', 'Cartão benefícios'],
  ['other', 'Outro']
];

const cardBrandOptions = [
  ['', 'Sem bandeira'],
  ['Visa', 'Visa'],
  ['Mastercard', 'Mastercard'],
  ['Elo', 'Elo'],
  ['Amex', 'Amex'],
  ['Hipercard', 'Hipercard'],
  ['Outra', 'Outra']
];

const domainIcons = Object.freeze({
  dashboard: 'layout-dashboard',
  transactions: 'arrow-right-left',
  accounts: 'wallet-cards',
  goals: 'piggy-bank',
  calculator: 'calculator',
  calendar: 'calendar-days',
  budgets: 'wallet-cards',
  subscriptions: 'repeat-2',
  reports: 'chart-no-axes-combined',
  alerts: 'bell-ring',
  backup: 'database-backup',
  pix: 'qr-code',
  credit: 'credit-card',
  debit: 'badge-dollar-sign',
  cash: 'banknote',
  boleto: 'barcode',
  transfer: 'landmark',
  wallet: 'wallet-cards',
  investment: 'chart-no-axes-combined'
});

const quickAccountPresets = [
  { label: 'Nubank Conta', institutionSlug: 'nubank', type: 'checking_account', methods: ['pix', 'debit_card', 'bank_transfer', 'boleto', 'auto_debit'] },
  { label: 'Nubank Crédito', institutionSlug: 'nubank', type: 'credit_card', methods: ['credit_card'] },
  { label: 'Banco Inter Conta', institutionSlug: 'banco-inter', type: 'checking_account', methods: ['pix', 'debit_card', 'bank_transfer', 'boleto', 'auto_debit'] },
  { label: 'Banco Inter Crédito', institutionSlug: 'banco-inter', type: 'credit_card', methods: ['credit_card'] },
  { label: 'Itaú Conta', institutionSlug: 'itau', type: 'checking_account', methods: ['pix', 'debit_card', 'bank_transfer', 'boleto', 'auto_debit'] },
  { label: 'Itaú Crédito', institutionSlug: 'itau', type: 'credit_card', methods: ['credit_card'] },
  { label: 'Santander Conta', institutionSlug: 'santander', type: 'checking_account', methods: ['pix', 'debit_card', 'bank_transfer', 'boleto', 'auto_debit'] },
  { label: 'Santander Crédito', institutionSlug: 'santander', type: 'credit_card', methods: ['credit_card'] },
  { label: 'Mercado Pago', institutionSlug: 'mercado-pago', type: 'digital_wallet', methods: ['pix', 'digital_wallet', 'debit_card', 'credit_card'] },
  { label: 'PicPay', institutionSlug: 'picpay', type: 'digital_wallet', methods: ['pix', 'digital_wallet', 'debit_card', 'credit_card'] },
  { label: 'C6 Bank Conta', institutionSlug: 'c6-bank', type: 'checking_account', methods: ['pix', 'debit_card', 'bank_transfer', 'boleto', 'auto_debit'] },
  { label: 'BTG Investimentos', institutionSlug: 'btg-pactual', type: 'investment_account', methods: ['bank_transfer', 'ted_doc'] },
  { label: 'Dinheiro físico', institutionSlug: 'dinheiro-fisico', type: 'cash', methods: ['cash'] }
];

let state = getDefaultState();
let auth = createEmptyAuth();
let isBooting = true;
let syncTimer = null;
let syncInFlight = false;
let pendingSync = false;
let ui = {
  sidebarOpen: false,
  calendarDate: new Date(),
  selectedCalendarDate: null,
  authMode: 'login',
  toast: null,
  viewState: {}
};
let charts = {
  dashboard: null,
  dashboardAllocation: null,
  investmentAllocation: null,
  reportCategory: null,
  reportBalance: null,
  reportIncomeExpense: null,
  reportInvestment: null
};

document.addEventListener('DOMContentLoaded', initialize);

async function initialize() {
  ensureHash();
  renderLoading();
  await bootstrapSession();
  render();
  window.addEventListener('hashchange', render);
  bindGlobalEvents();
}

function bindGlobalEvents() {
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
      ui.sidebarOpen = false;
    }
    syncSidebar();
    Object.values(charts).forEach((chart) => {
      if (chart) chart.resize();
    });
  });
}

function ensureHash() {
  if (!location.hash || location.hash === '#/' || location.hash === '#') {
    location.hash = '#/dashboard';
  }
}

function getRoute() {
  const raw = location.hash.replace('#/', '').trim();
  return routes.some((route) => route.key === raw) ? raw : 'dashboard';
}

function mergeDefaults(saved) {
  const base = getDefaultState(saved?.profile || auth);
  return {
    profile: { ...base.profile, ...(saved.profile || {}) },
    goal: { ...base.goal, ...(saved.goal || {}) },
    calculator: { ...base.calculator, ...(saved.calculator || {}) },
    paymentMethods: Array.isArray(saved.paymentMethods) ? saved.paymentMethods : base.paymentMethods,
    financialInstitutions: Array.isArray(saved.financialInstitutions) ? saved.financialInstitutions : base.financialInstitutions,
    financialAccounts: Array.isArray(saved.financialAccounts) ? saved.financialAccounts : base.financialAccounts,
    investmentAccounts: Array.isArray(saved.investmentAccounts) ? saved.investmentAccounts : base.investmentAccounts,
    transactions: Array.isArray(saved.transactions) ? saved.transactions : base.transactions,
    budgets: Array.isArray(saved.budgets) ? saved.budgets : base.budgets,
    subscriptions: Array.isArray(saved.subscriptions) ? saved.subscriptions : base.subscriptions
  };
}

function createEmptyAuth() {
  return { isAuthenticated: false, name: '', email: '' };
}

function saveState(shouldSync = true) {
  if (shouldSync && auth.isAuthenticated) {
    scheduleStateSync();
  }
}

function clearAuth() {
  auth = createEmptyAuth();
  ui.sidebarOpen = false;
  document.body.classList.remove('overflow-hidden');
}

function renderLoading() {
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="glass rounded-[32px] px-8 py-10 text-center">
        <img src="./assets/img/obsyd-mark.svg" alt="Logo Obsyd" class="mx-auto h-16 w-16" />
        <p class="mt-5 text-sm uppercase tracking-[0.24em] text-slate-400">${BRAND_NAME}</p>
        <h1 class="mt-2 text-2xl font-semibold tracking-tight">Conectando ao banco de dados</h1>
        <p class="mt-3 text-slate-300">Carregando sua sessão, histórico financeiro e preferências.</p>
        <div class="mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-white/10 mx-auto">
          <div class="h-full w-1/2 rounded-full bg-slate-200/80 animate-pulse"></div>
        </div>
      </div>
    </div>
  `;
}

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'same-origin',
    headers,
    body: options.body !== undefined && typeof options.body !== 'string'
      ? JSON.stringify(options.body)
      : options.body
  });

  if (!response.ok) {
    let message = 'Não foi possível concluir a operação.';
    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) message = errorPayload.error;
    } catch {}
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

async function bootstrapSession() {
  try {
    const me = await apiRequest('/api/auth/me');
    auth = {
      isAuthenticated: true,
      name: me.user?.name || 'Usuário',
      email: me.user?.email || ''
    };

    const payload = await apiRequest('/api/bootstrap');
    state = mergeDefaults(payload.state || payload);
  } catch (error) {
    if (error.status !== 401) {
      console.warn('Falha ao restaurar a sessão:', error);
    }
    clearAuth();
    state = getDefaultState();
  } finally {
    isBooting = false;
  }
}

function scheduleStateSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void syncStateToServer();
  }, 350);
}

async function syncStateToServer() {
  if (!auth.isAuthenticated) return;
  if (syncInFlight) {
    pendingSync = true;
    return;
  }

  syncInFlight = true;
  try {
    await apiRequest('/api/bootstrap', {
      method: 'PUT',
      body: { state }
    });
  } catch (error) {
    console.warn('Falha ao sincronizar com o banco:', error);
  } finally {
    syncInFlight = false;
    if (pendingSync) {
      pendingSync = false;
      scheduleStateSync();
    }
  }
}

function uid() {
  if (window.crypto?.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createIsoDate(monthOffset = 0, day = 1) {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth() + monthOffset, day);
  return localISO(date);
}

function localISO(date) {
  const dt = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return dt.toISOString().split('T')[0];
}

function parseLocalDate(value) {
  const [year, month, day] = String(value).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDate(value) {
  return parseLocalDate(value).toLocaleDateString('pt-BR');
}

function getDefaultState(profileSource = {}) {
  const profileName = String(profileSource?.name || '').trim();
  const profileEmail = String(profileSource?.email || '').trim();
  return {
    profile: {
      name: profileName,
      email: profileEmail
    },
    goal: {
      name: 'Objetivo principal',
      target: 0,
      currentAmount: 0
    },
    calculator: {
      initialAmount: 0,
      monthlyContribution: 0,
      annualRate: 0,
      years: 10
    },
    paymentMethods: getFallbackPaymentMethods(),
    financialInstitutions: getFallbackFinancialInstitutions(),
    financialAccounts: [],
    investmentAccounts: [],
    transactions: [],
    budgets: [],
    subscriptions: []
  };
}

function render() {
  destroyCharts();
  if (isBooting) {
    renderLoading();
    return;
  }
  if (!auth.isAuthenticated) {
    app.innerHTML = renderLogin();
    bindLoginPage();
    hydrateIcons();
    return;
  }

  const route = getRoute();
  const routeMeta = routes.find((item) => item.key === route);
  app.innerHTML = renderShell(routeMeta.label, renderPage(route));
  bindShell();
  bindRoute(route);
  postRender(route);
  hydrateIcons();
}

function hydrateIcons() {
  if (window.lucide?.createIcons) {
    window.lucide.createIcons({
      attrs: {
        'stroke-width': 1.8
      }
    });
  }
}

function icon(name, className = 'h-4 w-4') {
  return `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;
}

function renderLogin() {
  const isRegister = ui.authMode === 'register';
  return `
    <div class="login-screen min-h-screen px-4 py-6 sm:py-8">
      ${renderToastRegion()}
      <div class="login-shell mx-auto grid min-h-[calc(100dvh-3rem)] w-full max-w-6xl grid-cols-1 items-center gap-5 lg:grid-cols-[minmax(0,1.05fr)_430px]">
        <section class="login-visual card-enter hidden h-full min-h-[620px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-6 lg:block">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <img src="./assets/img/obsyd-mark.svg" alt="Logo Obsyd" class="h-12 w-12 shrink-0" />
              <div>
                <div class="text-xl font-semibold tracking-tight text-slate-50">Obsyd</div>
                <div class="text-[11px] uppercase tracking-[0.24em] text-slate-500">Painel financeiro</div>
              </div>
            </div>
          </div>

          <div class="login-private-preview mt-8 rounded-[24px] border border-white/10 bg-slate-950/30 p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Visão privada</p>
                <h2 class="mt-2 text-xl font-semibold tracking-tight">Seu painel financeiro sem expor valores na entrada.</h2>
                <p class="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">Entre para ver saldos, metas, recorrências e relatórios em tempo real.</p>
              </div>
              <span class="feature-icon feature-icon-violet">${icon('eye-off', 'h-5 w-5')}</span>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-[1fr_240px] gap-4">
            <article class="rounded-[24px] border border-white/10 bg-slate-950/30 p-5">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Fluxo mensal</p>
                  <h2 class="mt-2 text-lg font-semibold tracking-tight">Receitas, gastos e aportes</h2>
                </div>
                <span class="tag tag-slate">6 meses</span>
              </div>
              <div class="login-bars mt-7">
                ${[44, 62, 52, 78, 58, 86].map((height, index) => `
                  <div class="login-bar-group" aria-hidden="true">
                    <span class="login-bar income" style="height:${height}%"></span>
                    <span class="login-bar expense" style="height:${Math.max(18, height - 30)}%"></span>
                    <span class="login-bar investment" style="height:${Math.max(16, height - 42)}%"></span>
                    <small>${['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'][index]}</small>
                  </div>
                `).join('')}
              </div>
            </article>

            <article class="rounded-[24px] border border-white/10 bg-slate-950/30 p-5">
              <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Agenda</p>
              <h2 class="mt-2 text-lg font-semibold tracking-tight">Próximos sinais</h2>
              <div class="mt-5 space-y-3">
                ${loginSignalPreview('10', 'Transporte', 'R$ 30,00', 'rose')}
                ${loginSignalPreview('13', 'Salário', 'R$ 2.500,00', 'emerald')}
                ${loginSignalPreview('22', 'Alimentação', 'R$ 70,79', 'violet')}
              </div>
            </article>
          </div>

          <div class="mt-5 rounded-[24px] border border-white/10 bg-slate-950/30 p-5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.22em] text-slate-500">Insights</p>
                <h2 class="mt-2 text-lg font-semibold tracking-tight">Alimentação lidera suas despesas do mês.</h2>
                <p class="mt-2 text-sm text-slate-400">Entre para revisar categorias, orçamentos e próximos vencimentos em uma visão única.</p>
              </div>
              <div class="hidden h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/10 text-violet-200 xl:flex">${icon('sparkles', 'h-7 w-7')}</div>
            </div>
          </div>
        </section>

        <section class="login-card glass card-enter card-enter-delay-1 flex h-full min-h-[620px] flex-col rounded-[28px] p-6 sm:p-8">
          <div class="mb-7 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <img src="./assets/img/obsyd-mark.svg" alt="Logo Obsyd" class="h-11 w-11 shrink-0" />
              <div>
                <div class="text-xl font-semibold tracking-tight text-slate-50">Obsyd</div>
                <div class="text-[11px] uppercase tracking-[0.24em] text-slate-500">Acesso financeiro</div>
              </div>
            </div>
            <span class="tag tag-slate">${isRegister ? 'Nova conta' : 'Login'}</span>
          </div>

          <div class="mb-6">
            <h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">${isRegister ? 'Crie seu espaço financeiro.' : 'Bem-vindo de volta.'}</h1>
            <p class="mt-2 text-sm leading-relaxed text-slate-400">
              ${isRegister ? 'Configure sua conta para acompanhar caixa, metas e relatórios com persistência individual.' : 'Entre para continuar acompanhando seu painel, movimentações e decisões do mês.'}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-2 rounded-[18px] border border-white/10 bg-slate-950/35 p-1.5">
            <button type="button" data-auth-mode="login" class="auth-mode-btn ${!isRegister ? 'active' : ''}">Entrar</button>
            <button type="button" data-auth-mode="register" class="auth-mode-btn ${isRegister ? 'active' : ''}">Criar conta</button>
          </div>

          <form id="authForm" class="mt-7 space-y-4">
            ${isRegister ? `
              <div>
                <label class="mb-2 block text-sm text-slate-300" for="registerName">Nome</label>
                <input id="registerName" name="name" class="input-luxury" type="text" placeholder="Seu nome" autocomplete="name" required />
              </div>
            ` : ''}
            <div>
              <label class="mb-2 block text-sm text-slate-300" for="authEmail">E-mail</label>
              <input id="authEmail" name="email" class="input-luxury" type="email" placeholder="voce@email.com" autocomplete="email" required />
            </div>
            <div>
              <label class="mb-2 block text-sm text-slate-300" for="authPassword">Senha</label>
              <input id="authPassword" name="password" class="input-luxury" type="password" placeholder="Sua senha" autocomplete="${isRegister ? 'new-password' : 'current-password'}" required />
            </div>
            <button class="btn-primary mt-2 w-full" type="submit">${isRegister ? 'Criar conta' : 'Entrar'}</button>
          </form>

          <div class="mt-auto pt-6 text-sm leading-relaxed text-slate-500">
            Uma área privada para acompanhar caixa, metas, recorrências e relatórios sem misturar dados entre usuários.
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderMiniFeature(title, description, tone) {
  const classes = {
    emerald: 'tag-emerald',
    violet: 'tag-violet',
    rose: 'tag-rose',
    slate: 'tag-slate'
  };
  return `
    <article class="hover-lift rounded-[24px] border border-white/10 bg-white/5 p-5">
      <span class="tag ${classes[tone] || 'tag-slate'}">${title}</span>
      <p class="mt-3 text-sm text-slate-300 leading-relaxed">${description}</p>
    </article>
  `;
}

function loginMetricPreview(label, value, detail, tone) {
  const toneClass = {
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    violet: 'border-violet-400/20 bg-violet-400/10 text-violet-200',
    rose: 'border-rose-400/20 bg-rose-400/10 text-rose-200',
    slate: 'border-white/10 bg-white/5 text-slate-200'
  }[tone] || 'border-white/10 bg-white/5 text-slate-200';

  return `
    <article class="rounded-[22px] border p-4 ${toneClass}">
      <p class="text-xs uppercase tracking-[0.18em] opacity-75">${label}</p>
      <strong class="blurred-value mt-3 block text-2xl font-semibold tracking-tight">${value}</strong>
      <span class="mt-2 block text-sm opacity-70">${detail}</span>
    </article>
  `;
}

function loginSignalPreview(day, label, value, tone) {
  const tagClass = tone === 'emerald' ? 'tag-emerald' : tone === 'violet' ? 'tag-violet' : 'tag-rose';
  return `
    <div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
      <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/8 text-sm font-semibold text-slate-100">${day}</span>
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-slate-100">${label}</p>
        <p class="blurred-value mt-0.5 text-xs text-slate-500">${value}</p>
      </div>
      <span class="tag ${tagClass}">BRL</span>
    </div>
  `;
}

function renderToastRegion() {
  const toast = ui.toast;
  const visibleClass = toast ? 'toast-visible' : '';
  const toneClass = toast?.type === 'success' ? 'toast-success' : toast?.type === 'info' ? 'toast-info' : 'toast-error';
  return `
    <div id="toastRegion" class="toast-region ${visibleClass}" role="status" aria-live="polite">
      ${toast ? `
        <div class="toast-card ${toneClass}">
          <div class="toast-icon" aria-hidden="true">${toast.type === 'success' ? '✓' : toast.type === 'info' ? 'i' : '!'}</div>
          <div class="min-w-0">
            <p class="toast-title">${escapeHtml(toast.title || toastTitle(toast.type))}</p>
            <p class="toast-message">${escapeHtml(toast.message || '')}</p>
          </div>
          <button class="toast-close" type="button" data-dismiss-toast aria-label="Fechar mensagem">${icon('x', 'h-4 w-4')}</button>
        </div>
      ` : ''}
    </div>
  `;
}

function toastTitle(type) {
  if (type === 'success') return 'Tudo certo';
  if (type === 'info') return 'Atenção';
  return 'Não foi possível continuar';
}

function renderShell(pageTitle, content) {
  const current = getRoute();
  const headerCopy = getHeaderCopy(current, pageTitle);
  return `
    <div class="app-shell min-h-[100dvh] lg:grid lg:grid-cols-[288px_minmax(0,1fr)]">
      ${renderToastRegion()}
      <div id="sidebarOverlay" class="${ui.sidebarOpen ? 'fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden' : 'hidden'}"></div>

      <aside id="sidebar" class="mobile-drawer app-sidebar fixed left-2 top-2 z-50 h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[min(320px,calc(100vw-1rem))] overflow-hidden rounded-[28px] border border-white/10 px-4 py-4 shadow-glow ${ui.sidebarOpen ? 'open' : ''} lg:sticky lg:left-0 lg:top-0 lg:h-[100dvh] lg:max-h-[100dvh] lg:w-[288px] lg:rounded-none lg:border-l-0 lg:border-t-0 lg:border-b-0 lg:px-5 lg:py-5">
        <div class="flex h-full min-h-0 flex-col">
          <div class="flex items-center justify-between gap-3">
            <a href="#/dashboard" class="flex min-w-0 items-center gap-3">
              <img src="./assets/img/obsyd-mark.svg" alt="Logo Obsyd" class="h-12 w-12 shrink-0" />
              <div class="min-w-0">
                <div class="truncate text-base font-semibold tracking-tight text-white">${BRAND_NAME}</div>
                <div class="truncate text-[11px] uppercase tracking-[0.28em] text-slate-500">Wealth cockpit</div>
              </div>
            </a>
            <button id="closeSidebarBtn" class="btn-secondary h-11 w-11 shrink-0 p-0 lg:hidden" aria-label="Fechar menu">${icon('x', 'h-5 w-5')}</button>
          </div>

          <div class="sidebar-balance-card mt-5">
            <p>Saldo disponível</p>
            <strong>${currency.format(finance.computeFinancialPosition(state.transactions, new Date(), state.investmentAccounts).availableBalance)}</strong>
            <span>${currency.format(finance.computeFinancialPosition(state.transactions, new Date(), state.investmentAccounts).netWorth)} de patrimônio</span>
          </div>

          <nav class="sidebar-nav mt-5 flex-1 space-y-5 overflow-y-auto pr-1">
            <div class="space-y-2">
              <p class="sidebar-section-label">Principal</p>
              ${routes.filter((route) => primaryNavKeys.includes(route.key)).map((route) => `
              <a href="#/${route.key}" class="sidebar-link ${current === route.key ? 'active' : ''}">
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300">${icon(route.icon, 'h-4 w-4')}</span>
                <span class="truncate font-medium">${route.label}</span>
              </a>
              `).join('')}
            </div>
            <div class="space-y-2">
              <p class="sidebar-section-label">Ferramentas</p>
              ${routes.filter((route) => secondaryNavKeys.includes(route.key)).map((route) => `
              <a href="#/${route.key}" class="sidebar-link compact ${current === route.key ? 'active' : ''}">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300">${icon(route.icon, 'h-4 w-4')}</span>
                <span class="truncate font-medium">${route.label}</span>
              </a>
              `).join('')}
            </div>
          </nav>

          <div class="mt-4 shrink-0 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.045] p-4">
            <div class="flex items-center gap-3 overflow-hidden">
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-lg font-semibold text-slate-100">${(auth.name || 'U').slice(0, 1).toUpperCase()}</div>
              <div class="min-w-0 overflow-hidden">
                <p class="text-[11px] uppercase tracking-[0.24em] text-slate-500">Minha conta</p>
                <p class="truncate font-medium text-slate-100">${auth.name || 'Usuário'}</p>
                <p class="truncate text-sm text-slate-400">${auth.email || 'sem-email'}</p>
              </div>
              <button id="logoutBtn" class="icon-ghost ml-auto h-10 w-10 shrink-0 p-0" aria-label="Deslogar" title="Deslogar">
                ${icon('log-out', 'h-4 w-4')}
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div class="min-w-0">
        ${renderAppHeader(headerCopy)}

        <main class="mx-auto max-w-[1600px] px-4 py-6 pb-28 sm:px-6 lg:px-8">
          ${content}
        </main>
        ${renderMobileNavigation(current)}
      </div>
    </div>
  `;
}

function renderAppHeader(headerCopy) {
  return `
    <header class="app-header sticky top-0 z-30">
      <div class="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <button id="openSidebarBtn" class="btn-secondary h-10 w-10 shrink-0 p-0 lg:hidden" aria-label="Abrir menu">${icon('menu', 'h-5 w-5')}</button>
            <div class="min-w-0">
              <p class="app-breadcrumb">${headerCopy.breadcrumb}</p>
              <h1 class="truncate text-xl font-semibold tracking-tight text-slate-50 sm:text-2xl">${headerCopy.title}</h1>
              <p class="mt-0.5 hidden truncate text-sm text-slate-400 sm:block">${headerCopy.subtitle}</p>
            </div>
          </div>
          <div class="header-pills">
            ${periodSelector()}
            ${balancePill()}
            ${userGreeting()}
          </div>
        </div>
        ${renderQuickActions()}
      </div>
    </header>
  `;
}

function periodSelector() {
  return `<span class="topbar-pill">${icon('calendar', 'h-3.5 w-3.5')} ${escapeHtml(monthLabel.format(new Date()))}</span>`;
}

function balancePill() {
  const balance = computeBalance();
  return `<span class="topbar-pill ${balance >= 0 ? 'is-positive' : 'is-negative'}">${icon('wallet', 'h-3.5 w-3.5')} ${currency.format(balance)}</span>`;
}

function userGreeting() {
  const firstName = String(auth.name || state.profile?.name || 'você').trim().split(/\s+/)[0];
  return `
    <span class="topbar-pill user-greeting">
      <span class="user-dot">${escapeHtml(firstName.slice(0, 1).toUpperCase() || 'U')}</span>
      ${escapeHtml(getWelcomeLabel())}
    </span>
  `;
}

function renderQuickActions() {
  return `
    <nav class="quick-actions" aria-label="Ações rápidas">
      <a href="#/transactions" class="quick-action primary">${icon('plus', 'h-3.5 w-3.5')} Nova transação</a>
      <a href="#/investments" class="quick-action">${icon('arrow-up-right', 'h-3.5 w-3.5')} Aportar</a>
      <a href="#/investments" class="quick-action">${icon('arrow-down-left', 'h-3.5 w-3.5')} Resgatar</a>
      <a href="#/investments" class="quick-action">${icon('piggy-bank', 'h-3.5 w-3.5')} Criar cofrinho</a>
      <a href="#/reports" class="quick-action">${icon('chart-no-axes-combined', 'h-3.5 w-3.5')} Relatórios</a>
    </nav>
  `;
}

function renderMobileNavigation(current) {
  const mobileKeys = ['dashboard', 'transactions', 'investments', 'reports', 'backup'];
  return `
    <nav class="mobile-bottom-nav lg:hidden" aria-label="Navegação principal mobile">
      ${routes.filter((route) => mobileKeys.includes(route.key)).map((route) => `
        <a href="#/${route.key}" class="mobile-nav-item ${current === route.key ? 'active' : ''}">
          ${icon(route.icon, 'h-5 w-5')}
          <span>${escapeHtml(route.key === 'backup' ? 'Config' : route.label.split(' ')[0])}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

function getWelcomeLabel() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = String(auth.name || state.profile?.name || 'você').trim().split(/\s+/)[0];
  return `${greeting}, ${firstName}`;
}

function getHeaderCopy(route, fallbackTitle) {
  const subtitleByRoute = {
    dashboard: `Resumo financeiro de ${monthLabel.format(new Date())}.`,
    transactions: 'Registre, filtre e acompanhe seus movimentos.',
    accounts: 'Gerencie bancos, cartões, corretoras e métodos de pagamento.',
    investments: 'Controle cofrinhos, aportes, resgates, rendimentos e perdas.',
    goals: 'Acompanhe sua meta principal e aportes planejados.',
    calculator: 'Projete juros compostos e patrimônio futuro.',
    calendar: 'Veja vencimentos e movimentações por data.',
    budgets: 'Controle limites mensais por categoria.',
    subscriptions: 'Acompanhe recorrências e pagamentos.',
    reports: 'Analise gastos, receitas e evolução financeira.',
    alerts: 'Revise sinais que merecem atenção.',
    backup: 'Ajuste perfil, backup e proteção de dados.'
  };

  return {
    breadcrumb: `${BRAND_NAME} / ${fallbackTitle}`,
    title: route === 'dashboard' ? 'Dashboard' : fallbackTitle,
    subtitle: subtitleByRoute[route] || 'Dados salvos e sincronizados na sua conta.'
  };
}

function renderPage(route) {
  switch (route) {
    case 'dashboard':
      return renderDashboardPage();
    case 'transactions':
      return renderTransactionsPage();
    case 'accounts':
      return renderAccountsPage();
    case 'investments':
      return renderInvestmentsPage();
    case 'goals':
      return renderGoalsPage();
    case 'calculator':
      return renderCalculatorPage();
    case 'calendar':
      return renderCalendarPage();
    case 'budgets':
      return renderBudgetsPage();
    case 'subscriptions':
      return renderSubscriptionsPage();
    case 'reports':
      return renderReportsPage();
    case 'alerts':
      return renderAlertsPage();
    case 'backup':
      return renderBackupPage();
    default:
      return renderDashboardPage();
  }
}

function renderDashboardPage() {
  const position = finance.computeFinancialPosition(state.transactions, new Date(), state.investmentAccounts);
  const monthly = position.monthly;
  const budgetStatus = getBudgetStatus();
  const dueSoon = getUpcomingBills(7);
  const pendingSubscriptions = getPendingSubscriptions(currentPeriodKey());
  const pendingTotal = sumAmount(pendingSubscriptions);
  const budgetPct = budgetStatus.totalLimit > 0 ? Math.min(100, (budgetStatus.totalSpent / budgetStatus.totalLimit) * 100) : 0;
  const recent = getSortedTransactions().slice(0, 6);
  const insights = buildFinancialInsights();
  const topInvestments = getInvestmentDistribution().slice(0, 4);

  return `
    <section class="dashboard-hero-grid dashboard-fold">
      ${balanceCard(position, monthly)}
      <div class="dashboard-metric-stack">
        ${metricCard('Patrimônio total', currency.format(position.netWorth), 'Saldo livre + cofrinhos/investimentos', position.netWorth >= 0 ? 'emerald' : 'rose', 'card-enter card-enter-delay-1')}
        ${metricCard('Cofrinhos/investimentos', currency.format(position.investedBalance), 'Separado do dinheiro do dia a dia', 'violet', 'card-enter card-enter-delay-2')}
        ${metricCard('Variação/rendimento', currency.format(position.investmentVariation), 'Rendimentos menos perdas totais', position.investmentVariation >= 0 ? 'emerald' : 'rose', 'card-enter card-enter-delay-3')}
      </div>
    </section>

    <section class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_.95fr]">
      ${chartCard('Evolução financeira', 'Patrimônio, saldo disponível e cofrinhos nos últimos 6 meses.', 'dashboardFlowChart', '#/reports', 'Explorar')}

      <div class="grid grid-cols-1 gap-4">
        ${infoCard('Receitas do mês', currency.format(monthly.income), 'Entradas comuns no período atual.', 'emerald')}
        ${infoCard('Despesas do mês', currency.format(monthly.expense), 'Saídas comuns do mês.', 'rose')}
        ${infoCard('Saldo líquido', currency.format(monthly.netCashFlow), 'Receitas - despesas - aportes + resgates.', monthly.netCashFlow >= 0 ? 'emerald' : 'rose')}
        ${infoCard('Poupança', `${monthly.savingsRate.toFixed(1)}%`, 'Taxa mensal considerando receitas e despesas.', 'violet')}
        <article class="glass app-card p-5 hover-lift">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold tracking-tight">Orçamentos</h3>
              <p class="mt-1 text-sm text-slate-400">Uso dos limites mensais.</p>
            </div>
            <span class="tag ${budgetPct > 90 ? 'tag-rose' : 'tag-emerald'}">${budgetPct.toFixed(0)}%</span>
          </div>
          <div class="mt-5 progress-track h-3">
            <div class="progress-bar ${budgetPct > 90 ? 'bg-rose-400' : 'bg-emerald-400'}" style="width:${Math.min(100, budgetPct)}%"></div>
          </div>
          <div class="mt-3 flex items-center justify-between text-sm text-slate-300">
            <span>Gasto atual: ${currency.format(budgetStatus.totalSpent)}</span>
            <span>Limites: ${currency.format(budgetStatus.totalLimit)}</span>
          </div>
        </article>
      </div>
    </section>

    <section class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[.9fr_1.1fr]">
      ${chartCard('Distribuição dos cofrinhos', 'Participação de cada reserva/investimento no patrimônio separado.', 'dashboardAllocationChart', '#/investments', 'Gerenciar')}
      <article class="glass app-card p-5 sm:p-6 hover-lift">
        ${dashboardSectionHeader('Cofrinhos em destaque', 'Reservas integradas ao saldo total', '#/investments', 'Movimentar')}
        <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          ${topInvestments.length ? topInvestments.map(renderVaultSummaryCard).join('') : emptyState('Crie seu primeiro cofrinho/investimento para separar dinheiro do saldo livre.')}
        </div>
      </article>
    </section>

    <section class="mt-6 glass app-card p-5 sm:p-6 hover-lift">
      ${dashboardSectionHeader('Insights', 'Leituras rápidas do mês', '#/reports', 'Ver relatórios')}
      <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        ${insights.map(renderInsightCard).join('')}
      </div>
    </section>

    <section class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <article class="glass app-card p-5 sm:p-6 hover-lift">
        ${dashboardSectionHeader('Últimas movimentações', 'Atividade recente', '#/transactions', 'Adicionar nova')}
        <div class="mt-5 space-y-3">
          ${recent.length ? recent.map(renderTransactionListItem).join('') : emptyState('Ainda não existem movimentações.')}
        </div>
      </article>

      <article class="glass app-card p-5 sm:p-6 hover-lift">
        ${dashboardSectionHeader('Próximas ações', 'Atalhos importantes')}
        <div class="mt-5 grid gap-4">
          ${priorityCard('Adicionar transação', 'Registrar receita ou despesa', 'Atualiza saldo disponível e relatórios.', '#/transactions')}
          ${priorityCard('Transferir para cofrinho', currency.format(monthly.investmentDeposit), 'Aportes feitos neste mês.', '#/investments')}
          ${priorityCard('Resgatar de cofrinho', currency.format(monthly.investmentWithdrawal), 'Valor devolvido ao saldo livre.', '#/investments')}
          ${priorityCard('Próximos vencimentos', dueSoon.length ? `${currency.format(sumAmount(dueSoon))}` : 'Sem alertas', dueSoon.length ? `${dueSoon.length} item(ns) em 7 dias.` : 'Nenhuma conta vence nos próximos 7 dias.', '#/calendar')}
          ${priorityCard('Assinaturas', currency.format(pendingTotal), pendingSubscriptions.length ? `${pendingSubscriptions.length} pendente(s) no período.` : 'Recorrências em dia.', '#/subscriptions')}
        </div>
      </article>
    </section>
  `;
}

function balanceCard(position, monthly) {
  const balanceTone = position.availableBalance >= 0 ? 'tag-emerald' : 'tag-rose';
  return `
    <article class="balance-card card-enter">
      <div class="relative z-10 flex h-full flex-col">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm text-slate-400">Saldo disponível</p>
            <h2 class="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">${currency.format(position.availableBalance)}</h2>
            <p class="mt-3 max-w-xl text-sm leading-relaxed text-slate-400">Dinheiro livre para usar hoje, já separado dos cofrinhos e investimentos.</p>
          </div>
          <span class="tag ${balanceTone}">${position.availableBalance >= 0 ? 'Saudável' : 'Atenção'}</span>
        </div>
        <div class="mt-auto grid grid-cols-1 gap-3 pt-8 sm:grid-cols-3">
          <span class="balance-mini-metric"><small>Receitas</small><strong>${currency.format(monthly.income)}</strong></span>
          <span class="balance-mini-metric"><small>Despesas</small><strong>${currency.format(monthly.expense)}</strong></span>
          <span class="balance-mini-metric"><small>Aportes</small><strong>${currency.format(monthly.investmentDeposit)}</strong></span>
        </div>
      </div>
    </article>
  `;
}

function chartCard(title, subtitle, canvasId, href = '', actionLabel = '') {
  return `
    <article class="glass app-card chart-card p-5 sm:p-6 hover-lift">
      ${dashboardSectionHeader(title, subtitle, href, actionLabel)}
      <div class="chart-frame mt-6">
        <canvas id="${canvasId}"></canvas>
      </div>
    </article>
  `;
}

function renderVaultSummaryCard(item) {
  const percent = item.total > 0 ? (item.amount / item.total) * 100 : 0;
  return `
    <article class="vault-summary-card" style="--vault-color:${escapeHtml(item.color || designColors.accent)}">
      <div class="flex min-w-0 items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="truncate font-semibold text-slate-50">${escapeHtml(item.label)}</h3>
          <p class="mt-1 truncate text-sm text-slate-400">${escapeHtml(item.detail || 'Cofrinho/investimento')}</p>
        </div>
        <span class="tag tag-violet">${percent.toFixed(0)}%</span>
      </div>
      <p class="mt-4 text-xl font-semibold tracking-tight">${currency.format(item.amount)}</p>
      <div class="progress-track mt-4 h-2">
        <div class="progress-bar" style="width:${Math.min(100, percent)}%; background:var(--vault-color)"></div>
      </div>
    </article>
  `;
}

function metricCard(title, value, subtitle, tone, enterClass = '') {
  const ring = {
    emerald: 'tag-emerald',
    rose: 'tag-rose',
    violet: 'tag-violet'
  }[tone] || 'tag-slate';
  const iconName = getMetricIcon(title, tone);

  return `
    <article class="glass metric-ring rounded-[28px] p-5 hover-lift ${enterClass}">
      <div class="flex items-center justify-between gap-3">
        <span class="flex items-center gap-2 text-sm text-slate-300"><span class="metric-icon ${ring}">${icon(iconName, 'h-4 w-4')}</span>${title}</span>
        <span class="tag ${ring}">${tone === 'rose' ? 'Monitorar' : 'Mês'}</span>
      </div>
      <p class="mt-4 text-3xl font-semibold tracking-tight">${value}</p>
      <p class="mt-2 text-sm text-slate-400">${subtitle}</p>
    </article>
  `;
}

function dashboardSectionHeader(title, subtitle, href = '', actionLabel = '') {
  return `
    <div class="dashboard-section-header">
      <div class="min-w-0">
        <h2 class="truncate text-lg font-semibold tracking-tight text-slate-50">${escapeHtml(title)}</h2>
        <p class="mt-0.5 truncate text-sm text-slate-400">${escapeHtml(subtitle || '')}</p>
      </div>
      ${href && actionLabel ? `<a href="${href}" class="btn-secondary compact-action">${escapeHtml(actionLabel)}</a>` : ''}
    </div>
  `;
}

function getMetricIcon(title, tone) {
  const text = normalizeText(title);
  if (text.includes('cartao') || text.includes('fatura')) return domainIcons.credit;
  if (text.includes('conta') || text.includes('saldo')) return domainIcons.accounts;
  if (text.includes('metodo')) return domainIcons.pix;
  if (text.includes('banco')) return 'landmark';
  if (text.includes('receita')) return 'trending-up';
  if (text.includes('despesa') || tone === 'rose') return 'trending-down';
  if (text.includes('invest')) return domainIcons.investment;
  return tone === 'emerald' ? 'circle-check' : tone === 'violet' ? 'sparkles' : 'activity';
}

function infoCard(title, value, subtitle, tone) {
  const tagMap = { emerald: 'tag-emerald', rose: 'tag-rose', violet: 'tag-violet' };
  return `
    <article class="glass rounded-[28px] p-5 hover-lift">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h3 class="text-base font-semibold tracking-tight">${title}</h3>
          <p class="mt-1 text-sm text-slate-400">${subtitle}</p>
        </div>
        <span class="tag ${tagMap[tone] || 'tag-slate'}">${value}</span>
      </div>
    </article>
  `;
}

function renderInsightCard(insight) {
  const toneClass = {
    success: 'tag-emerald',
    danger: 'tag-rose',
    info: 'tag-violet',
    neutral: 'tag-slate'
  }[insight.tone] || 'tag-slate';

  return `
    <article class="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <span class="tag ${toneClass}">${escapeHtml(insight.label)}</span>
      <h3 class="mt-3 text-base font-semibold tracking-tight">${escapeHtml(insight.title)}</h3>
      <p class="mt-2 text-sm leading-relaxed text-slate-400">${escapeHtml(insight.description)}</p>
    </article>
  `;
}

function dashboardAccountSummary(title, value, subtitle, entity, kind) {
  const account = entity?.account || (entity?.id ? getAccountById(entity.id) : null);
  const institution = entity?.institution || getInstitutionById(account?.institutionId);
  const method = kind === 'method' ? getPaymentMethods().find((item) => item.name === entity?.label || shortPaymentMethodLabel(item) === entity?.label) : null;
  return `
    <article class="dashboard-account-summary hover-lift" style="${institutionStyleVars(institution, account?.color)}">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm text-slate-300">${escapeHtml(title)}</p>
          <p class="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-50">${escapeHtml(value)}</p>
          <p class="mt-1 text-sm text-slate-500">${escapeHtml(subtitle)}</p>
        </div>
        ${method ? `<span class="method-avatar" style="--method-color:${escapeHtml(method.color || '#94a3b8')}">${paymentMethodIcon(method.id, 'h-4 w-4')}</span>` : institutionAvatar(institution, 'h-10 w-10')}
      </div>
      <div class="mt-4">
        ${account ? accountOriginBadge(account, institution) : method ? paymentMethodBadge(method.id) : '<span class="source-badge">Sem destaque</span>'}
      </div>
    </article>
  `;
}

function renderCategoryOptions(categories, currentValue) {
  const unique = [...new Set(categories.filter(Boolean))];
  const safeCurrent = unique.includes(currentValue) || currentValue === '__custom__'
    ? currentValue
    : (unique[0] || 'Outros');

  return [
    ...unique.map((category) => `<option value="${escapeHtml(category)}" ${safeCurrent === category ? 'selected' : ''}>${escapeHtml(category)}</option>`),
    `<option value="__custom__" ${safeCurrent === '__custom__' ? 'selected' : ''}>Nova categoria...</option>`
  ].join('');
}

function renderDashboardWeekCalendar() {
  const days = getWeekDays(new Date());

  return `
    <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-xl font-semibold tracking-tight">Agenda da semana</h2>
          <p class="mt-1 text-sm text-slate-400">Uma leitura compacta das suas movimentações e recorrências dos próximos dias.</p>
        </div>
        <a href="#/calendar" class="btn-secondary">Abrir calendário</a>
      </div>
      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-7">
        ${days.map((day) => renderDashboardWeekDay(day)).join('')}
      </div>
    </article>
  `;
}

function renderDashboardWeekDay(day) {
  const items = getCalendarItemsForDate(day.date);
  return `
    <article class="mini-calendar-day rounded-[24px] border border-white/10 bg-white/5 p-4 ${day.isToday ? 'today' : ''}">
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="text-xs uppercase tracking-[0.22em] text-slate-500">${day.weekday}</p>
          <p class="mt-1 text-lg font-semibold text-slate-100">${day.day}</p>
        </div>
        ${items.length ? `<span class="tag tag-slate">${items.length}</span>` : ''}
      </div>
      <div class="mt-4 space-y-2 text-xs">
        ${items.length ? items.slice(0, 3).map((item) => `
          ${calendarTransactionPill(item, false)}
        `).join('') : '<div class="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-slate-500">Sem itens</div>'}
      </div>
    </article>
  `;
}

function renderTransactionsPage() {
  const categories = getAvailableCategories();
  const editingTransaction = state.transactions.find((tx) => tx.id === valueOf('editingTransactionId', '')) || null;
  const isTransactionFormOpen = Boolean(editingTransaction) || valueOf('transactionFormOpen', '') === 'true';
  const selectedTransactionType = editingTransaction?.type === 'investment' ? 'investment_deposit' : editingTransaction?.type || 'expense';
  const selectedCategory = editingTransaction?.category || valueOf('draftTransactionCategory', categories[0] || 'Outros');
  const isCustomCategory = selectedCategory === '__custom__';
  const transactions = filterTransactions({
    type: valueOf('filterType', 'all'),
    recurring: valueOf('filterRecurring', 'all'),
    financialAccountId: valueOf('filterFinancialAccount', 'all'),
    institutionId: valueOf('filterInstitution', 'all'),
    paymentMethodId: valueOf('filterPaymentMethod', 'all'),
    cardBrand: valueOf('filterCardBrand', 'all'),
    search: valueOf('searchTransaction', ''),
    month: valueOf('filterMonth', localISO(new Date()).slice(0, 7))
  });
  const monthly = getMonthlySummary(parseLocalDate(`${valueOf('filterMonth', localISO(new Date()).slice(0, 7))}-01`));

  return `
    <section class="space-y-6">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        ${metricCard('Receitas filtradas', currency.format(monthly.income), 'Entradas no mês selecionado.', 'emerald')}
        ${metricCard('Despesas filtradas', currency.format(monthly.expense), 'Saídas consumidas no mês.', 'rose')}
        ${metricCard('Aportes', currency.format(monthly.investmentDeposit), 'Transferências para cofrinhos.', 'violet')}
        ${metricCard('Saldo líquido', currency.format(monthly.netCashFlow), 'Receitas - despesas - aportes + resgates.', monthly.netCashFlow >= 0 ? 'emerald' : 'rose')}
      </div>

      <section class="grid grid-cols-1 gap-6">
        <div class="form-modal ${isTransactionFormOpen ? 'open' : ''}" role="dialog" aria-modal="true" aria-labelledby="transactionFormTitle">
        <article class="form-sheet glass p-5 sm:p-6">
          <div class="flex items-start gap-3">
            <span class="feature-icon feature-icon-violet">${icon(editingTransaction ? 'pencil' : 'plus', 'h-5 w-5')}</span>
            <div>
              <p class="text-xs uppercase tracking-[0.24em] text-slate-400">${editingTransaction ? 'Editar movimentação' : 'Nova movimentação'}</p>
              <h2 id="transactionFormTitle" class="mt-2 text-xl font-semibold tracking-tight">${editingTransaction ? 'Alterar transação' : 'Adicionar transação'}</h2>
            </div>
            <button class="btn-secondary ml-auto h-10 w-10 p-0" data-close-form="transaction" aria-label="Fechar formulário">${icon('x', 'h-4 w-4')}</button>
          </div>

          <form id="transactionForm" class="mt-6 space-y-4" data-editing-transaction-id="${editingTransaction?.id || ''}">
            <div>
              <label class="mb-2 block text-sm text-slate-300">Descrição</label>
              <input class="input-luxury" name="description" value="${escapeHtml(editingTransaction?.description || '')}" required placeholder="Ex.: Compra no mercado" autocomplete="off" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="mb-2 block text-sm text-slate-300">Valor</label>
                <div class="money-input-wrap">
                  <span>R$</span>
                  <input class="input-luxury money-input" name="amount" value="${editingTransaction ? formatMoneyInput(editingTransaction.amount) : ''}" inputmode="decimal" required placeholder="0,00" />
                </div>
              </div>
              <div>
                <label class="mb-2 block text-sm text-slate-300">Data</label>
                <input class="input-luxury" name="date" type="date" value="${editingTransaction?.date || localISO(new Date())}" required />
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="mb-2 block text-sm text-slate-300">Tipo</label>
                <div class="select-wrap">
                  <select class="select-luxury" name="type">
                    ${selectOptions([
                      ['income', 'Receita'],
                      ['expense', 'Despesa'],
                      ['investment_deposit', 'Aporte em cofrinho'],
                      ['investment_withdrawal', 'Resgate de cofrinho'],
                      ['investment_gain', 'Rendimento'],
                      ['investment_loss', 'Perda/variação negativa']
                    ], selectedTransactionType)}
                  </select>
                </div>
              </div>
              <div>
                <label class="mb-2 block text-sm text-slate-300">Categoria</label>
                <div class="select-wrap">
                  <select class="select-luxury" id="transactionCategory" name="category">
                    ${renderCategoryOptions(categories, selectedCategory)}
                  </select>
                </div>
              </div>
            </div>

            <div id="transactionCustomCategoryWrap" class="${isCustomCategory ? '' : 'hidden'}">
              <label class="mb-2 block text-sm text-slate-300">Nova categoria</label>
              <input class="input-luxury" id="transactionCustomCategory" name="customCategory" placeholder="Ex.: Pets, Viagem, Casa" ${isCustomCategory ? 'required' : ''} />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="mb-2 block text-sm text-slate-300">Conta/Cartão</label>
                <div class="select-wrap">
                  <select class="select-luxury" id="transactionFinancialAccount" name="financialAccountId">
                    ${renderFinancialAccountOptions(editingTransaction?.financialAccountId || '', true)}
                  </select>
                </div>
              </div>
              <div>
                <label class="mb-2 block text-sm text-slate-300">Método</label>
                <div class="select-wrap">
                  <select class="select-luxury" id="transactionPaymentMethod" name="paymentMethodId">
                    ${renderPaymentMethodOptions(editingTransaction?.paymentMethodId || '', true)}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label class="mb-2 block text-sm text-slate-300">Cofrinho/investimento</label>
              <div class="select-wrap">
                <select class="select-luxury" name="investmentAccountId">
                  ${renderInvestmentAccountOptions(editingTransaction?.investmentAccountId || '', true)}
                </select>
              </div>
            </div>

            <label class="inline-flex items-center gap-3 text-sm text-slate-300">
              <input name="recurring" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-slate-900/60" ${editingTransaction?.recurring ? 'checked' : ''} />
              Marcar como recorrente
            </label>

            <button class="btn-primary w-full" type="submit">${icon('save', 'h-4 w-4')} ${editingTransaction ? 'Salvar alterações' : 'Salvar transação'}</button>
          </form>
        </article>
        </div>

        <article class="glass rounded-[28px] p-5 sm:p-6 min-w-0">
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Gestão inteligente</p>
                <h2 class="mt-2 text-xl font-semibold tracking-tight">Lista de transações</h2>
              </div>
              <div class="flex flex-col gap-2 sm:flex-row">
                <button class="btn-primary w-full sm:w-auto" type="button" data-open-form="transaction">${icon('plus', 'h-4 w-4')} Nova transação</button>
                <button id="exportTransactionsCsvBtn" class="btn-secondary w-full sm:w-auto" type="button">${icon('download', 'h-4 w-4')} Exportar CSV</button>
              </div>
            </div>

            <div class="transaction-toolbar">
              <div class="toolbar-search">
                ${icon('search', 'h-4 w-4')}
                <input id="searchTransaction" value="${escapeHtml(valueOf('searchTransaction', ''))}" placeholder="Buscar descrição, categoria..." />
              </div>
              <div class="select-wrap">
                <select id="filterType" class="select-luxury">
                  ${selectOptions([
                    ['all', 'Todos os tipos'],
                    ['income', 'Receitas'],
                    ['expense', 'Despesas'],
                    ['investment', 'Investimentos/cofrinhos']
                  ], valueOf('filterType', 'all'))}
                </select>
              </div>
              <div class="select-wrap">
                <select id="filterRecurring" class="select-luxury">
                  ${selectOptions([
                    ['all', 'Todas'],
                    ['recurring', 'Recorrentes'],
                    ['single', 'Pontuais']
                  ], valueOf('filterRecurring', 'all'))}
                </select>
              </div>
              <div class="select-wrap">
                <select id="filterFinancialAccount" class="select-luxury">
                  ${renderFinancialAccountFilterOptions(valueOf('filterFinancialAccount', 'all'))}
                </select>
              </div>
              <div class="select-wrap">
                <select id="filterInstitution" class="select-luxury">
                  ${renderInstitutionFilterOptions(valueOf('filterInstitution', 'all'))}
                </select>
              </div>
              <div class="select-wrap">
                <select id="filterPaymentMethod" class="select-luxury">
                  ${renderPaymentMethodFilterOptions(valueOf('filterPaymentMethod', 'all'))}
                </select>
              </div>
              <div class="select-wrap">
                <select id="filterCardBrand" class="select-luxury">
                  ${selectOptions([['all', 'Todas bandeiras'], ...cardBrandOptions.filter(([value]) => value)], valueOf('filterCardBrand', 'all'))}
                </select>
              </div>
              <input id="filterMonth" class="input-luxury" type="month" value="${valueOf('filterMonth', localISO(new Date()).slice(0, 7))}" />
            </div>
          </div>

          <div class="transaction-card-list mt-5 space-y-3 md:hidden">
            ${transactions.length ? transactions.map(renderTransactionCard).join('') : emptyState('Nenhuma transação encontrada para os filtros atuais.')}
          </div>

          <div class="transaction-table-wrap mt-5 overflow-hidden rounded-[22px] border border-white/10 bg-slate-950/25 max-md:hidden">
            <div class="table-scroll overflow-auto">
              <table class="min-w-full text-sm professional-table">
                <thead class="text-left text-slate-400">
                  <tr>
                    <th class="px-4 py-3 font-medium">Descrição</th>
                    <th class="px-4 py-3 font-medium">Categoria</th>
                    <th class="px-4 py-3 font-medium">Origem</th>
                    <th class="px-4 py-3 font-medium">Data</th>
                    <th class="px-4 py-3 font-medium">Tipo</th>
                    <th class="px-4 py-3 font-medium text-right">Valor</th>
                    <th class="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactions.length ? transactions.map(renderTransactionRow).join('') : `<tr><td colspan="7" class="px-4 py-12 text-center text-slate-400">Nenhuma transação encontrada para os filtros atuais.</td></tr>`}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </article>
      </section>
    </section>
  `;
}

function renderAccountsPage() {
  const accounts = filterFinancialAccounts({
    type: valueOf('filterAccountType', 'all'),
    institutionId: valueOf('filterAccountInstitution', 'all'),
    status: valueOf('filterAccountStatus', 'active'),
    paymentMethodId: valueOf('filterAccountMethod', 'all'),
    search: valueOf('searchAccount', '')
  });
  const editingAccount = state.financialAccounts.find((account) => account.id === valueOf('editingAccountId', '')) || null;
  const isAccountFormOpen = Boolean(editingAccount) || valueOf('accountFormOpen', '') === 'true';
  const selectedPreset = quickAccountPresets.find((preset) => preset.label === valueOf('selectedAccountPreset', '')) || null;
  const draft = editingAccount || buildAccountDraftFromPreset(selectedPreset);
  const summary = getPaymentSourceSummary();

  return `
    <section class="space-y-6">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        ${metricCard('Contas ativas', `${summary.activeAccounts}`, 'Contas, cartões e carteiras em uso.', 'emerald')}
        ${metricCard('Saldo incluído', currency.format(summary.includedBalance), 'Saldo calculado das contas no total.', summary.includedBalance >= 0 ? 'emerald' : 'rose')}
        ${metricCard('Fatura estimada', currency.format(summary.creditCardSpending), 'Gasto do mês em cartões de crédito.', summary.creditCardSpending ? 'rose' : 'emerald')}
        ${metricCard('Banco mais movimentado', summary.topInstitution?.label || 'Sem dados', summary.topInstitution ? currency.format(summary.topInstitution.amount) : 'N/A', 'violet')}
      </div>

      <section class="grid grid-cols-1 gap-6">
        <div class="form-modal ${isAccountFormOpen ? 'open' : ''}" role="dialog" aria-modal="true" aria-labelledby="accountFormTitle">
        <article class="form-sheet glass p-5 sm:p-6">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-start gap-3">
              <span class="feature-icon feature-icon-violet">${icon(editingAccount ? 'pencil' : 'plus', 'h-5 w-5')}</span>
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-slate-400">${editingAccount ? 'Editar origem' : 'Novo modelo'}</p>
                <h2 id="accountFormTitle" class="mt-2 text-xl font-semibold tracking-tight">${editingAccount ? 'Ajustar conta/cartão' : 'Adicionar conta/cartão'}</h2>
              </div>
            </div>
            <button class="btn-secondary h-10 w-10 p-0" data-close-form="account" aria-label="Fechar formulário">${icon('x', 'h-4 w-4')}</button>
          </div>

          <div class="mt-5">
            <label class="mb-2 block text-sm text-slate-300">Preset rápido</label>
            <div class="select-wrap">
              <select class="select-luxury" id="selectedAccountPreset">
                ${selectOptions([['', 'Configuração manual'], ...quickAccountPresets.map((preset) => [preset.label, preset.label])], selectedPreset?.label || '')}
              </select>
            </div>
            <div class="preset-strip mt-3">
              ${quickAccountPresets.slice(0, 8).map(renderQuickPresetChip).join('')}
            </div>
          </div>

          <form id="financialAccountForm" class="mt-6 space-y-4" data-editing-account-id="${editingAccount?.id || ''}">
            <div>
              <label class="mb-2 block text-sm text-slate-300">Instituição</label>
              <div class="select-wrap">
                <select class="select-luxury" name="institutionId">
                  ${renderInstitutionOptions(draft.institutionId, true)}
                </select>
              </div>
              ${institutionSelectPreview(draft.institutionId)}
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="mb-2 block text-sm text-slate-300">Tipo</label>
                <div class="select-wrap">
                  <select class="select-luxury" name="type">
                    ${selectOptions(accountTypeOptions, draft.type || 'checking_account')}
                  </select>
                </div>
              </div>
              <div>
                <label class="mb-2 block text-sm text-slate-300">Apelido</label>
                <input class="input-luxury" name="nickname" value="${escapeHtml(draft.nickname || '')}" placeholder="Ex.: Nubank Roxinho" required />
              </div>
            </div>
            <div>
              <label class="mb-2 block text-sm text-slate-300">Nome oficial</label>
              <input class="input-luxury" name="name" value="${escapeHtml(draft.name || '')}" placeholder="Ex.: Nubank Crédito" required />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="mb-2 block text-sm text-slate-300">Final</label>
                <input class="input-luxury" name="lastFourDigits" value="${escapeHtml(draft.lastFourDigits || '')}" inputmode="numeric" maxlength="4" placeholder="1234" />
              </div>
              <div>
                <label class="mb-2 block text-sm text-slate-300">Bandeira</label>
                <div class="select-wrap">
                  <select class="select-luxury" name="cardBrand">
                    ${selectOptions(cardBrandOptions, draft.cardBrand || '')}
                  </select>
                </div>
              </div>
              <div>
                <label class="mb-2 block text-sm text-slate-300">Cor</label>
                <input class="input-luxury" name="color" type="color" value="${escapeHtml(draft.color || getInstitutionById(draft.institutionId)?.brandColor || '#8b7cf6')}" />
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="mb-2 block text-sm text-slate-300">Saldo inicial</label>
                <div class="money-input-wrap"><span>R$</span><input class="input-luxury money-input" name="initialBalance" value="${formatMoneyInput(draft.initialBalance || 0)}" inputmode="decimal" /></div>
              </div>
              <div>
                <label class="mb-2 block text-sm text-slate-300">Limite</label>
                <div class="money-input-wrap"><span>R$</span><input class="input-luxury money-input" name="creditLimit" value="${draft.creditLimit ? formatMoneyInput(draft.creditLimit) : ''}" inputmode="decimal" /></div>
              </div>
              <div>
                <label class="mb-2 block text-sm text-slate-300">Saldo manual</label>
                <div class="money-input-wrap"><span>R$</span><input class="input-luxury money-input" name="manualBalance" value="${draft.manualBalance !== null && draft.manualBalance !== undefined ? formatMoneyInput(draft.manualBalance) : ''}" inputmode="decimal" /></div>
              </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="mb-2 block text-sm text-slate-300">Fechamento</label>
                <input class="input-luxury" name="closingDay" type="number" min="1" max="31" value="${draft.closingDay || ''}" />
              </div>
              <div>
                <label class="mb-2 block text-sm text-slate-300">Vencimento</label>
                <input class="input-luxury" name="dueDay" type="number" min="1" max="31" value="${draft.dueDay || ''}" />
              </div>
            </div>
            <div>
              <label class="mb-3 block text-sm text-slate-300">Métodos aceitos</label>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                ${getPaymentMethods().map((method) => `
                  <label class="method-check">
                    <input type="checkbox" name="paymentMethodIds" value="${method.id}" ${draft.paymentMethodIds?.includes(method.id) ? 'checked' : ''} />
                    ${paymentMethodBadge(method.id)}
                  </label>
                `).join('')}
              </div>
            </div>
            ${draft.type === 'credit_card' || draft.type === 'debit_card' || draft.type === 'prepaid_card' ? renderCreditCardPreview({ ...draft, isActive: true }) : ''}
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="inline-flex items-center gap-3 text-sm text-slate-300">
                <input name="includeInTotalBalance" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-slate-900/60" ${draft.includeInTotalBalance !== false ? 'checked' : ''} />
                Inclui no saldo
              </label>
              <label class="inline-flex items-center gap-3 text-sm text-slate-300">
                <input name="isDefault" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-slate-900/60" ${draft.isDefault ? 'checked' : ''} />
                Conta padrão
              </label>
            </div>
            <textarea class="textarea-luxury min-h-24" name="notes" placeholder="Observações internas">${escapeHtml(draft.notes || '')}</textarea>
            <button class="btn-primary w-full" type="submit">${icon('save', 'h-4 w-4')} ${editingAccount ? 'Salvar alterações' : 'Adicionar conta/cartão'}</button>
          </form>
        </article>
        </div>

        <article class="glass rounded-[28px] p-5 sm:p-6 min-w-0">
          <div class="flex flex-col gap-4">
            <div>
              <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Origem financeira</p>
              <h2 class="mt-2 text-xl font-semibold tracking-tight">Contas, cartões e carteiras</h2>
            </div>
            <button class="btn-primary w-full sm:w-auto" type="button" data-open-form="account">${icon('plus', 'h-4 w-4')} Adicionar conta</button>
            <div class="transaction-toolbar">
              <div class="toolbar-search">${icon('search', 'h-4 w-4')}<input id="searchAccount" value="${escapeHtml(valueOf('searchAccount', ''))}" placeholder="Buscar nome, banco ou apelido..." /></div>
              <div class="select-wrap"><select id="filterAccountType" class="select-luxury">${selectOptions([['all', 'Todos os tipos'], ...accountTypeOptions], valueOf('filterAccountType', 'all'))}</select></div>
              <div class="select-wrap"><select id="filterAccountInstitution" class="select-luxury">${renderInstitutionFilterOptions(valueOf('filterAccountInstitution', 'all'))}</select></div>
              <div class="select-wrap"><select id="filterAccountMethod" class="select-luxury">${renderPaymentMethodFilterOptions(valueOf('filterAccountMethod', 'all'))}</select></div>
              <div class="select-wrap"><select id="filterAccountStatus" class="select-luxury">${selectOptions([['active', 'Ativos'], ['archived', 'Arquivados'], ['all', 'Todos']], valueOf('filterAccountStatus', 'active'))}</select></div>
            </div>
          </div>
          <div class="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
            ${accounts.length ? accounts.map(renderFinancialAccountCard).join('') : emptyState('Nenhuma conta/cartão encontrada. Ative um preset ou crie uma origem financeira manual.')}
          </div>
        </article>
      </section>
    </section>
  `;
}

function renderInvestmentsPage() {
  const investmentAccounts = state.investmentAccounts || [];
  const editingInvestment = investmentAccounts.find((account) => account.id === valueOf('editingInvestmentAccountId', '')) || null;
  const isInvestmentFormOpen = valueOf('investmentFormOpen', '') === 'true' || Boolean(editingInvestment);
  const totalInvested = finance.computeInvestedBalance(state.transactions, investmentAccounts);
  const activeInvestments = investmentAccounts.filter((acc) => acc.isActive).length;
  const monthSummary = getMonthlySummary(new Date());

  const investmentTypeColors = {
    stock: 'tag-violet',
    crypto: 'tag-warning',
    reits: 'tag-info',
    fixed_income: 'tag-emerald',
    fund: 'tag-violet',
    pension: 'tag-emerald',
    other: 'tag-slate'
  };

  return `
    <section class="grid grid-cols-1 gap-6">
      <div class="form-modal ${isInvestmentFormOpen ? 'open' : ''}" role="dialog" aria-modal="true" aria-labelledby="investmentFormTitle">
      <article class="form-sheet glass p-5 sm:p-6">
        <form id="investmentAccountForm" data-editing-account-id="${editingInvestment?.id || ''}" class="space-y-4">
          <div class="flex items-start gap-3">
            <span class="feature-icon feature-icon-violet">${icon('landmark', 'h-5 w-5')}</span>
            <div>
              <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Reserva ou investimento</p>
              <h2 id="investmentFormTitle" class="mt-2 text-xl font-semibold tracking-tight">${editingInvestment ? 'Editar cofrinho' : 'Adicionar cofrinho'}</h2>
            </div>
            <button class="btn-secondary ml-auto h-10 w-10 p-0" data-close-form="investment" type="button" aria-label="Fechar formulário">${icon('x', 'h-4 w-4')}</button>
          </div>

          <div>
            <label class="mb-2 block text-sm text-slate-300">Corretora/Instituição</label>
            <select class="input-luxury" name="investmentInstitution" required>
              <option value="">Selecione uma instituição</option>
              ${(state.financialInstitutions || []).map((inst) => `
                <option value="${escapeHtml(inst.id)}" ${editingInvestment?.institutionId === inst.id ? 'selected' : ''} data-logo="${escapeHtml(inst.logoPath)}" data-icon="${escapeHtml(inst.icon)}" data-color="${escapeHtml(inst.brandColor)}">
                  ${escapeHtml(inst.name)}
                </option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="mb-2 block text-sm text-slate-300">Nome do cofrinho</label>
            <input class="input-luxury" name="investmentNickname" value="${escapeHtml(editingInvestment?.nickname || '')}" placeholder="Ex.: Reserva de emergência" />
          </div>

          <div>
            <label class="mb-2 block text-sm text-slate-300">Tipo de investimento</label>
            <select class="input-luxury" name="investmentType" required>
              ${selectOptions([
                ['stock', 'Ações'],
                ['crypto', 'Criptomoedas'],
                ['reits', 'Fundos imobiliários'],
                ['fixed_income', 'Renda fixa'],
                ['fund', 'Fundos'],
                ['pension', 'Previdência'],
                ['other', 'Outro']
              ], editingInvestment?.investmentType || 'fixed_income')}
            </select>
          </div>

          <div>
            <label class="mb-2 block text-sm text-slate-300">Número da conta (opcional)</label>
            <input class="input-luxury" name="investmentAccountNumber" value="${escapeHtml(editingInvestment?.accountNumber || '')}" placeholder="Ex.: 123456" />
          </div>

          <div>
            <label class="mb-2 block text-sm text-slate-300">Saldo inicial já existente</label>
            <div class="money-input-wrap">
              <span>R$</span>
              <input class="input-luxury money-input" name="investmentInitial" value="${editingInvestment ? formatMoneyInput(editingInvestment.initialInvestment || 0) : ''}" inputmode="decimal" placeholder="0,00" />
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm text-slate-300">Perfil de risco</label>
            <select class="input-luxury" name="investmentRiskProfile">
              ${selectOptions([
                ['conservative', 'Conservador'],
                ['moderate', 'Moderado'],
                ['aggressive', 'Agressivo'],
                ['balanced', 'Balanceado']
              ], editingInvestment?.riskProfile || 'balanced')}
            </select>
          </div>

          <div>
            <label class="mb-2 block text-sm text-slate-300">Notas</label>
            <textarea class="input-luxury" name="investmentNotes" placeholder="Observações..." rows="2">${escapeHtml(editingInvestment?.notes || '')}</textarea>
          </div>

          <div class="flex gap-2">
            <button class="btn-primary flex-1" type="submit">${icon('plus', 'h-4 w-4')} ${editingInvestment ? 'Salvar cofrinho' : 'Adicionar'}</button>
            <button class="btn-secondary" id="cancelInvestmentEdit" type="button" style="display:none;">${icon('x', 'h-4 w-4')}</button>
          </div>
        </form>
      </article>
      </div>

      <div class="space-y-4">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Cofrinhos e investimentos</p>
            <h2 class="text-2xl font-semibold tracking-tight">Reservas separadas do saldo livre</h2>
          </div>
          <button class="btn-primary w-full sm:w-auto" type="button" data-open-form="investment">${icon('plus', 'h-4 w-4')} Criar cofrinho</button>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          ${metricCard('Reservado/investido', currency.format(totalInvested), 'Valor separado do saldo livre', 'violet', '')}
          ${metricCard('Variação do mês', currency.format(monthSummary.investmentVariation), 'Rendimentos menos perdas', monthSummary.investmentVariation >= 0 ? 'emerald' : 'rose', '')}
          ${metricCard('Aportes do mês', currency.format(monthSummary.investmentDeposit), 'Saiu do saldo principal', 'violet', '')}
          ${metricCard('Resgates do mês', currency.format(monthSummary.investmentWithdrawal), 'Voltou ao saldo principal', 'emerald', '')}
          ${metricCard('Cofrinhos ativos', `${activeInvestments}`, 'Locais separados do saldo', 'violet', '')}
        </div>

        ${chartCard('Alocação dos cofrinhos', 'Distribuição do valor reservado por cofrinho ou investimento.', 'investmentAllocationChart', '#/reports', 'Ver relatório')}

        <article class="glass app-card p-5 sm:p-6">
          <div class="mb-4">
            <h3 class="text-lg font-semibold tracking-tight">Movimentar cofrinho</h3>
            <p class="mt-1 text-sm text-slate-400">Registre aportes, resgates, rendimentos e perdas sem misturar com o saldo livre.</p>
          </div>
          <form id="investmentMovementForm" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div class="xl:col-span-2">
              <label class="mb-2 block text-sm text-slate-300">Cofrinho/investimento</label>
              <select class="input-luxury" name="investmentAccountId" required>
                ${renderInvestmentAccountOptions('', false)}
              </select>
            </div>
            <div>
              <label class="mb-2 block text-sm text-slate-300">Operação</label>
              <select class="input-luxury" name="movementType">
                ${selectOptions([
                  ['investment_deposit', 'Aportar'],
                  ['investment_withdrawal', 'Resgatar'],
                  ['investment_gain', 'Rendimento'],
                  ['investment_loss', 'Perda']
                ], 'investment_deposit')}
              </select>
            </div>
            <div>
              <label class="mb-2 block text-sm text-slate-300">Valor</label>
              <div class="money-input-wrap">
                <span>R$</span>
                <input class="input-luxury money-input" name="amount" inputmode="decimal" required placeholder="0,00" />
              </div>
            </div>
            <div>
              <label class="mb-2 block text-sm text-slate-300">Data</label>
              <input class="input-luxury" name="date" type="date" value="${localISO(new Date())}" required />
            </div>
            <div class="md:col-span-2 xl:col-span-2">
              <label class="mb-2 block text-sm text-slate-300">Conta principal</label>
              <select class="input-luxury" name="financialAccountId">
                ${renderFinancialAccountOptions('', true)}
              </select>
            </div>
            <div class="md:col-span-2 xl:col-span-3">
              <label class="mb-2 block text-sm text-slate-300">Descrição</label>
              <input class="input-luxury" name="description" placeholder="Ex.: Aporte na reserva" />
            </div>
            <button class="btn-primary md:col-span-2 xl:col-span-5" type="submit">${icon('arrow-right-left', 'h-4 w-4')} Registrar movimentação</button>
          </form>
        </article>

        <article class="glass app-card p-5 sm:p-6">
          <div class="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 class="text-lg font-semibold tracking-tight">Seus cofrinhos</h3>
              <p class="mt-1 text-sm text-slate-400">Cards com saldo, risco, aportes e variação mensal.</p>
            </div>
            <input type="text" class="input-luxury max-w-56" id="searchInvestmentAccount" placeholder="Buscar..." />
          </div>

          <div id="investmentAccountsList" class="grid grid-cols-1 gap-3 2xl:grid-cols-2">
            ${investmentAccounts.length ? investmentAccounts.map((acc) => renderInvestmentAccountCard(acc, investmentTypeColors)).join('') : emptyState('Nenhum cofrinho/investimento cadastrado.')}
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderInvestmentAccountCard(acc, typeColors = {}) {
  const typeLabels = {
    stock: 'Ações',
    crypto: 'Criptomoedas',
    reits: 'Fundos Imobiliários',
    fixed_income: 'Renda Fixa',
    fund: 'Fundos',
    pension: 'Previdência',
    other: 'Outro'
  };

  const institution = (state.financialInstitutions || []).find((i) => i.id === acc.institutionId);
  const balance = finance.computeInvestmentAccountBalance(acc, state.transactions);
  const monthTransactions = (state.transactions || [])
    .filter((tx) => isInvestmentTransactionType(tx.type) && tx.investmentAccountId === acc.id && tx.date.slice(0, 7) === currentPeriodKey());
  const investmentMonth = monthTransactions
    .filter((tx) => tx.type === 'investment' || tx.type === 'investment_deposit')
    .reduce((sum, tx) => finance.addMoney(sum, tx.amount), 0);
  const variationMonth = monthTransactions.reduce((sum, tx) => {
    if (tx.type === 'investment_gain') return finance.addMoney(sum, tx.amount);
    if (tx.type === 'investment_loss') return finance.subtractMoney(sum, tx.amount);
    return sum;
  }, 0);

  return `
    <article class="investment-card" style="${institutionStyleVars(institution)}">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex items-center gap-3">
          ${institutionAvatar(institution, 'h-11 w-11')}
          <div class="min-w-0">
            <h4 class="truncate font-semibold text-slate-100">${escapeHtml(acc.nickname || acc.name)}</h4>
            <p class="truncate text-sm text-slate-400">${institution?.name || 'Instituição desconhecida'}</p>
          </div>
        </div>
        <div class="flex shrink-0 gap-1">
          <button class="icon-ghost h-10 w-10 p-0" data-edit-investment="${escapeHtml(acc.id)}" title="Editar">${icon('pencil', 'h-4 w-4')}</button>
          <button class="icon-ghost h-10 w-10 p-0" data-delete-investment="${escapeHtml(acc.id)}" title="Deletar">${icon('trash-2', 'h-4 w-4')}</button>
        </div>
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-2">
        <span class="tag ${typeColors[acc.investmentType] || 'tag-slate'}">${typeLabels[acc.investmentType] || acc.investmentType}</span>
        <span class="tag ${acc.isActive ? 'tag-emerald' : 'tag-slate'}">${acc.isActive ? 'Ativo' : 'Inativo'}</span>
        <span class="tag tag-slate">${escapeHtml(acc.riskProfile || 'balanced')}</span>
      </div>

      <div class="mt-5">
        <p class="text-sm text-slate-400">Total reservado</p>
        <p class="mt-1 text-3xl font-semibold tracking-tight text-slate-50">${currency.format(balance)}</p>
      </div>

      <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div class="mini-stat">
          <span>Aportes mês</span>
          <strong>${currency.format(investmentMonth)}</strong>
        </div>
        <div class="mini-stat">
          <span>Variação mês</span>
          <strong class="${variationMonth >= 0 ? 'text-emerald-300' : 'text-rose-300'}">${currency.format(variationMonth)}</strong>
        </div>
      </div>

      ${acc.notes ? `<p class="mt-4 line-clamp-2 text-sm text-slate-500">${escapeHtml(acc.notes)}</p>` : ''}
    </article>
  `;
}

function renderGoalsPage() {
  const goal = getGoalProgress();

  return `
    <section class="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <article class="glass rounded-[28px] p-5 sm:p-6">
        <div class="flex items-start gap-3">
          <span class="feature-icon feature-icon-emerald">${icon('piggy-bank', 'h-5 w-5')}</span>
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Cofrinho da meta</p>
            <h2 class="mt-2 text-xl font-semibold tracking-tight">Configurar meta</h2>
          </div>
        </div>

        <form id="goalForm" class="mt-6 space-y-4">
          <div>
            <label class="mb-2 block text-sm text-slate-300">Nome da meta</label>
            <input class="input-luxury" name="goalName" value="${escapeHtml(state.goal.name)}" placeholder="Ex.: Reserva de emergência" />
          </div>
          <div>
            <label class="mb-2 block text-sm text-slate-300">Valor alvo</label>
            <div class="money-input-wrap">
              <span>R$</span>
              <input class="input-luxury money-input" name="goalTarget" inputmode="decimal" value="${state.goal.target || ''}" placeholder="0,00" />
            </div>
          </div>
          <div>
            <label class="mb-2 block text-sm text-slate-300">Valor guardado</label>
            <div class="money-input-wrap">
              <span>R$</span>
              <input class="input-luxury money-input" name="goalCurrentAmount" inputmode="decimal" value="${state.goal.currentAmount || ''}" placeholder="0,00" />
            </div>
          </div>
          <button class="btn-primary w-full" type="submit">${icon('save', 'h-4 w-4')} Salvar cofrinho</button>
        </form>

        <form id="goalContributionForm" class="mt-5 rounded-[22px] border border-white/10 bg-white/5 p-4">
          <label class="mb-2 block text-sm text-slate-300">Adicionar aporte ao cofrinho</label>
          <div class="flex gap-2">
            <div class="money-input-wrap flex-1">
              <span>R$</span>
              <input class="input-luxury money-input" name="goalContribution" inputmode="decimal" placeholder="0,00" />
            </div>
            <button class="btn-secondary shrink-0" type="submit" aria-label="Adicionar aporte">${icon('plus', 'h-4 w-4')}</button>
          </div>
        </form>
      </article>

      <div class="grid gap-6">
        <article class="glass rounded-[28px] p-6">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Progresso independente</p>
              <h2 class="mt-2 text-2xl font-semibold tracking-tight">${escapeHtml(state.goal.name)}</h2>
              <p class="mt-2 text-sm text-slate-400">Esse cofrinho não usa seu saldo real automaticamente. Você controla o valor guardado.</p>
            </div>
            <span class="tag ${goal.progress >= 100 ? 'tag-emerald' : 'tag-violet'}">${goal.progress.toFixed(1)}%</span>
          </div>

          <div class="mt-6 progress-track h-4">
            <div class="progress-bar bg-violet-400" style="width:${Math.min(100, goal.progress)}%"></div>
          </div>

          <div class="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div class="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p class="text-slate-400">Guardado no cofrinho</p>
              <p class="mt-2 text-xl font-semibold">${currency.format(goal.currentAmount)}</p>
            </div>
            <div class="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p class="text-slate-400">Valor alvo</p>
              <p class="mt-2 text-xl font-semibold">${currency.format(goal.target)}</p>
            </div>
            <div class="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p class="text-slate-400">Falta conquistar</p>
              <p class="mt-2 text-xl font-semibold">${currency.format(goal.remaining)}</p>
            </div>
          </div>
        </article>

        <article class="glass rounded-[28px] p-6">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-xl font-semibold tracking-tight">Estratégia sugerida</h3>
              <p class="mt-1 text-sm text-slate-400">Estimativa com base nos seus aportes mensais atuais.</p>
            </div>
          </div>
          <div class="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p class="text-slate-400">Percentual restante</p>
              <p class="mt-2 text-xl font-semibold">${Math.max(0, 100 - goal.progress).toFixed(1)}%</p>
            </div>
            <div class="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p class="text-slate-400">Meses estimados</p>
              <p class="mt-2 text-xl font-semibold">${estimateMonthsToGoal(goal.remaining)}</p>
            </div>
            <div class="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p class="text-slate-400">Próximo passo</p>
              <p class="mt-2 text-base font-medium">${goal.progress >= 100 ? 'Meta já alcançada' : 'Adicionar aportes recorrentes ao cofrinho'}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderCalculatorPage() {
  const projection = compoundProjection();
  const monthlyExpense = getMonthlySummary(new Date()).expense || 1;
  const independenceTarget = monthlyExpense * 12 * 25;
  const passiveMonthly = projection.futureValue * 0.04 / 12;
  const yearsToTarget = projection.futureValue >= independenceTarget ? 'Dentro do cenário atual' : 'Aumente aportes ou prazo';

  return `
    <section class="grid grid-cols-1 gap-6 xl:grid-cols-[470px_minmax(0,1fr)]">
      <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Simulação integrada</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight">Calculadora de juros compostos</h2>
        </div>

        <form id="calculatorForm" class="mt-6 space-y-4">
          <div>
            <label class="mb-2 block text-sm text-slate-300">Capital inicial</label>
            <input class="input-luxury" name="initialAmount" type="number" min="0" step="0.01" inputmode="decimal" value="${state.calculator.initialAmount}" />
          </div>
          <div>
            <label class="mb-2 block text-sm text-slate-300">Aporte mensal</label>
            <input class="input-luxury" name="monthlyContribution" type="number" min="0" step="0.01" inputmode="decimal" value="${state.calculator.monthlyContribution}" />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="mb-2 block text-sm text-slate-300">Taxa anual (%)</label>
              <input class="input-luxury" name="annualRate" type="number" min="0" step="0.01" inputmode="decimal" value="${state.calculator.annualRate}" />
            </div>
            <div>
              <label class="mb-2 block text-sm text-slate-300">Anos</label>
              <input class="input-luxury" name="years" type="number" min="1" step="1" inputmode="numeric" value="${state.calculator.years}" />
            </div>
          </div>
          <button class="btn-primary w-full" type="submit">Projetar cenário</button>
        </form>
      </article>

      <div class="grid gap-6">
        <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${metricCard('Patrimônio futuro', currency.format(projection.futureValue), 'Capital estimado no fim do período.', 'violet')}
          ${metricCard('Total aportado', currency.format(projection.invested), 'Soma do capital inicial com contribuições.', 'emerald')}
          ${metricCard('Juros acumulados', currency.format(projection.interest), 'Valor gerado pelo tempo e pela taxa.', 'emerald')}
          ${metricCard('Renda mensal estimada', currency.format(passiveMonthly), 'Estimativa simples com regra dos 4%.', 'violet')}
        </section>

        <article class="glass rounded-[30px] p-6 hover-lift">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-xl font-semibold tracking-tight">Independência financeira</h3>
              <p class="mt-1 text-sm text-slate-400">Meta aproximada baseada no seu gasto mensal atual multiplicado por 25 anos.</p>
            </div>
            <span class="tag tag-slate">${currency.format(independenceTarget)}</span>
          </div>

          <div class="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p class="text-slate-400">Gasto mensal atual</p>
              <p class="mt-2 text-xl font-semibold">${currency.format(monthlyExpense)}</p>
            </div>
            <div class="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p class="text-slate-400">Objetivo de patrimônio</p>
              <p class="mt-2 text-xl font-semibold">${currency.format(independenceTarget)}</p>
            </div>
            <div class="rounded-[22px] border border-white/10 bg-white/5 p-4">
              <p class="text-slate-400">Leitura do cenário</p>
              <p class="mt-2 text-base font-medium">${yearsToTarget}</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderCalendarPage() {
  const date = ui.calendarDate;
  const label = monthLabel.format(date).replace(/^\w/, (match) => match.toUpperCase());
  const grid = buildCalendar(date);
  const mobileAgenda = buildCalendarMobileAgenda(date);
  const selected = ui.selectedCalendarDate ? renderCalendarDayDetails(ui.selectedCalendarDate) : '';

  return `
    <section class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
      <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Visualização mensal</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight">Calendário de contas</h2>
          <p class="mt-1 text-sm text-slate-400">Inclui recorrências, despesas pontuais e assinaturas ativas.</p>
        </div>
        <div class="flex items-center gap-3">
          <button id="prevCalendarBtn" class="btn-secondary" aria-label="Mês anterior">${icon('chevron-left', 'h-4 w-4')}</button>
          <span class="min-w-[180px] text-center text-sm font-medium text-slate-200">${label}</span>
          <button id="nextCalendarBtn" class="btn-secondary" aria-label="Próximo mês">${icon('chevron-right', 'h-4 w-4')}</button>
        </div>
      </div>

      <div class="mt-6 space-y-3 md:hidden">
        ${mobileAgenda.join('')}
      </div>

      <div class="mt-6 hidden overflow-x-auto pb-2 md:block">
        <div class="min-w-[820px]">
          <div class="grid grid-cols-7 gap-3 text-center text-sm text-slate-400">
            ${['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => `<div>${day}</div>`).join('')}
          </div>

          <div class="mt-3 grid grid-cols-7 gap-3">
            ${grid.join('')}
          </div>
        </div>
      </div>

      ${selected}
    </section>
  `;
}

function buildCalendar(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const dueMap = groupDueItemsByDay(year, month);
  const cells = [];

  for (let blank = 0; blank < firstDay; blank += 1) {
    cells.push('<div class="rounded-[24px] border border-white/8 bg-white/[0.02]" aria-hidden="true"></div>');
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const items = dueMap[day] || [];
    const amount = sumAmount(items);
    const isPeak = amount >= 500;
    const today = new Date();
    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;

    const dateIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    cells.push(`
      <article class="calendar-day glass rounded-[24px] p-3 ${ui.selectedCalendarDate === dateIso ? 'selected' : ''}" data-calendar-day="${dateIso}" tabindex="0" role="button" aria-label="Abrir detalhes do dia ${day}">
        <div class="flex items-center justify-between gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-xl ${isToday ? 'bg-violet-500/25 text-violet-200' : 'bg-white/5 text-slate-200'}">${day}</span>
          ${items.length ? `<span class="tag ${isPeak ? 'tag-rose' : 'tag-slate'}">${currency.format(getCalendarSummary(items).realized)}</span>` : ''}
        </div>

        <div class="mt-3 space-y-2 text-xs">
          ${items.slice(0, 3).map((item) => `
            ${calendarTransactionPill(item, true)}
          `).join('') || '<div class="text-slate-500">Livre</div>'}
          ${items.length > 3 ? `<div class="text-slate-500">+ ${items.length - 3} item(ns)</div>` : ''}
        </div>
      </article>
    `);
  }

  return cells;
}

function renderCalendarDayDetails(dateIso) {
  const date = parseLocalDate(dateIso);
  const items = getCalendarItemsForDate(date);
  const summary = getCalendarSummary(items);
  return `
    <aside class="mt-6 rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Detalhe do dia</p>
          <h3 class="mt-2 text-xl font-semibold tracking-tight">${formatDate(dateIso)}</h3>
        </div>
        <div class="flex flex-wrap gap-2">
          <span class="tag tag-emerald">Realizado: ${currency.format(summary.realized)}</span>
          <span class="tag ${summary.pending ? 'tag-rose' : 'tag-slate'}">Pendente: ${currency.format(summary.pending)}</span>
        </div>
      </div>
      <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        ${items.length ? items.map((item) => `
          <div class="rounded-[22px] border p-4 ${scheduleToneClass(item.tone)}">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate font-semibold text-slate-100">${escapeHtml(item.title)}</p>
                <div class="mt-2">${transactionOriginCell(item, true)}</div>
              </div>
              <strong class="shrink-0 text-sm">${currency.format(item.amount)}</strong>
            </div>
          </div>
        `).join('') : emptyState('Nenhuma movimentação ou vencimento neste dia.')}
      </div>
    </aside>
  `;
}

function buildCalendarMobileAgenda(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const todayIso = localISO(new Date());
  const items = [];

  for (let day = 1; day <= totalDays; day += 1) {
    const date = new Date(year, month, day);
    const dayItems = getCalendarItemsForDate(date);
    const summary = getCalendarSummary(dayItems);
    const isToday = localISO(date) === todayIso;

    items.push(`
      <article class="rounded-[22px] border border-white/10 bg-white/5 p-4 ${isToday ? 'ring-1 ring-violet-400/40' : ''}" data-calendar-day="${localISO(date)}" tabindex="0" role="button" aria-label="Abrir detalhes de ${formatDate(localISO(date))}">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.22em] text-slate-500">${date.toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
            <p class="mt-1 text-base font-semibold text-slate-100">${String(day).padStart(2, '0')} • ${monthLabel.format(date)}</p>
          </div>
          ${dayItems.length ? `<span class="tag tag-slate">${dayItems.length} item(ns)</span>` : ''}
        </div>
        ${dayItems.length ? `
          <div class="mt-3 flex flex-wrap gap-2">
            <span class="tag tag-emerald">Realizado ${currency.format(summary.realized)}</span>
            <span class="tag ${summary.pending ? 'tag-rose' : 'tag-slate'}">Pendente ${currency.format(summary.pending)}</span>
          </div>
        ` : ''}
        <div class="mt-4 space-y-2 text-sm">
          ${dayItems.length ? dayItems.slice(0, 4).map((item) => `
            ${calendarTransactionPill(item, false)}
          `).join('') : '<div class="text-sm text-slate-500">Sem movimentações neste dia.</div>'}
        </div>
      </article>
    `);
  }

  return items;
}

function renderBudgetsPage() {
  const status = getBudgetStatus();
  const categories = getAvailableCategories();
  const selectedCategory = valueOf('draftBudgetCategory', categories[0] || 'Outros');
  const isCustomCategory = selectedCategory === '__custom__';

  return `
    <section class="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Novo limite</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight">Orçamento por categoria</h2>
        </div>

        <form id="budgetForm" class="mt-6 space-y-4">
          <div>
            <label class="mb-2 block text-sm text-slate-300">Categoria</label>
            <div class="select-wrap">
              <select class="select-luxury" id="budgetCategory" name="category">
                ${renderCategoryOptions(categories, selectedCategory)}
              </select>
            </div>
          </div>
          <div id="budgetCustomCategoryWrap" class="${isCustomCategory ? '' : 'hidden'}">
            <label class="mb-2 block text-sm text-slate-300">Nova categoria</label>
            <input class="input-luxury" id="budgetCustomCategory" name="customCategory" placeholder="Ex.: Pets, Viagem, Educação" ${isCustomCategory ? 'required' : ''} />
          </div>
          <div>
            <label class="mb-2 block text-sm text-slate-300">Limite mensal</label>
            <input class="input-luxury" name="limit" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0,00" required />
          </div>
          <button class="btn-primary w-full" type="submit">Salvar orçamento</button>
        </form>
      </article>

      <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Planejamento mensal</p>
            <h2 class="mt-2 text-2xl font-semibold tracking-tight">Acompanhamento dos limites</h2>
          </div>
          <span class="tag ${status.overCount ? 'tag-rose' : 'tag-emerald'}">${status.overCount} acima</span>
        </div>

        <div class="mt-6 space-y-4">
          ${state.budgets.length ? state.budgets.map((budget) => renderBudgetRow(budget)).join('') : emptyState('Nenhum orçamento cadastrado ainda.')}
        </div>
      </article>
    </section>
  `;
}

function renderBudgetRow(budget) {
  const spent = getCurrentMonthCategoryExpense(budget.category);
  const ratio = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
  const color = ratio > 100 ? 'bg-rose-400' : ratio > 85 ? 'bg-amber-400' : 'bg-emerald-400';

  return `
    <div class="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 class="text-lg font-semibold tracking-tight">${escapeHtml(budget.category)}</h3>
          <p class="mt-1 text-sm text-slate-400">Gasto atual: ${currency.format(spent)} / Limite: ${currency.format(budget.limit)}</p>
        </div>
        <button class="btn-danger px-3 py-2 text-xs" data-delete-budget="${budget.id}">Excluir</button>
      </div>
      <div class="mt-4 progress-track h-3">
        <div class="progress-bar ${color}" style="width:${Math.min(100, ratio)}%"></div>
      </div>
      <div class="mt-2 flex items-center justify-between text-sm text-slate-300">
        <span>${ratio.toFixed(0)}% usado</span>
        <span>${ratio > 100 ? 'Acima do limite' : 'Dentro do planejado'}</span>
      </div>
    </div>
  `;
}

function renderSubscriptionsPage() {
  const total = getActiveSubscriptionsTotal();
  const pending = getPendingSubscriptions(currentPeriodKey());
  const categories = getAvailableCategories();
  const selectedCategory = valueOf('draftSubscriptionCategory', 'Assinaturas');
  const isCustomCategory = selectedCategory === '__custom__';

  return `
    <section class="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
      <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Novo serviço</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight">Gerenciar assinaturas</h2>
        </div>

        <form id="subscriptionForm" class="mt-6 space-y-4">
          <div>
            <label class="mb-2 block text-sm text-slate-300">Nome</label>
            <input class="input-luxury" name="name" placeholder="Ex.: Netflix" required />
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="mb-2 block text-sm text-slate-300">Valor mensal</label>
              <input class="input-luxury" name="amount" type="number" min="0" step="0.01" inputmode="decimal" required />
            </div>
            <div>
              <label class="mb-2 block text-sm text-slate-300">Dia de cobrança</label>
              <input class="input-luxury" name="dueDay" type="number" min="1" max="31" inputmode="numeric" required />
            </div>
          </div>
          <div>
            <label class="mb-2 block text-sm text-slate-300">Categoria</label>
            <div class="select-wrap">
              <select class="select-luxury" id="subscriptionCategory" name="category">
                ${renderCategoryOptions(categories, selectedCategory)}
              </select>
            </div>
          </div>
          <div id="subscriptionCustomCategoryWrap" class="${isCustomCategory ? '' : 'hidden'}">
            <label class="mb-2 block text-sm text-slate-300">Nova categoria</label>
            <input class="input-luxury" id="subscriptionCustomCategory" name="customCategory" placeholder="Ex.: Trabalho, Casa, Saúde" ${isCustomCategory ? 'required' : ''} />
          </div>
          <button class="btn-primary w-full" type="submit">Adicionar assinatura</button>
        </form>
      </article>

      <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Custos recorrentes</p>
            <h2 class="mt-2 text-2xl font-semibold tracking-tight">Assinaturas ativas</h2>
          </div>
          <div class="flex flex-wrap gap-2">
            <span class="tag tag-violet">${currency.format(total)}/mês</span>
            <span class="tag ${pending.length ? 'tag-rose' : 'tag-emerald'}">${pending.length} pendente(s)</span>
          </div>
        </div>

        <div class="mt-6 space-y-4">
          ${state.subscriptions.length ? state.subscriptions.map((subscription) => renderSubscriptionRow(subscription)).join('') : emptyState('Nenhuma assinatura cadastrada.')}
        </div>
      </article>
    </section>
  `;
}

function renderSubscriptionRow(subscription) {
  const nextCharge = getNextChargeDate(subscription.dueDay);
  const period = currentPeriodKey();
  const payment = getSubscriptionPayment(subscription, period);
  const status = finance.getSubscriptionStatus(subscription, period, localISO(new Date()));
  const isPaid = status === 'paid';
  const statusMeta = getSubscriptionStatusMeta(status);
  const dueDate = finance.getSubscriptionDueDate(subscription, period);
  const paymentInputId = `paymentDate-${subscription.id}`;
  return `
    <div class="rounded-[24px] border ${statusMeta.cardClass} p-4">
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-3">
            <span class="category-icon ${statusMeta.iconClass}">${icon(statusMeta.icon, 'h-4 w-4')}</span>
            <h3 class="min-w-0 break-words text-lg font-semibold tracking-tight">${escapeHtml(subscription.name)}</h3>
            <span class="tag ${statusMeta.tagClass}">${statusMeta.label}</span>
          </div>
          <p class="mt-1 text-sm text-slate-400">
            ${currency.format(subscription.amount)} • ${escapeHtml(subscription.category || 'Assinaturas')} • vence em ${dueDate ? formatDate(dueDate) : `dia ${subscription.dueDay}`} • próxima cobrança em ${nextCharge}
            ${payment ? ` • pago em ${formatDate(payment.paidAt)}` : ''}
          </p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center md:justify-end">
          ${isPaid ? `
            <button class="btn-secondary min-h-11 px-3 py-2 text-sm" data-unpay-subscription="${subscription.id}">
              ${icon('undo-2', 'h-3.5 w-3.5')} Desfazer
            </button>
          ` : status === 'paused' ? '' : `
            <input class="input-luxury subscription-payment-date" id="${paymentInputId}" type="date" value="${localISO(new Date())}" aria-label="Data de pagamento de ${escapeHtml(subscription.name)}" />
            <button class="btn-success min-h-11 px-3 py-2 text-sm" data-pay-subscription="${subscription.id}" data-payment-input="${paymentInputId}">
              ${icon('check', 'h-3.5 w-3.5')} Marcar pago
            </button>
          `}
          <button class="btn-secondary min-h-11 px-3 py-2 text-sm" data-toggle-subscription="${subscription.id}">
            ${icon(subscription.active ? 'pause' : 'play', 'h-3.5 w-3.5')} ${subscription.active ? 'Pausar' : 'Ativar'}
          </button>
          <button class="btn-danger h-11 w-11 p-0" data-delete-subscription="${subscription.id}" aria-label="Excluir assinatura">${icon('trash-2', 'h-4 w-4')}</button>
        </div>
      </div>
    </div>
  `;
}

function getSubscriptionStatusMeta(status) {
  if (status === 'paid') {
    return { label: 'Paga', icon: 'circle-check', tagClass: 'tag-emerald', iconClass: 'category-icon-emerald', cardClass: 'border-emerald-400/20 bg-emerald-400/10' };
  }
  if (status === 'paused') {
    return { label: 'Pausada', icon: 'pause-circle', tagClass: 'tag-slate', iconClass: 'category-icon-violet', cardClass: 'border-white/10 bg-white/5' };
  }
  if (status === 'overdue') {
    return { label: 'Atrasada', icon: 'circle-alert', tagClass: 'tag-rose', iconClass: 'category-icon-rose', cardClass: 'border-rose-400/25 bg-rose-400/12' };
  }
  return { label: 'Pendente', icon: 'clock-3', tagClass: 'tag-violet', iconClass: 'category-icon-violet', cardClass: 'border-violet-400/20 bg-violet-400/10' };
}

function renderReportsPage() {
  const insights = getReportInsights();
  const sourceSummary = getPaymentSourceSummary();
  return `
    <section class="grid grid-cols-1 gap-6">
      <div class="report-filter-bar">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Relatórios</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight">Leitura financeira do período</h2>
        </div>
        <div class="period-tabs" role="list" aria-label="Período dos relatórios">
          ${['Diário', 'Semanal', 'Mensal', 'Anual'].map((label, index) => `<span class="period-tab ${index === 2 ? 'active' : ''}">${label}</span>`).join('')}
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        ${metricCard('Maior categoria do mês', insights.topCategory.label, insights.topCategory.detail, 'rose')}
        ${metricCard('Despesa média diária', currency.format(insights.avgDailyExpense), 'Média aproximada no mês corrente.', 'emerald')}
        ${metricCard('Runway estimado', insights.runwayLabel, 'Meses que o saldo cobriria no ritmo atual.', 'violet')}
        ${metricCard('Saldo líquido mensal', currency.format(insights.monthlyNet), 'Receitas menos despesas e investimentos.', 'emerald')}
      </div>

      <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        ${chartCard('Despesas por categoria', 'Leitura visual do peso de cada categoria no mês atual.', 'reportCategoryChart')}
        ${chartCard('Saldo mensal', 'Compara a geração líquida de caixa mês a mês.', 'reportBalanceChart')}
        ${chartCard('Receitas versus despesas', 'Entradas e saídas lado a lado nos últimos 6 meses.', 'reportIncomeExpenseChart')}
        ${chartCard('Rendimento dos investimentos', 'Rendimento líquido mensal dos cofrinhos/investimentos.', 'reportInvestmentChart')}
      </section>

      <section class="glass app-card p-5 sm:p-6 hover-lift">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-xl font-semibold tracking-tight">Contas, cartões e métodos</h2>
            <p class="mt-1 text-sm text-slate-400">Relatórios individuais por origem financeira sem misturar método de pagamento com conta/cartão.</p>
          </div>
          <a href="#/accounts" class="btn-secondary">${icon('wallet-cards', 'h-4 w-4')} Gerenciar</a>
        </div>
        <div class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          ${renderPaymentSourceReportCard('Gastos por cartão', sourceSummary.creditCards)}
          ${renderPaymentSourceReportCard('Gastos por conta', sourceSummary.accounts)}
          ${renderPaymentSourceReportCard('Gastos por método', sourceSummary.methods)}
          ${renderPaymentSourceReportCard('Receitas por conta', sourceSummary.incomeAccounts)}
          ${renderPaymentSourceReportCard('Investimentos por conta/corretora', sourceSummary.investmentAccounts)}
          ${renderPaymentSourceReportCard('Ranking de instituições', sourceSummary.institutions)}
        </div>
      </section>
    </section>
  `;
}

function renderPaymentSourceReportCard(title, rows) {
  const list = (rows || []).slice(0, 5);
  return `
    <article class="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <h3 class="text-base font-semibold tracking-tight">${escapeHtml(title)}</h3>
      <div class="mt-4 space-y-3">
        ${list.length ? list.map((row) => `
          <div class="report-source-row">
            <span class="min-w-0">${renderReportEntity(row, title)}</span>
            <strong class="shrink-0 text-slate-100">${currency.format(row.amount)}</strong>
          </div>
        `).join('') : '<p class="text-sm text-slate-500">Sem dados suficientes no período.</p>'}
      </div>
    </article>
  `;
}

function renderAlertsPage() {
  const alerts = buildAlerts();

  return `
    <section class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Radar financeiro</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight">Alertas e oportunidades</h2>
          <p class="mt-1 text-sm text-slate-400">Sinais úteis para agir antes que o orçamento aperte.</p>
        </div>
        <span class="tag ${alerts.length ? 'tag-rose' : 'tag-emerald'}">${alerts.length} alerta(s)</span>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4">
        ${alerts.length ? alerts.map((alert) => `
          <article class="rounded-[24px] border border-white/10 bg-white/5 p-5 hover-lift">
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div class="flex items-center gap-3">
                  <span class="tag ${alert.tone === 'danger' ? 'tag-rose' : alert.tone === 'success' ? 'tag-emerald' : 'tag-violet'}">${alert.label}</span>
                  <h3 class="text-lg font-semibold tracking-tight">${alert.title}</h3>
                </div>
                <p class="mt-3 text-sm leading-relaxed text-slate-300">${alert.description}</p>
              </div>
              <a href="${alert.href}" class="btn-secondary">Abrir</a>
            </div>
          </article>
        `).join('') : emptyState('Tudo bem por aqui. Nenhum alerta crítico no momento.')}
      </div>
    </section>
  `;
}

function renderBackupPage() {
  return `
    <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Proteção local</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight">Backup e restauração</h2>
          <p class="mt-1 text-sm text-slate-400">Exporte tudo em JSON ou importe um backup salvo anteriormente.</p>
        </div>

        <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button id="exportBackupBtn" class="btn-primary">Exportar JSON</button>
          <label class="btn-secondary cursor-pointer">
            Importar JSON
            <input id="importBackupInput" type="file" accept=".json,application/json" class="hidden" />
          </label>
          <button id="clearAllBtn" class="btn-danger">Limpar tudo</button>
        </div>
      </article>

      <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
        <div>
          <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Perfil</p>
          <h2 class="mt-2 text-2xl font-semibold tracking-tight">Minha conta</h2>
        </div>

        <form id="profileForm" class="mt-6 space-y-4">
          <div>
            <label class="mb-2 block text-sm text-slate-300">Nome</label>
            <input class="input-luxury" name="name" value="${escapeHtml(state.profile.name || auth.name || '')}" required />
          </div>
          <div>
            <label class="mb-2 block text-sm text-slate-300">E-mail</label>
            <input class="input-luxury" name="email" type="email" value="${escapeHtml(state.profile.email || auth.email || '')}" required />
          </div>
          <div class="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
            Seu perfil, metas, transações, orçamentos, assinaturas e projeções ficam salvos na sua conta ${BRAND_NAME}.
          </div>
          <button class="btn-primary w-full" type="submit">Salvar perfil</button>
        </form>
      </article>
    </section>
  `;
}

function renderTransactionListItem(tx) {
  const typeMeta = getTypeMeta(tx.type);
  return `
    <div class="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div class="flex items-center gap-3">
            <h3 class="font-semibold">${escapeHtml(tx.description)}</h3>
            ${typeBadge(tx.type)}
          </div>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <span class="text-sm text-slate-400">${escapeHtml(tx.category)} • ${formatDate(tx.date)}${tx.recurring ? ' • recorrente' : ''}</span>
            ${compactOriginPill(tx)}
          </div>
        </div>
        <div class="text-right font-semibold ${typeMeta.textClass}">${currency.format(tx.amount)}</div>
      </div>
    </div>
  `;
}

function renderFinancialAccountCard(account) {
  const institution = getInstitutionById(account.institutionId);
  const stats = getAccountStats(account);
  const isCredit = account.type === 'credit_card';
  const isCard = ['credit_card', 'debit_card', 'prepaid_card', 'benefits_card'].includes(account.type);
  const available = isCredit && account.creditLimit ? Math.max(0, account.creditLimit - stats.monthExpense) : null;
  const canDelete = !state.transactions.some((tx) => tx.financialAccountId === account.id);
  if (isCard) {
    return renderCreditCardPreview(account, { stats, available, canDelete, interactive: true });
  }
  return `
    <article class="account-card bank-account-card rounded-[22px] border border-white/10 bg-white/5 p-4" style="${institutionStyleVars(institution, account.color)}">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          ${institutionAvatar(institution, 'h-11 w-11')}
          <div class="min-w-0">
            <h3 class="truncate text-base font-semibold text-slate-50">${escapeHtml(account.nickname || account.name)}</h3>
            <p class="mt-1 truncate text-sm text-slate-400">${escapeHtml(institution?.name || 'Instituição opcional')} • ${escapeHtml(getAccountTypeLabel(account.type))}${account.lastFourDigits ? ` • final ${escapeHtml(account.lastFourDigits)}` : ''}</p>
          </div>
        </div>
        <span class="tag ${account.isActive ? 'tag-emerald' : 'tag-slate'}">${account.isActive ? 'Ativa' : 'Arquivada'}</span>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3">
        <div class="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
          <p class="text-xs text-slate-500">${isCredit ? 'Gasto no mês' : 'Saldo calculado'}</p>
          <p class="mt-1 text-base font-semibold ${isCredit ? 'text-rose-200' : 'text-slate-100'}">${currency.format(isCredit ? stats.monthExpense : stats.balance)}</p>
        </div>
        <div class="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
          <p class="text-xs text-slate-500">${isCredit ? 'Disponível' : 'Movimentado'}</p>
          <p class="mt-1 text-base font-semibold text-slate-100">${currency.format(isCredit ? (available ?? 0) : stats.monthVolume)}</p>
        </div>
      </div>
      <div class="mt-4 flex flex-wrap gap-2">
        ${account.includeInTotalBalance ? '<span class="tag tag-emerald">Inclui no saldo</span>' : ''}
        ${account.cardBrand ? `<span class="tag tag-slate">${escapeHtml(account.cardBrand)}</span>` : ''}
        ${account.paymentMethodIds?.slice(0, 3).map(paymentMethodBadge).join('') || '<span class="tag tag-slate">Sem métodos</span>'}
      </div>
      <div class="mt-4 flex flex-wrap justify-end gap-2">
        <button class="btn-secondary min-h-10 px-3 py-2 text-sm" data-edit-account="${account.id}">${icon('pencil', 'h-3.5 w-3.5')} Editar</button>
        ${account.isActive ? `<button class="btn-secondary min-h-10 px-3 py-2 text-sm" data-archive-account="${account.id}">${icon('archive', 'h-3.5 w-3.5')} Arquivar</button>` : `<button class="btn-secondary min-h-10 px-3 py-2 text-sm" data-restore-account="${account.id}">${icon('rotate-ccw', 'h-3.5 w-3.5')} Ativar</button>`}
        ${canDelete ? `<button class="btn-danger h-10 w-10 p-0" data-delete-account="${account.id}" aria-label="Excluir conta">${icon('trash-2', 'h-4 w-4')}</button>` : ''}
      </div>
    </article>
  `;
}

function renderTransactionRow(tx) {
  const typeMeta = getTypeMeta(tx.type);
  return `
    <tr class="border-t border-white/6">
      <td class="px-4 py-4">
        <div class="flex items-center gap-3">
          <span class="category-icon ${typeMeta.iconClass}">${icon(typeMeta.icon, 'h-4 w-4')}</span>
          <div class="min-w-0">
            <div class="truncate font-semibold text-slate-100">${escapeHtml(tx.description)}</div>
            <div class="mt-1 flex items-center gap-2 text-xs text-slate-500">
              ${icon(tx.recurring ? 'repeat-2' : 'dot', 'h-3.5 w-3.5')}
              <span>${tx.recurring ? 'Recorrente' : 'Pontual'}</span>
            </div>
          </div>
        </div>
      </td>
      <td class="px-4 py-4">${categoryBadge(tx.category)}</td>
      <td class="px-4 py-4">${transactionOriginCell(tx)}</td>
      <td class="px-4 py-4 text-slate-300">${formatDate(tx.date)}</td>
      <td class="px-4 py-4">${typeBadge(tx.type)}</td>
      <td class="px-4 py-4 text-right font-semibold ${typeMeta.textClass}">
        ${currency.format(tx.amount)}
      </td>
      <td class="px-4 py-4 text-right">
        <button class="btn-secondary h-9 w-9 p-0" data-edit-transaction="${tx.id}" aria-label="Editar transação" title="Editar">
          ${icon('pencil', 'h-4 w-4')}
        </button>
        <button class="btn-danger h-9 w-9 p-0" data-delete-transaction="${tx.id}" aria-label="Excluir transação" title="Excluir">
          ${icon('trash-2', 'h-4 w-4')}
        </button>
      </td>
    </tr>
  `;
}

function renderTransactionCard(tx) {
  const typeMeta = getTypeMeta(tx.type);
  return `
    <article class="transaction-card ${tx.type} rounded-[22px] border p-4">
      <div class="flex items-start gap-3">
        <span class="category-icon ${typeMeta.iconClass}">${icon(typeMeta.icon, 'h-4 w-4')}</span>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h3 class="break-words text-base font-semibold leading-snug text-slate-50">${escapeHtml(tx.description)}</h3>
              <p class="mt-1 text-sm text-slate-400">${formatDate(tx.date)}</p>
            </div>
            <strong class="shrink-0 text-right text-base font-semibold ${typeMeta.textClass}">${currency.format(tx.amount)}</strong>
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            ${categoryBadge(tx.category)}
            ${typeBadge(tx.type)}
            ${transactionOriginCell(tx, true)}
            <span class="tag tag-slate">${icon(tx.recurring ? 'repeat-2' : 'circle', 'h-3.5 w-3.5')} ${tx.recurring ? 'Recorrente' : 'Pontual'}</span>
          </div>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
        <button class="btn-secondary mr-2 min-h-11 px-4 py-2 text-sm" data-edit-transaction="${tx.id}" aria-label="Editar transação ${escapeHtml(tx.description)}">
          ${icon('pencil', 'h-4 w-4')} Editar
        </button>
        <button class="btn-danger min-h-11 px-4 py-2 text-sm" data-delete-transaction="${tx.id}" aria-label="Excluir transação ${escapeHtml(tx.description)}">
          ${icon('trash-2', 'h-4 w-4')} Excluir
        </button>
      </div>
    </article>
  `;
}

function priorityCard(title, value, subtitle, href) {
  return `
    <a href="${href}" class="rounded-[24px] border border-white/10 bg-white/5 p-4 hover-lift block">
      <p class="text-sm text-slate-400">${title}</p>
      <p class="mt-2 text-lg font-semibold tracking-tight">${escapeHtml(value)}</p>
      <p class="mt-1 text-sm text-slate-400">${escapeHtml(subtitle)}</p>
    </a>
  `;
}

function emptyState(text) {
  return `<div class="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-400">${escapeHtml(text)}</div>`;
}

function typeBadge(type) {
  const meta = getTypeMeta(type);
  return `<span class="tag ${meta.tagClass}">${icon(meta.icon, 'h-3.5 w-3.5')} ${meta.label}</span>`;
}

function getTypeMeta(type) {
  if (type === 'income') {
    return { label: 'Receita', icon: 'trending-up', tagClass: 'tag-emerald', textClass: 'text-emerald-300', iconClass: 'category-icon-emerald' };
  }
  if (type === 'investment' || type === 'investment_deposit') {
    return { label: 'Aporte', icon: 'arrow-up-right', tagClass: 'tag-violet', textClass: 'text-violet-300', iconClass: 'category-icon-violet' };
  }
  if (type === 'investment_withdrawal') {
    return { label: 'Resgate', icon: 'arrow-down-left', tagClass: 'tag-emerald', textClass: 'text-emerald-300', iconClass: 'category-icon-emerald' };
  }
  if (type === 'investment_gain') {
    return { label: 'Rendimento', icon: 'trending-up', tagClass: 'tag-emerald', textClass: 'text-emerald-300', iconClass: 'category-icon-emerald' };
  }
  if (type === 'investment_loss') {
    return { label: 'Perda', icon: 'trending-down', tagClass: 'tag-rose', textClass: 'text-rose-300', iconClass: 'category-icon-rose' };
  }
  return { label: 'Despesa', icon: 'trending-down', tagClass: 'tag-rose', textClass: 'text-rose-300', iconClass: 'category-icon-rose' };
}

function isInvestmentTransactionType(type) {
  return finance.INVESTMENT_TYPES?.has(type) || ['investment', 'investment_deposit', 'investment_withdrawal', 'investment_gain', 'investment_loss'].includes(type);
}

function getInvestmentMovementCategory(type) {
  if (type === 'investment_withdrawal') return 'Resgate de investimento';
  if (type === 'investment_gain') return 'Rendimento de investimento';
  if (type === 'investment_loss') return 'Perda de investimento';
  return 'Aporte em investimento';
}

function categoryBadge(category) {
  const normalized = normalizeText(category);
  const map = [
    [/sal[aá]rio|freelance|renda|pix/, 'briefcase-business'],
    [/alimenta|mercado|ifood|restaurante/, 'utensils'],
    [/transporte|uber|combust/, 'car'],
    [/moradia|casa|aluguel/, 'house'],
    [/sa[uú]de|farm/, 'heart-pulse'],
    [/educa|curso|livro/, 'graduation-cap'],
    [/lazer|viagem|cinema/, 'ticket'],
    [/invest/, 'landmark'],
    [/assinatura|streaming|internet|redes/, 'repeat-2'],
    [/fam[ií]lia/, 'users'],
    [/cart[aã]o|banco/, 'credit-card']
  ];
  const match = map.find(([pattern]) => pattern.test(normalized));
  const iconName = match?.[1] || 'tag';
  return `<span class="category-badge">${icon(iconName, 'h-3.5 w-3.5')} ${escapeHtml(category)}</span>`;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function scheduleToneClass(tone) {
  if (tone === 'income') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100';
  if (tone === 'investment' || tone === 'investment_deposit') return 'border-violet-400/20 bg-violet-400/10 text-violet-100';
  if (tone === 'investment_withdrawal' || tone === 'investment_gain') return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100';
  if (tone === 'subscription-pending') return 'border-sky-400/20 bg-sky-400/10 text-sky-100';
  if (tone === 'subscription-overdue') return 'border-rose-400/30 bg-rose-400/10 text-rose-100';
  return 'border-rose-400/20 bg-rose-400/10 text-rose-100';
}

function selectOptions(options, currentValue) {
  return options.map(([value, label]) => `<option value="${value}" ${currentValue === value ? 'selected' : ''}>${label}</option>`).join('');
}

function bindCategorySelect(selectId, wrapId, inputId, storageKey) {
  const select = document.getElementById(selectId);
  const wrap = document.getElementById(wrapId);
  const input = document.getElementById(inputId);
  if (!select || !wrap || !input) return;

  const sync = () => {
    const isCustom = select.value === '__custom__';
    wrap.classList.toggle('hidden', !isCustom);
    input.required = isCustom;
    if (!isCustom) input.value = '';
    persistViewValue(storageKey, select.value);
  };

  select.addEventListener('change', sync);
  sync();
}

function resolveCategoryValue({ category, customCategory }) {
  const selected = String(category || '').trim();
  if (selected === '__custom__') {
    const custom = String(customCategory || '').trim();
    return custom || 'Outros';
  }
  return selected || 'Outros';
}

function readPositiveAmount(value) {
  const amount = readMoneyAmount(value);
  return amount > 0 ? amount : 0;
}

function readMoneyAmount(value) {
  const raw = String(value || '').trim();
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw;
  return finance.fromCents(finance.toCents(normalized));
}

function bindLoginPage() {
  bindToastDismiss();
  document.querySelectorAll('[data-auth-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      ui.authMode = button.dataset.authMode === 'register' ? 'register' : 'login';
      render();
    });
  });
  document.getElementById('authForm')?.addEventListener('submit', handleAuthSubmit);
}

function bindShell() {
  bindToastDismiss();
  bindFormModals();
  document.getElementById('openSidebarBtn')?.addEventListener('click', () => {
    ui.sidebarOpen = true;
    syncSidebar();
  });
  document.getElementById('closeSidebarBtn')?.addEventListener('click', () => {
    ui.sidebarOpen = false;
    syncSidebar();
  });
  document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
    ui.sidebarOpen = false;
    syncSidebar();
  });
  document.querySelectorAll('#sidebar a[href^="#/"]').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 1024) {
        ui.sidebarOpen = false;
        syncSidebar();
      }
    });
  });
  document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
}

function bindFormModals() {
  document.querySelectorAll('[data-open-form]').forEach((button) => {
    button.addEventListener('click', () => {
      openEntryForm(button.dataset.openForm);
    });
  });

  document.querySelectorAll('[data-close-form]').forEach((button) => {
    button.addEventListener('click', () => {
      closeEntryForm(button.dataset.closeForm);
    });
  });

  document.querySelectorAll('.form-modal.open').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        const closeButton = modal.querySelector('[data-close-form]');
        closeEntryForm(closeButton?.dataset.closeForm || '');
      }
    });
  });
}

function openEntryForm(kind) {
  if (kind === 'transaction') {
    persistViewValue('editingTransactionId', '');
    persistViewValue('transactionFormOpen', 'true');
  }
  if (kind === 'account') {
    persistViewValue('editingAccountId', '');
    persistViewValue('accountFormOpen', 'true');
  }
  if (kind === 'investment') {
    persistViewValue('editingInvestmentAccountId', '');
    persistViewValue('investmentFormOpen', 'true');
  }
  render();
}

function closeEntryForm(kind) {
  if (kind === 'transaction') {
    persistViewValue('transactionFormOpen', '');
    persistViewValue('editingTransactionId', '');
  }
  if (kind === 'account') {
    persistViewValue('accountFormOpen', '');
    persistViewValue('editingAccountId', '');
    persistViewValue('selectedAccountPreset', '');
  }
  if (kind === 'investment') {
    persistViewValue('investmentFormOpen', '');
    persistViewValue('editingInvestmentAccountId', '');
  }
  render();
}

function bindToastDismiss() {
  document.querySelectorAll('[data-dismiss-toast]').forEach((button) => {
    button.addEventListener('click', () => {
      ui.toast = null;
      render();
    });
  });
}

function showToast(message, type = 'error', title) {
  ui.toast = { message, type, title };
  render();
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    ui.toast = null;
    render();
  }, 5200);
}

function syncSidebar() {
  const overlay = document.getElementById('sidebarOverlay');
  const sidebar = document.getElementById('sidebar');
  if (!overlay || !sidebar) return;
  overlay.className = ui.sidebarOpen ? 'fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden' : 'hidden';
  sidebar.classList.toggle('open', ui.sidebarOpen);
  document.body.classList.toggle('overflow-hidden', ui.sidebarOpen && window.innerWidth < 1024);
}

function bindRoute(route) {
  switch (route) {
    case 'transactions':
      bindTransactionsPage();
      break;
    case 'accounts':
      bindAccountsPage();
      break;
    case 'investments':
      bindInvestmentsPage();
      break;
    case 'goals':
      bindGoalsPage();
      break;
    case 'calculator':
      bindCalculatorPage();
      break;
    case 'calendar':
      bindCalendarPage();
      break;
    case 'budgets':
      bindBudgetsPage();
      break;
    case 'subscriptions':
      bindSubscriptionsPage();
      break;
    case 'backup':
      bindBackupPage();
      break;
    default:
      break;
  }
}

function postRender(route) {
  if (route === 'dashboard') queueChartRender(renderDashboardChart);
  if (route === 'investments') queueChartRender(renderInvestmentCharts);
  if (route === 'reports') queueChartRender(renderReportCharts);
}

function queueChartRender(renderer) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      renderer();
    });
  });
}

function finalizeChart(chart) {
  if (!chart) return;
  window.requestAnimationFrame(() => chart.resize());
  window.setTimeout(() => chart.resize(), 140);
}

async function performAuthRequest(path, credentials) {
  const response = await apiRequest(path, {
    method: 'POST',
    body: credentials
  });

  auth = {
    isAuthenticated: true,
    name: response.user?.name || credentials.name || credentials.email.split('@')[0],
    email: response.user?.email || credentials.email
  };

  const payload = await apiRequest('/api/bootstrap');
  state = mergeDefaults(payload.state || payload);
  state.profile = {
    name: auth.name,
    email: auth.email
  };
  saveState(false);
  render();
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '').trim();
  if (!email || !password || (ui.authMode === 'register' && !name)) return;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = ui.authMode === 'register' ? 'Criando conta...' : 'Entrando...';
  }

  try {
    if (ui.authMode === 'register') {
      await performAuthRequest('/api/auth/register', { name, email, password });
    } else {
      await performAuthRequest('/api/auth/login', { email, password });
    }
  } catch (error) {
    showToast(error.message || 'Não foi possível concluir a autenticação.', 'error', 'Login não realizado');
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = ui.authMode === 'register' ? 'Criar conta e entrar' : 'Entrar agora';
    }
  }
}

async function handleLogout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.warn('Falha ao encerrar sessão no servidor:', error);
  } finally {
    clearAuth();
    state = getDefaultState();
    render();
  }
}

function bindTransactionsPage() {
  bindCategorySelect('transactionCategory', 'transactionCustomCategoryWrap', 'transactionCustomCategory', 'draftTransactionCategory');
  document.getElementById('transactionForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const editingId = String(event.currentTarget.dataset.editingTransactionId || '');
    const data = new FormData(event.currentTarget);
    const category = resolveCategoryValue({
      category: data.get('category'),
      customCategory: data.get('customCategory')
    });
    const amount = readPositiveAmount(data.get('amount'));
    const type = String(data.get('type') || 'expense');
    const investmentAccountId = String(data.get('investmentAccountId') || '');
    if (!amount) {
      showToast('Informe um valor maior que zero.', 'error', 'Transação inválida');
      return;
    }
    if (isInvestmentTransactionType(type) && !investmentAccountId) {
      showToast('Escolha um cofrinho/investimento para esta movimentação.', 'error', 'Cofrinho obrigatório');
      return;
    }

    const nextTransaction = {
      ...(state.transactions.find((tx) => tx.id === editingId) || {}),
      id: editingId || uid(),
      description: String(data.get('description') || '').trim(),
      amount,
      date: String(data.get('date') || localISO(new Date())),
      type,
      category,
      recurring: Boolean(data.get('recurring')),
      financialAccountId: String(data.get('financialAccountId') || ''),
      paymentMethodId: String(data.get('paymentMethodId') || ''),
      investmentAccountId
    };

    state.transactions = editingId
      ? state.transactions.map((tx) => tx.id === editingId ? nextTransaction : tx)
      : [nextTransaction, ...state.transactions];

    persistViewValue('draftTransactionCategory', category);
    persistViewValue('editingTransactionId', '');
    persistViewValue('transactionFormOpen', '');
    saveState();
    render();
  });

  document.getElementById('searchTransaction')?.addEventListener('input', (event) => {
    persistViewValue('searchTransaction', event.target.value);
    render();
  });
  document.getElementById('filterType')?.addEventListener('change', (event) => {
    persistViewValue('filterType', event.target.value);
    render();
  });
  document.getElementById('filterRecurring')?.addEventListener('change', (event) => {
    persistViewValue('filterRecurring', event.target.value);
    render();
  });
  ['filterFinancialAccount', 'filterInstitution', 'filterPaymentMethod', 'filterCardBrand'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', (event) => {
      persistViewValue(id, event.target.value);
      render();
    });
  });
  document.getElementById('transactionFinancialAccount')?.addEventListener('change', (event) => {
    const account = getAccountById(event.target.value);
    const suggestedMethod = getSuggestedPaymentMethodId(account);
    const methodSelect = document.getElementById('transactionPaymentMethod');
    if (methodSelect && suggestedMethod) {
      methodSelect.value = suggestedMethod;
    }
  });
  document.getElementById('filterMonth')?.addEventListener('change', (event) => {
    persistViewValue('filterMonth', event.target.value);
    render();
  });
  document.getElementById('exportTransactionsCsvBtn')?.addEventListener('click', () => {
    const transactions = filterTransactions({
      type: valueOf('filterType', 'all'),
      recurring: valueOf('filterRecurring', 'all'),
      search: valueOf('searchTransaction', ''),
      month: valueOf('filterMonth', localISO(new Date()).slice(0, 7))
    });
    exportTransactionsCsv(transactions);
  });

  document.querySelectorAll('[data-edit-transaction]').forEach((button) => {
    button.addEventListener('click', () => {
      persistViewValue('editingTransactionId', button.dataset.editTransaction);
      persistViewValue('transactionFormOpen', 'true');
      render();
    });
  });
  document.querySelector('[data-cancel-transaction-edit]')?.addEventListener('click', () => {
    persistViewValue('editingTransactionId', '');
    render();
  });

  document.querySelectorAll('[data-delete-transaction]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!confirmAction('Excluir esta transação? Essa ação será salva na sua conta.')) return;
      state.transactions = state.transactions.filter((tx) => tx.id !== button.dataset.deleteTransaction);
      saveState();
      render();
    });
  });
}

function bindAccountsPage() {
  ['selectedAccountPreset', 'searchAccount', 'filterAccountType', 'filterAccountInstitution', 'filterAccountMethod', 'filterAccountStatus'].forEach((id) => {
    document.getElementById(id)?.addEventListener(id === 'searchAccount' ? 'input' : 'change', (event) => {
      persistViewValue(id, event.target.value);
      if (id === 'selectedAccountPreset') persistViewValue('editingAccountId', '');
      render();
    });
  });
  document.querySelectorAll('[data-preset-chip]').forEach((button) => {
    button.addEventListener('click', () => {
      persistViewValue('selectedAccountPreset', button.dataset.presetChip);
      persistViewValue('editingAccountId', '');
      render();
    });
  });

  document.getElementById('financialAccountForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const editingId = String(form.dataset.editingAccountId || '');
    const institution = getInstitutionById(data.get('institutionId'));
    const type = String(data.get('type') || 'checking_account');
    const nickname = String(data.get('nickname') || '').trim();
    const name = String(data.get('name') || nickname || institution?.name || 'Conta financeira').trim();
    if (!nickname || !name) {
      showToast('Informe nome e apelido para a conta/cartão.', 'error', 'Conta inválida');
      return;
    }

    const lastFourDigits = String(data.get('lastFourDigits') || '').replace(/\D/g, '').slice(0, 4);
    const paymentMethodIds = data.getAll('paymentMethodIds').map(String);
    const nextAccount = {
      ...(state.financialAccounts.find((account) => account.id === editingId) || {}),
      id: editingId || uid(),
      institutionId: String(data.get('institutionId') || ''),
      name,
      nickname,
      type,
      subtype: '',
      lastFourDigits,
      cardBrand: String(data.get('cardBrand') || ''),
      color: String(data.get('color') || institution?.brandColor || '#8b7cf6'),
      icon: '',
      initialBalance: readMoneyAmount(data.get('initialBalance')),
      manualBalance: String(data.get('manualBalance') || '').trim() ? readMoneyAmount(data.get('manualBalance')) : null,
      creditLimit: String(data.get('creditLimit') || '').trim() ? readMoneyAmount(data.get('creditLimit')) : null,
      closingDay: normalizeDayInput(data.get('closingDay')),
      dueDay: normalizeDayInput(data.get('dueDay')),
      includeInTotalBalance: Boolean(data.get('includeInTotalBalance')),
      isDefault: Boolean(data.get('isDefault')),
      isActive: true,
      archivedAt: '',
      notes: String(data.get('notes') || '').trim(),
      externalProvider: '',
      externalAccountId: '',
      externalItemId: '',
      lastSyncAt: '',
      syncStatus: '',
      consentExpiresAt: '',
      paymentMethodIds: paymentMethodIds.length ? paymentMethodIds : getDefaultPaymentMethodsForType(type)
    };

    state.financialAccounts = editingId
      ? state.financialAccounts.map((account) => account.id === editingId ? nextAccount : account)
      : [nextAccount, ...state.financialAccounts];

    persistViewValue('editingAccountId', '');
    persistViewValue('accountFormOpen', '');
    persistViewValue('selectedAccountPreset', '');
    saveState();
    render();
  });

  document.querySelectorAll('[data-edit-account]').forEach((button) => {
    button.addEventListener('click', () => {
      persistViewValue('editingAccountId', button.dataset.editAccount);
      persistViewValue('accountFormOpen', 'true');
      persistViewValue('selectedAccountPreset', '');
      render();
    });
  });
  document.querySelector('[data-cancel-account-edit]')?.addEventListener('click', () => {
    persistViewValue('editingAccountId', '');
    render();
  });
  document.querySelectorAll('[data-archive-account]').forEach((button) => {
    button.addEventListener('click', () => {
      state.financialAccounts = state.financialAccounts.map((account) => account.id === button.dataset.archiveAccount
        ? { ...account, isActive: false, archivedAt: new Date().toISOString() }
        : account);
      saveState();
      render();
    });
  });
  document.querySelectorAll('[data-restore-account]').forEach((button) => {
    button.addEventListener('click', () => {
      state.financialAccounts = state.financialAccounts.map((account) => account.id === button.dataset.restoreAccount
        ? { ...account, isActive: true, archivedAt: '' }
        : account);
      saveState();
      render();
    });
  });
  document.querySelectorAll('[data-delete-account]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!confirmAction('Excluir esta conta/cartão?')) return;
      const hasTransactions = state.transactions.some((tx) => tx.financialAccountId === button.dataset.deleteAccount);
      if (hasTransactions) {
        showToast('Esta conta já possui transações. Arquive para preservar o histórico.', 'info', 'Arquivamento recomendado');
        return;
      }
      state.financialAccounts = state.financialAccounts.filter((account) => account.id !== button.dataset.deleteAccount);
      saveState();
      render();
    });
  });
}

function bindInvestmentsPage() {
  const form = document.getElementById('investmentAccountForm');
  const movementForm = document.getElementById('investmentMovementForm');
  const cancelBtn = document.getElementById('cancelInvestmentEdit');
  const searchInput = document.getElementById('searchInvestmentAccount');

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const editingId = form.dataset.editingAccountId;
      const accountId = editingId || uid();
      const institutionId = String(data.get('investmentInstitution') || '');
      const nickname = String(data.get('investmentNickname') || '').trim();
      const type = String(data.get('investmentType') || 'other');
      const accountNumber = String(data.get('investmentAccountNumber') || '').trim();
      const initialInvestment = readMoneyAmount(data.get('investmentInitial'));
      const riskProfile = String(data.get('investmentRiskProfile') || 'balanced');
      const notes = String(data.get('investmentNotes') || '').trim();

      if (!institutionId || !nickname) {
        alert('Instituição e apelido são obrigatórios');
        return;
      }

      const account = {
        id: accountId,
        institutionId,
        name: nickname,
        nickname,
        accountNumber: accountNumber || null,
        initialInvestment,
        currentTotal: initialInvestment,
        currency: 'BRL',
        investmentType: type,
        riskProfile,
        color: '#8b7cf6',
        icon: 'landmark',
        notes,
        isActive: true,
        archivedAt: ''
      };

      if (editingId) {
        const idx = (state.investmentAccounts || []).findIndex((a) => a.id === editingId);
        if (idx !== -1) {
          state.investmentAccounts[idx] = { ...state.investmentAccounts[idx], ...account };
        }
      } else {
        state.investmentAccounts = state.investmentAccounts || [];
        state.investmentAccounts.unshift(account);
      }

      form.dataset.editingAccountId = '';
      form.reset();
      if (cancelBtn) cancelBtn.style.display = 'none';
      persistViewValue('investmentFormOpen', '');
      persistViewValue('editingInvestmentAccountId', '');
      saveState();
      render();
    });
  }

  movementForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const investmentAccountId = String(data.get('investmentAccountId') || '');
    const type = String(data.get('movementType') || 'investment_deposit');
    const amount = readPositiveAmount(data.get('amount'));
    const account = getInvestmentAccountById(investmentAccountId);
    if (!account) {
      showToast('Escolha um cofrinho/investimento válido.', 'error', 'Cofrinho inválido');
      return;
    }
    if (!amount) {
      showToast('Informe um valor maior que zero.', 'error', 'Movimentação inválida');
      return;
    }

    const typeMeta = getTypeMeta(type);
    const description = String(data.get('description') || '').trim() || `${typeMeta.label} - ${account.nickname || account.name}`;
    state.transactions = [{
      id: uid(),
      description,
      amount,
      date: String(data.get('date') || localISO(new Date())),
      type,
      category: getInvestmentMovementCategory(type),
      recurring: false,
      financialAccountId: String(data.get('financialAccountId') || ''),
      paymentMethodId: '',
      investmentAccountId
    }, ...state.transactions];

    saveState();
    render();
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      form.dataset.editingAccountId = '';
      form.reset();
      cancelBtn.style.display = 'none';
      persistViewValue('investmentFormOpen', '');
      persistViewValue('editingInvestmentAccountId', '');
      render();
    });
  }

  document.querySelectorAll('[data-edit-investment]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accountId = btn.dataset.editInvestment;
      const account = (state.investmentAccounts || []).find((a) => a.id === accountId);
      if (!account) return;

      persistViewValue('investmentFormOpen', 'true');
      persistViewValue('editingInvestmentAccountId', accountId);
      render();
    });
  });

  document.querySelectorAll('[data-delete-investment]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const accountId = btn.dataset.deleteInvestment;
      if (!confirm('Tem certeza que deseja deletar esta conta de investimento?')) {
        return;
      }
      const hasTransactions = state.transactions.some((tx) => tx.investmentAccountId === accountId);
      if (hasTransactions) {
        showToast('Este cofrinho já possui movimentações. Mantenha-o para preservar o histórico.', 'info', 'Histórico preservado');
        return;
      }
      state.investmentAccounts = (state.investmentAccounts || []).filter((a) => a.id !== accountId);
      saveState();
      render();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      document.querySelectorAll('#investmentAccountsList > article').forEach((card) => {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? '' : 'none';
      });
    });
  }
}

function bindGoalsPage() {
  document.getElementById('goalForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.goal = {
      name: String(data.get('goalName') || 'Meta financeira').trim(),
      target: readMoneyAmount(data.get('goalTarget')),
      currentAmount: readMoneyAmount(data.get('goalCurrentAmount'))
    };
    saveState();
    render();
  });

  document.getElementById('goalContributionForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = readPositiveAmount(data.get('goalContribution'));
    if (!amount) {
      showToast('Informe um aporte maior que zero.', 'error', 'Aporte inválido');
      return;
    }
    state.goal = {
      ...state.goal,
      currentAmount: finance.addMoney(state.goal.currentAmount || 0, amount)
    };
    saveState();
    render();
  });
}

function bindCalculatorPage() {
  document.getElementById('calculatorForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    state.calculator = {
      initialAmount: Number(data.get('initialAmount') || 0),
      monthlyContribution: Number(data.get('monthlyContribution') || 0),
      annualRate: Number(data.get('annualRate') || 0),
      years: Number(data.get('years') || 0)
    };
    saveState();
    render();
  });
}

function bindCalendarPage() {
  document.getElementById('prevCalendarBtn')?.addEventListener('click', () => {
    ui.calendarDate = new Date(ui.calendarDate.getFullYear(), ui.calendarDate.getMonth() - 1, 1);
    ui.selectedCalendarDate = null;
    render();
  });
  document.getElementById('nextCalendarBtn')?.addEventListener('click', () => {
    ui.calendarDate = new Date(ui.calendarDate.getFullYear(), ui.calendarDate.getMonth() + 1, 1);
    ui.selectedCalendarDate = null;
    render();
  });
  document.querySelectorAll('[data-calendar-day]').forEach((day) => {
    const select = () => {
      ui.selectedCalendarDate = day.dataset.calendarDay;
      render();
    };
    day.addEventListener('click', select);
    day.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
  });
}

function bindBudgetsPage() {
  bindCategorySelect('budgetCategory', 'budgetCustomCategoryWrap', 'budgetCustomCategory', 'draftBudgetCategory');
  document.getElementById('budgetForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const category = resolveCategoryValue({
      category: data.get('category'),
      customCategory: data.get('customCategory')
    });
    const limit = readPositiveAmount(data.get('limit'));
    if (!limit) {
      showToast('Informe um limite maior que zero.', 'error', 'Orçamento inválido');
      return;
    }

    state.budgets = state.budgets.filter((budget) => budget.category !== category);
    state.budgets.unshift({
      id: uid(),
      category,
      limit
    });
    persistViewValue('draftBudgetCategory', category);
    saveState();
    render();
  });

  document.querySelectorAll('[data-delete-budget]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!confirmAction('Excluir este orçamento? As transações permanecem intactas.')) return;
      state.budgets = state.budgets.filter((budget) => budget.id !== button.dataset.deleteBudget);
      saveState();
      render();
    });
  });
}

function bindSubscriptionsPage() {
  bindCategorySelect('subscriptionCategory', 'subscriptionCustomCategoryWrap', 'subscriptionCustomCategory', 'draftSubscriptionCategory');
  document.getElementById('subscriptionForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const category = resolveCategoryValue({
      category: data.get('category'),
      customCategory: data.get('customCategory')
    });
    const amount = readPositiveAmount(data.get('amount'));
    const dueDay = Math.max(1, Math.min(31, Number(data.get('dueDay') || 1)));
    if (!amount) {
      showToast('Informe um valor mensal maior que zero.', 'error', 'Assinatura inválida');
      return;
    }
    state.subscriptions.unshift({
      id: uid(),
      name: String(data.get('name') || '').trim(),
      amount,
      dueDay,
      category,
      active: true,
      payments: []
    });
    persistViewValue('draftSubscriptionCategory', category);
    saveState();
    render();
  });

  document.querySelectorAll('[data-toggle-subscription]').forEach((button) => {
    button.addEventListener('click', () => {
      state.subscriptions = state.subscriptions.map((subscription) => (
        subscription.id === button.dataset.toggleSubscription
          ? { ...subscription, active: !subscription.active }
          : subscription
      ));
      saveState();
      render();
    });
  });

  document.querySelectorAll('[data-pay-subscription]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.paymentInput);
      markSubscriptionAsPaid(button.dataset.paySubscription, input?.value || localISO(new Date()));
      saveState();
      render();
    });
  });

  document.querySelectorAll('[data-unpay-subscription]').forEach((button) => {
    button.addEventListener('click', () => {
      undoSubscriptionPayment(button.dataset.unpaySubscription);
      saveState();
      render();
    });
  });

  document.querySelectorAll('[data-delete-subscription]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!confirmAction('Excluir esta assinatura?')) return;
      state.subscriptions = state.subscriptions.filter((subscription) => subscription.id !== button.dataset.deleteSubscription);
      saveState();
      render();
    });
  });
}

function bindBackupPage() {
  document.getElementById('exportBackupBtn')?.addEventListener('click', exportBackup);
  document.getElementById('clearAllBtn')?.addEventListener('click', () => {
    if (!confirmAction('Limpar transações, orçamentos e assinaturas? Essa ação será sincronizada com o banco.')) return;
    state = {
      ...getDefaultState(state.profile),
      transactions: [],
      financialAccounts: [],
      budgets: [],
      subscriptions: []
    };
    saveState();
    render();
  });
  document.getElementById('importBackupInput')?.addEventListener('change', importBackup);
  document.getElementById('profileForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim().toLowerCase();

    state.profile = {
      ...state.profile,
      name,
      email
    };
    auth = {
      ...auth,
      name,
      email
    };
    saveState();
    render();
  });
}

function exportBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    state,
    auth: {
      isAuthenticated: auth.isAuthenticated,
      name: auth.name,
      email: auth.email
    }
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `obsyd-backup-${localISO(new Date())}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportTransactionsCsv(transactions) {
  const rows = [
    ['data', 'descricao', 'categoria', 'tipo', 'valor', 'recorrente', 'conta_cartao', 'instituicao', 'metodo'],
    ...transactions.map((tx) => [
      tx.date,
      tx.description,
      tx.category,
      tx.type,
      tx.amount.toFixed(2).replace('.', ','),
      tx.recurring ? 'sim' : 'nao',
      getAccountById(tx.financialAccountId)?.nickname || '',
      getInstitutionById(getAccountById(tx.financialAccountId)?.institutionId)?.name || '',
      getPaymentMethodById(tx.paymentMethodId)?.name || ''
    ])
  ];

  const csv = rows.map((row) => row.map(csvCell).join(';')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `obsyd-transacoes-${localISO(new Date())}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function importBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || '{}'));
      if (payload.state) {
        if (!isValidBackupState(payload.state)) {
          showToast('O arquivo não tem a estrutura esperada de backup da Obsyd.', 'error', 'Backup inválido');
          return;
        }
        if (!confirmAction('Importar este backup vai substituir seus dados atuais. Continuar?')) return;
        state = mergeDefaults(payload.state);
        saveState();
      }
      if (auth.isAuthenticated) {
        state.profile.name = auth.name || state.profile.name;
        state.profile.email = auth.email || state.profile.email;
      }
      render();
    } catch {
      showToast('Não foi possível importar esse arquivo JSON.', 'error', 'Importação falhou');
    }
  };
  reader.readAsText(file);
}

function confirmAction(message) {
  return window.confirm(message);
}

function isValidBackupState(nextState) {
  return nextState
    && typeof nextState === 'object'
    && !Array.isArray(nextState)
    && Array.isArray(nextState.transactions)
    && Array.isArray(nextState.budgets)
    && Array.isArray(nextState.subscriptions)
    && (nextState.financialAccounts === undefined || Array.isArray(nextState.financialAccounts));
}

function getSortedTransactions() {
  return [...state.transactions].sort((a, b) => parseLocalDate(b.date) - parseLocalDate(a.date));
}

function getMonthlyTransactions(baseDate) {
  return finance.getMonthTransactions(state.transactions, baseDate);
}

function getMonthlySummary(baseDate) {
  return finance.summarizeMonth(state.transactions, baseDate);
}

function computeBalance() {
  return finance.computeAvailableBalance(state.transactions);
}

function getGoalProgress() {
  const target = Number(state.goal.target) || 0;
  const currentAmount = Number(state.goal.currentAmount) || 0;
  const progress = target > 0 ? (currentAmount / target) * 100 : 0;
  const remaining = Math.max(0, target - currentAmount);
  return { currentAmount, target, progress, remaining };
}

function getAverageMonthlyInvestment() {
  const grouped = {};
  state.transactions
    .filter((tx) => tx.type === 'investment' || tx.type === 'investment_deposit')
    .forEach((tx) => {
      const key = tx.date.slice(0, 7);
      grouped[key] = (grouped[key] || 0) + tx.amount;
    });

  const values = Object.values(grouped);
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function estimateMonthsToGoal(remaining) {
  const avg = getAverageMonthlyInvestment();
  if (remaining <= 0) return '0 mês';
  if (avg <= 0) return 'Indefinido';
  const months = Math.ceil(remaining / avg);
  return `${months} mês(es)`;
}

function compoundProjection() {
  const initialAmount = Number(state.calculator.initialAmount) || 0;
  const monthlyContribution = Number(state.calculator.monthlyContribution) || 0;
  const annualRate = Number(state.calculator.annualRate) || 0;
  const years = Number(state.calculator.years) || 0;

  const monthlyRate = annualRate / 100 / 12;
  const periods = years * 12;

  let futureValue = initialAmount;

  for (let month = 1; month <= periods; month += 1) {
    futureValue = futureValue * (1 + monthlyRate) + monthlyContribution;
  }

  const invested = initialAmount + monthlyContribution * periods;
  const interest = futureValue - invested;

  return {
    futureValue,
    invested,
    interest
  };
}

function getAvailableCategories() {
  const set = new Set([
    'Salário',
    'Freelance',
    'Moradia',
    'Alimentação',
    'Saúde',
    'Transporte',
    'Lazer',
    'Educação',
    'Investimentos',
    'Assinaturas',
    'Família',
    'Outros'
  ]);

  state.transactions.forEach((tx) => set.add(tx.category));
  state.budgets.forEach((budget) => set.add(budget.category));
  state.subscriptions.forEach((subscription) => set.add(subscription.category));

  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

function getFallbackPaymentMethods() {
  return [
    ['pm_pix', 'pix', 'Pix', 'qr-code', '#38bdf8'],
    ['pm_credit_card', 'credit_card', 'Cartão de crédito', 'credit-card', '#a78bfa'],
    ['pm_debit_card', 'debit_card', 'Cartão de débito', 'badge-dollar-sign', '#34d399'],
    ['pm_cash', 'cash', 'Dinheiro', 'banknote', '#fbbf24'],
    ['pm_boleto', 'boleto', 'Boleto', 'barcode', '#cbd5e1'],
    ['pm_bank_transfer', 'bank_transfer', 'Transferência bancária', 'landmark', '#60a5fa'],
    ['pm_ted_doc', 'ted_doc', 'TED/DOC', 'send', '#93c5fd'],
    ['pm_auto_debit', 'auto_debit', 'Débito automático', 'repeat-2', '#2dd4bf'],
    ['pm_digital_wallet', 'digital_wallet', 'Carteira digital', 'wallet-cards', '#fb7185'],
    ['pm_other', 'other', 'Outro', 'circle-ellipsis', '#94a3b8']
  ].map(([id, slug, name, iconName, color], index) => ({
    id, slug, name, description: '', icon: iconName, color, isSystemDefault: true, isActive: true, sortOrder: (index + 1) * 10
  }));
}

function getFallbackFinancialInstitutions() {
  return [
    ['fi_nubank', 'nubank', 'Nubank', 'Nubank', 'bank', '/assets/img/bank-logos/Nubank_logo_2021.svg.png', '#820ad1', '#f0e7ff'],
    ['fi_banco_inter', 'banco-inter', 'Banco Inter', 'Inter', 'bank', '/assets/img/bank-logos/Logo-banco-inter.svg.png', '#ff7a00', '#fff1e5'],
    ['fi_itau', 'itau', 'Itaú', 'Itaú', 'bank', '/assets/img/bank-logos/Itaú_Unibanco_logo_2023.svg.png', '#ec7000', '#1f4aa8'],
    ['fi_santander', 'santander', 'Santander', 'Santander', 'bank', '/assets/img/bank-logos/Banco_Santander_Logotipo.svg.png', '#ec0000', '#ffffff'],
    ['fi_bradesco', 'bradesco', 'Bradesco', 'Bradesco', 'bank', '/assets/img/bank-logos/Banco_Bradesco_logo.svg.png', '#cc092f', '#ffffff'],
    ['fi_banco_do_brasil', 'banco-do-brasil', 'Banco do Brasil', 'BB', 'bank', '/assets/img/bank-logos/Banco_do_Brasil_logo.svg.png', '#f8d117', '#1e3a8a'],
    ['fi_mercado_pago', 'mercado-pago', 'Mercado Pago', 'Mercado Pago', 'wallet', '/assets/img/bank-logos/Mercado_Pago.svg.webp', '#00b1ea', '#ffffff'],
    ['fi_picpay', 'picpay', 'PicPay', 'PicPay', 'wallet', '/assets/img/bank-logos/picpay-1.svg', '#11c76f', '#ffffff'],
    ['fi_c6_bank', 'c6-bank', 'C6 Bank', 'C6', 'bank', '/assets/img/bank-logos/Logo_C6_Bank.svg.png', '#111827', '#fbbf24'],
    ['fi_cash', 'dinheiro-fisico', 'Dinheiro físico', 'Dinheiro', 'cash', '', '#fbbf24', '#111827'],
    ['fi_other', 'outro', 'Outro', 'Outro', 'other', '', '#94a3b8', '#334155']
  ].map(([id, slug, name, shortName, type, logoPath, brandColor, secondaryColor], index) => ({
    id, slug, name, shortName, type, logoPath, icon: type === 'wallet' ? 'wallet-cards' : type === 'cash' ? 'banknote' : 'landmark',
    brandColor, secondaryColor, website: '', isSystemDefault: true, isActive: true, sortOrder: (index + 1) * 10
  }));
}

function getPaymentMethods() {
  return (state.paymentMethods?.length ? state.paymentMethods : getFallbackPaymentMethods()).filter((method) => method.isActive !== false);
}

function getFinancialInstitutions() {
  return (state.financialInstitutions?.length ? state.financialInstitutions : getFallbackFinancialInstitutions()).filter((institution) => institution.isActive !== false);
}

function getAccountById(id) {
  return state.financialAccounts.find((account) => account.id === id) || null;
}

function getInvestmentAccountById(id) {
  return (state.investmentAccounts || []).find((account) => account.id === id) || null;
}

function getPaymentMethodById(id) {
  return getPaymentMethods().find((method) => method.id === id) || null;
}

function getPaymentMethodBySlug(slug) {
  return getPaymentMethods().find((method) => method.slug === slug) || null;
}

function getInstitutionById(id) {
  return getFinancialInstitutions().find((institution) => institution.id === id) || null;
}

function getInstitutionBySlug(slug) {
  return getFinancialInstitutions().find((institution) => institution.slug === slug) || null;
}

function getAccountTypeLabel(type) {
  return accountTypeOptions.find(([value]) => value === type)?.[1] || 'Conta';
}

function renderInstitutionOptions(selectedId = '', includeEmpty = false) {
  const options = getFinancialInstitutions().map((institution) => [institution.id, `${institution.shortName || institution.name} · ${getInstitutionTypeLabel(institution.type)}`]);
  return selectOptions(includeEmpty ? [['', 'Sem instituição'], ...options] : options, selectedId);
}

function renderInstitutionFilterOptions(selectedId = 'all') {
  return selectOptions([['all', 'Todos bancos'], ...getFinancialInstitutions().map((institution) => [institution.id, institution.shortName || institution.name])], selectedId);
}

function renderFinancialAccountOptions(selectedId = '', includeEmpty = false) {
  const options = state.financialAccounts
    .filter((account) => account.isActive !== false)
    .map((account) => {
      const institution = getInstitutionById(account.institutionId);
      return [account.id, `${institution?.shortName ? `${institution.shortName} · ` : ''}${account.nickname || account.name}${account.lastFourDigits ? ` · final ${account.lastFourDigits}` : ''}`];
    });
  return selectOptions(includeEmpty ? [['', 'Sem conta/cartão'], ...options] : options, selectedId);
}

function renderFinancialAccountFilterOptions(selectedId = 'all') {
  return selectOptions([['all', 'Todas contas'], ...state.financialAccounts.map((account) => [account.id, account.nickname || account.name])], selectedId);
}

function renderInvestmentAccountOptions(selectedId = '', includeEmpty = false) {
  const options = (state.investmentAccounts || [])
    .filter((account) => account.isActive !== false)
    .map((account) => {
      const institution = getInstitutionById(account.institutionId);
      return [account.id, `${institution?.shortName ? `${institution.shortName} · ` : ''}${account.nickname || account.name}`];
    });
  return selectOptions(includeEmpty ? [['', 'Sem cofrinho/investimento'], ...options] : options, selectedId);
}

function renderPaymentMethodOptions(selectedId = '', includeEmpty = false) {
  const options = getPaymentMethods().map((method) => [method.id, method.name]);
  return selectOptions(includeEmpty ? [['', 'Sem método'], ...options] : options, selectedId);
}

function renderPaymentMethodFilterOptions(selectedId = 'all') {
  return selectOptions([['all', 'Todos métodos'], ...getPaymentMethods().map((method) => [method.id, method.name])], selectedId);
}

function institutionLogo(institution, className = 'h-9 w-9') {
  if (!institution) {
    return `<span class="institution-logo ${className}">${icon('landmark', 'h-4 w-4')}</span>`;
  }
  const initials = String(institution.shortName || institution.name || '?').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const style = institutionStyleVars(institution);
  if (institution.logoPath) {
    return `<span class="institution-logo ${className}" style="${style}"><img src="${escapeHtml(institution.logoPath)}" alt="${escapeHtml(institution.name)}" loading="lazy" onerror="this.remove();this.parentElement.dataset.fallback='${escapeHtml(initials)}';" /></span>`;
  }
  return `<span class="institution-logo ${className}" style="${style}" data-fallback="${escapeHtml(initials)}"></span>`;
}

function institutionAvatar(institution, className = 'h-9 w-9') {
  return institutionLogo(institution, `${className} institution-avatar`);
}

function institutionBadge(institution, label = '') {
  if (!institution && !label) return '';
  return `
    <span class="source-badge institution-badge" style="${institutionStyleVars(institution)}">
      ${institutionAvatar(institution, 'h-5 w-5')}
      <span>${escapeHtml(label || institution?.shortName || institution?.name || 'Instituição')}</span>
    </span>
  `;
}

function paymentMethodBadge(methodId) {
  const method = getPaymentMethodById(methodId);
  if (!method) return '';
  return `<span class="source-badge payment-method-badge" style="--method-color:${escapeHtml(method.color || '#94a3b8')}">${paymentMethodIcon(method.id, 'h-3.5 w-3.5')} ${escapeHtml(shortPaymentMethodLabel(method))}</span>`;
}

function paymentMethodIcon(methodId, className = 'h-4 w-4') {
  const method = getPaymentMethodById(methodId);
  return icon(method?.icon || 'circle', className);
}

function financialAccountBadge(accountId, methodId) {
  const account = getAccountById(accountId);
  const method = getPaymentMethodById(methodId);
  const institution = getInstitutionById(account?.institutionId);
  if (!account && !method) return '<span class="text-xs text-slate-500">Sem origem</span>';
  return `
    <div class="flex max-w-[260px] flex-wrap items-center gap-1.5">
      ${account ? accountOriginBadge(account, institution) : ''}
      ${method ? paymentMethodBadge(method.id) : ''}
    </div>
  `;
}

function accountOriginBadge(account, institution = getInstitutionById(account?.institutionId)) {
  if (!account) return '';
  return `
    <span class="source-badge account-origin-badge" style="${institutionStyleVars(institution, account.color)}">
      ${institutionAvatar(institution, 'h-5 w-5')}
      <span>${escapeHtml(account.nickname || account.name)}${account.lastFourDigits ? ` · ${escapeHtml(account.lastFourDigits)}` : ''}</span>
    </span>
  `;
}

function transactionOriginCell(tx, compact = false) {
  const account = getAccountById(tx.financialAccountId);
  const investmentAccount = getInvestmentAccountById(tx.investmentAccountId);
  const institution = getInstitutionById(account?.institutionId || investmentAccount?.institutionId);
  const method = getPaymentMethodById(tx.paymentMethodId);
  const displayAccount = investmentAccount || account;
  if (!displayAccount && !method) return '<span class="text-xs text-slate-500">Sem origem</span>';
  return `
    <div class="origin-cell ${compact ? 'origin-cell-compact' : ''}" style="${institutionStyleVars(institution, displayAccount?.color)}">
      <div class="origin-main">
        ${displayAccount ? institutionAvatar(institution, 'h-8 w-8') : method ? `<span class="method-avatar" style="--method-color:${escapeHtml(method.color || '#94a3b8')}">${paymentMethodIcon(method.id, 'h-4 w-4')}</span>` : ''}
        <div class="min-w-0">
          <div class="truncate text-sm font-semibold text-slate-100">${escapeHtml(displayAccount?.nickname || displayAccount?.name || method?.name || 'Sem conta')}</div>
          <div class="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-slate-400">
            ${method ? `<span>${paymentMethodIcon(method.id, 'h-3 w-3')} ${escapeHtml(shortPaymentMethodLabel(method))}</span>` : ''}
            ${investmentAccount ? `<span>${escapeHtml(investmentAccount.investmentType || 'Investimento')}</span>` : ''}
            ${institution ? `<span>${escapeHtml(institution.shortName || institution.name)}</span>` : ''}
            ${account?.lastFourDigits ? `<span>final ${escapeHtml(account.lastFourDigits)}</span>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

function compactOriginPill(tx) {
  const account = getAccountById(tx.financialAccountId);
  const institution = getInstitutionById(account?.institutionId);
  const method = getPaymentMethodById(tx.paymentMethodId);
  if (!account && !method) return '';
  return `
    <span class="compact-origin-pill" style="${institutionStyleVars(institution, account?.color)}">
      ${method ? paymentMethodIcon(method.id, 'h-3.5 w-3.5') : institutionAvatar(institution, 'h-4 w-4')}
      ${escapeHtml([shortPaymentMethodLabel(method), institution?.shortName || account?.nickname].filter(Boolean).join(' · '))}
    </span>
  `;
}

function renderTransactionSourceMeta(tx) {
  const account = getAccountById(tx.financialAccountId);
  const institution = getInstitutionById(account?.institutionId);
  const method = getPaymentMethodById(tx.paymentMethodId);
  return [method?.name, account?.nickname || account?.name, institution?.shortName].filter(Boolean).map(escapeHtml).join(' • ');
}

function renderQuickPresetChip(preset) {
  const institution = getInstitutionBySlug(preset.institutionSlug);
  const selected = valueOf('selectedAccountPreset', '') === preset.label;
  return `
    <button class="preset-chip ${selected ? 'active' : ''}" type="button" data-preset-chip="${escapeHtml(preset.label)}" style="${institutionStyleVars(institution)}">
      ${institutionAvatar(institution, 'h-7 w-7')}
      <span class="truncate">${escapeHtml(preset.label)}</span>
    </button>
  `;
}

function institutionSelectPreview(institutionId) {
  const institution = getInstitutionById(institutionId);
  if (!institution) return '';
  return `
    <div class="select-visual-preview" style="${institutionStyleVars(institution)}">
      ${institutionAvatar(institution, 'h-9 w-9')}
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-slate-100">${escapeHtml(institution.name)}</p>
        <p class="truncate text-xs text-slate-500">${escapeHtml(getInstitutionTypeLabel(institution.type))}</p>
      </div>
    </div>
  `;
}

function renderCreditCardPreview(account, options = {}) {
  const institution = getInstitutionById(account.institutionId);
  const stats = options.stats || getAccountStats(account);
  const isCredit = account.type === 'credit_card';
  const canDelete = options.canDelete !== false;
  const available = options.available ?? (isCredit && account.creditLimit ? Math.max(0, account.creditLimit - stats.monthExpense) : null);
  const interactive = options.interactive === true;
  const cardLabel = isCredit ? 'Crédito' : account.type === 'debit_card' ? 'Débito' : getAccountTypeLabel(account.type);
  return `
    <article class="credit-card-preview ${account.isActive === false ? 'archived' : ''}" style="${institutionStyleVars(institution, account.color)}">
      <div class="credit-card-top">
        ${institutionLogo(institution, 'h-10 w-10')}
        <span class="credit-card-status">${account.isActive === false ? 'Arquivada' : 'Ativa'}</span>
      </div>
      <div class="mt-7">
        <p class="text-xs uppercase text-slate-400">${escapeHtml(cardLabel)}</p>
        <h3 class="mt-1 truncate text-xl font-semibold text-slate-50">${escapeHtml(account.nickname || account.name || 'Cartão')}</h3>
        <p class="mt-2 text-sm text-slate-400">${account.lastFourDigits ? `•••• ${escapeHtml(account.lastFourDigits)}` : 'final não informado'}${account.cardBrand ? ` · ${escapeHtml(account.cardBrand)}` : ''}</p>
      </div>
      <div class="credit-card-metrics">
        <span><small>${isCredit ? 'Gasto' : 'Movimento'}</small><strong>${currency.format(stats.monthExpense || stats.monthVolume || 0)}</strong></span>
        <span><small>${isCredit ? 'Disponível' : 'Saldo'}</small><strong>${currency.format(isCredit ? (available || 0) : stats.balance)}</strong></span>
      </div>
      <div class="credit-card-footer">
        <span>${account.closingDay ? `Fecha ${account.closingDay}` : 'Sem fechamento'}</span>
        <span>${account.dueDay ? `Vence ${account.dueDay}` : 'Sem vencimento'}</span>
      </div>
      ${interactive ? `
        <div class="credit-card-actions">
          <button class="icon-ghost h-9 w-9 p-0" data-edit-account="${account.id}" aria-label="Editar ${escapeHtml(account.nickname || account.name)}">${icon('pencil', 'h-4 w-4')}</button>
          ${account.isActive ? `<button class="icon-ghost h-9 w-9 p-0" data-archive-account="${account.id}" aria-label="Arquivar ${escapeHtml(account.nickname || account.name)}">${icon('archive', 'h-4 w-4')}</button>` : `<button class="icon-ghost h-9 w-9 p-0" data-restore-account="${account.id}" aria-label="Ativar ${escapeHtml(account.nickname || account.name)}">${icon('rotate-ccw', 'h-4 w-4')}</button>`}
          ${canDelete ? `<button class="btn-danger h-9 w-9 p-0" data-delete-account="${account.id}" aria-label="Excluir ${escapeHtml(account.nickname || account.name)}">${icon('trash-2', 'h-4 w-4')}</button>` : ''}
        </div>
      ` : ''}
    </article>
  `;
}

function calendarTransactionPill(item, dense = false) {
  const account = getAccountById(item.financialAccountId);
  const institution = getInstitutionById(account?.institutionId);
  const method = getPaymentMethodById(item.paymentMethodId);
  const label = [shortPaymentMethodLabel(method), institution?.shortName || account?.nickname || item.category || item.typeLabel].filter(Boolean).join(' · ');
  return `
    <div class="calendar-transaction-pill ${dense ? 'dense' : ''} ${scheduleToneClass(item.tone)}" style="${institutionStyleVars(institution, account?.color)}" title="${escapeHtml([item.title, label, currency.format(item.amount)].filter(Boolean).join(' · '))}">
      <div class="min-w-0">
        <div class="truncate font-medium text-slate-100">${escapeHtml(item.title)}</div>
        <div class="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
          ${method ? paymentMethodIcon(method.id, 'h-3 w-3') : ''}
          <span class="truncate">${escapeHtml(label || 'Agenda')}</span>
        </div>
      </div>
      <span class="shrink-0">${currency.format(item.amount)}</span>
    </div>
  `;
}

function renderReportEntity(row, title) {
  const institution = getFinancialInstitutions().find((item) => item.name === row.label || item.shortName === row.label);
  const method = getPaymentMethods().find((item) => item.name === row.label || shortPaymentMethodLabel(item) === row.label);
  const account = state.financialAccounts.find((item) => (item.nickname || item.name) === row.label);
  if (account) return accountOriginBadge(account);
  if (institution) return institutionBadge(institution);
  if (method) return paymentMethodBadge(method.id);
  if (normalizeText(title).includes('cartao')) return `<span class="source-badge">${icon(domainIcons.credit, 'h-3.5 w-3.5')} ${escapeHtml(row.label)}</span>`;
  return `<span class="source-badge">${escapeHtml(row.label)}</span>`;
}

function shortPaymentMethodLabel(method) {
  if (!method) return '';
  const normalized = normalizeText(method.name);
  if (normalized.includes('credito')) return 'Crédito';
  if (normalized.includes('debito') && !normalized.includes('automatico')) return 'Débito';
  if (normalized.includes('transferencia')) return 'Transferência';
  if (normalized.includes('carteira')) return 'Carteira';
  return method.name;
}

function getInstitutionTypeLabel(type) {
  if (type === 'wallet') return 'Carteira digital';
  if (type === 'investment') return 'Investimentos';
  if (type === 'cash') return 'Dinheiro físico';
  if (type === 'other') return 'Outro';
  return 'Banco';
}

function institutionStyleVars(institution, overrideColor = '') {
  const color = overrideColor || institution?.brandColor || '#8b7cf6';
  const secondary = institution?.secondaryColor || '#0f172a';
  return `--brand:${escapeHtml(color)};--brand-secondary:${escapeHtml(secondary)};--account-color:${escapeHtml(color)}`;
}

function buildAccountDraftFromPreset(preset) {
  const institution = preset ? getInstitutionBySlug(preset.institutionSlug) : null;
  return {
    id: '',
    institutionId: institution?.id || '',
    name: preset?.label || '',
    nickname: preset?.label || '',
    type: preset?.type || 'checking_account',
    lastFourDigits: '',
    cardBrand: '',
    color: institution?.brandColor || '#8b7cf6',
    initialBalance: 0,
    manualBalance: null,
    creditLimit: null,
    closingDay: null,
    dueDay: null,
    includeInTotalBalance: preset?.type !== 'credit_card',
    isDefault: false,
    isActive: true,
    notes: '',
    paymentMethodIds: preset ? preset.methods.map((slug) => getPaymentMethodBySlug(slug)?.id).filter(Boolean) : getDefaultPaymentMethodsForType('checking_account')
  };
}

function getDefaultPaymentMethodsForType(type) {
  const slugsByType = {
    checking_account: ['pix', 'debit_card', 'bank_transfer', 'boleto', 'auto_debit'],
    savings_account: ['pix', 'bank_transfer'],
    credit_card: ['credit_card'],
    debit_card: ['debit_card'],
    cash: ['cash'],
    digital_wallet: ['pix', 'digital_wallet', 'debit_card', 'credit_card'],
    investment_account: ['bank_transfer', 'ted_doc'],
    prepaid_card: ['debit_card', 'credit_card'],
    benefits_card: ['debit_card'],
    other: ['other']
  };
  return (slugsByType[type] || ['other']).map((slug) => getPaymentMethodBySlug(slug)?.id).filter(Boolean);
}

function getSuggestedPaymentMethodId(account) {
  if (!account) return '';
  const preferredByType = {
    credit_card: 'credit_card',
    debit_card: 'debit_card',
    cash: 'cash',
    digital_wallet: 'pix',
    checking_account: 'pix',
    savings_account: 'pix',
    investment_account: 'bank_transfer'
  };
  const preferred = getPaymentMethodBySlug(preferredByType[account.type] || 'other')?.id;
  return account.paymentMethodIds?.includes(preferred) ? preferred : (account.paymentMethodIds?.[0] || preferred || '');
}

function filterFinancialAccounts(filters) {
  return [...state.financialAccounts].filter((account) => {
    const institution = getInstitutionById(account.institutionId);
    if (filters.status === 'active' && account.isActive === false) return false;
    if (filters.status === 'archived' && account.isActive !== false) return false;
    if (filters.type !== 'all' && account.type !== filters.type) return false;
    if (filters.institutionId !== 'all' && account.institutionId !== filters.institutionId) return false;
    if (filters.paymentMethodId !== 'all' && !account.paymentMethodIds?.includes(filters.paymentMethodId)) return false;
    if (filters.search && !`${account.name} ${account.nickname} ${institution?.name || ''}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}

function getAccountStats(account) {
  const monthKey = currentPeriodKey();
  const transactions = state.transactions.filter((tx) => tx.financialAccountId === account.id);
  const monthTransactions = transactions.filter((tx) => tx.date.slice(0, 7) === monthKey);
  const income = transactions.filter((tx) => tx.type === 'income').reduce((sum, tx) => finance.addMoney(sum, tx.amount), 0);
  const expense = transactions.filter((tx) => tx.type === 'expense').reduce((sum, tx) => finance.addMoney(sum, tx.amount), 0);
  const investmentDeposit = transactions.filter((tx) => tx.type === 'investment' || tx.type === 'investment_deposit').reduce((sum, tx) => finance.addMoney(sum, tx.amount), 0);
  const investmentWithdrawal = transactions.filter((tx) => tx.type === 'investment_withdrawal').reduce((sum, tx) => finance.addMoney(sum, tx.amount), 0);
  const monthExpense = monthTransactions.filter((tx) => tx.type === 'expense').reduce((sum, tx) => finance.addMoney(sum, tx.amount), 0);
  const monthVolume = monthTransactions.reduce((sum, tx) => finance.addMoney(sum, tx.amount), 0);
  const calculatedBalance = finance.addMoney(finance.subtractMoney(finance.addMoney(account.initialBalance || 0, income), expense, investmentDeposit), investmentWithdrawal);
  return {
    balance: account.manualBalance !== null && account.manualBalance !== undefined ? account.manualBalance : calculatedBalance,
    monthExpense,
    monthVolume
  };
}

function getPaymentSourceSummary() {
  const monthKey = currentPeriodKey();
  const activeAccounts = state.financialAccounts.filter((account) => account.isActive !== false);
  const includedBalance = activeAccounts
    .filter((account) => account.includeInTotalBalance !== false && account.type !== 'credit_card')
    .reduce((sum, account) => finance.addMoney(sum, getAccountStats(account).balance), 0);
  const monthTransactions = state.transactions.filter((tx) => tx.date.slice(0, 7) === monthKey);
  const creditCardSpending = monthTransactions
    .filter((tx) => tx.type === 'expense' && getAccountById(tx.financialAccountId)?.type === 'credit_card')
    .reduce((sum, tx) => finance.addMoney(sum, tx.amount), 0);

  return {
    activeAccounts: activeAccounts.length,
    includedBalance,
    creditCardSpending,
    topMethod: topAmount(groupByLabel(monthTransactions, (tx) => getPaymentMethodById(tx.paymentMethodId)?.name)),
    topInstitution: topAmount(groupByLabel(monthTransactions, (tx) => getInstitutionById(getAccountById(tx.financialAccountId)?.institutionId)?.name)),
    methods: sortedAmounts(groupByLabel(monthTransactions.filter((tx) => tx.type === 'expense'), (tx) => getPaymentMethodById(tx.paymentMethodId)?.name)),
    institutions: sortedAmounts(groupByLabel(monthTransactions, (tx) => getInstitutionById(getAccountById(tx.financialAccountId)?.institutionId)?.name)),
    creditCards: sortedAmounts(groupByLabel(monthTransactions.filter((tx) => tx.type === 'expense' && getAccountById(tx.financialAccountId)?.type === 'credit_card'), (tx) => getAccountById(tx.financialAccountId)?.nickname || getAccountById(tx.financialAccountId)?.name)),
    accounts: sortedAmounts(groupByLabel(monthTransactions.filter((tx) => tx.type === 'expense'), (tx) => getAccountById(tx.financialAccountId)?.nickname || getAccountById(tx.financialAccountId)?.name)),
    incomeAccounts: sortedAmounts(groupByLabel(monthTransactions.filter((tx) => tx.type === 'income'), (tx) => getAccountById(tx.financialAccountId)?.nickname || getAccountById(tx.financialAccountId)?.name)),
    investmentAccounts: sortedAmounts(groupByLabel(monthTransactions.filter((tx) => isInvestmentTransactionType(tx.type)), (tx) => getInvestmentAccountById(tx.investmentAccountId)?.nickname || getInvestmentAccountById(tx.investmentAccountId)?.name))
  };
}

function getInvestmentDistribution() {
  const accounts = Array.isArray(state.investmentAccounts) ? state.investmentAccounts : [];
  const rows = accounts.map((account) => {
    const institution = getInstitutionById(account.institutionId);
    const amount = finance.computeInvestmentAccountBalance(account, state.transactions);
    return {
      id: account.id,
      label: account.nickname || account.name || 'Cofrinho',
      detail: institution?.name || getInvestmentTypeLabel(account.investmentType),
      amount,
      color: institution?.brandColor || account.color || designColors.accent
    };
  }).filter((item) => item.amount > 0);

  if (accounts.length > 0) {
    const total = rows.reduce((sum, item) => finance.addMoney(sum, item.amount), 0);
    return rows
      .map((item) => ({ ...item, total }))
      .sort((a, b) => b.amount - a.amount);
  }

  const assignedIds = new Set(accounts.map((account) => String(account.id || '')));
  const unassigned = finance.getInvestmentLedgerBalance((state.transactions || []).filter((tx) => {
    const id = String(tx?.investmentAccountId || '');
    return isInvestmentTransactionType(tx?.type) && (!id || !assignedIds.has(id));
  }));

  if (unassigned > 0) {
    rows.push({
      id: 'unassigned',
      label: 'Sem cofrinho',
      detail: 'Movimentações sem destino',
      amount: unassigned,
      color: designColors.info
    });
  }

  const total = rows.reduce((sum, item) => finance.addMoney(sum, item.amount), 0);
  return rows
    .map((item) => ({ ...item, total }))
    .sort((a, b) => b.amount - a.amount);
}

function getInvestmentTypeLabel(type) {
  return {
    stock: 'Ações',
    crypto: 'Criptomoedas',
    reits: 'Fundos imobiliários',
    fixed_income: 'Renda fixa',
    fund: 'Fundos',
    pension: 'Previdência',
    other: 'Outro'
  }[type] || 'Cofrinho/investimento';
}

function getTopAccountForDashboard() {
  const monthKey = currentPeriodKey();
  const rows = sortedAmounts(groupByLabel(
    state.transactions.filter((tx) => tx.date.slice(0, 7) === monthKey && tx.financialAccountId),
    (tx) => tx.financialAccountId
  ));
  const account = getAccountById(rows[0]?.label);
  return account ? { account, institution: getInstitutionById(account.institutionId) } : null;
}

function getTopCreditCardForDashboard() {
  const monthKey = currentPeriodKey();
  const rows = sortedAmounts(groupByLabel(
    state.transactions.filter((tx) => tx.date.slice(0, 7) === monthKey && getAccountById(tx.financialAccountId)?.type === 'credit_card'),
    (tx) => tx.financialAccountId
  ));
  const account = getAccountById(rows[0]?.label);
  return account ? { account, institution: getInstitutionById(account.institutionId) } : null;
}

function groupByLabel(transactions, getLabel) {
  return transactions.reduce((map, tx) => {
    const label = getLabel(tx) || 'Sem classificação';
    map[label] = finance.addMoney(map[label] || 0, tx.amount);
    return map;
  }, {});
}

function sortedAmounts(map) {
  return Object.entries(map).map(([label, amount]) => ({ label, amount })).sort((a, b) => b.amount - a.amount);
}

function topAmount(map) {
  return sortedAmounts(map)[0] || null;
}

function formatMoneyInput(value) {
  return Number(value || 0).toFixed(2).replace('.', ',');
}

function normalizeDayInput(value) {
  if (!String(value || '').trim()) return null;
  const day = Number(value);
  if (!Number.isFinite(day)) return null;
  return Math.max(1, Math.min(31, Math.trunc(day)));
}

function persistViewValue(key, value) {
  ui.viewState[key] = value;
}

function valueOf(key, fallback) {
  const value = ui.viewState[key];
  return value ?? fallback;
}

function filterTransactions(filters) {
  return getSortedTransactions().filter((tx) => {
    const account = getAccountById(tx.financialAccountId);
    const investmentAccount = getInvestmentAccountById(tx.investmentAccountId);
    const institution = getInstitutionById(account?.institutionId || investmentAccount?.institutionId);
    if (filters.type !== 'all') {
      if (filters.type === 'investment') {
        if (!isInvestmentTransactionType(tx.type)) return false;
      } else if (tx.type !== filters.type) {
        return false;
      }
    }
    if (filters.recurring === 'recurring' && !tx.recurring) return false;
    if (filters.recurring === 'single' && tx.recurring) return false;
    if (filters.financialAccountId && filters.financialAccountId !== 'all' && tx.financialAccountId !== filters.financialAccountId) return false;
    if (filters.institutionId && filters.institutionId !== 'all' && institution?.id !== filters.institutionId) return false;
    if (filters.paymentMethodId && filters.paymentMethodId !== 'all' && tx.paymentMethodId !== filters.paymentMethodId) return false;
    if (filters.cardBrand && filters.cardBrand !== 'all' && account?.cardBrand !== filters.cardBrand) return false;
    if (filters.search && !`${tx.description} ${tx.category} ${account?.nickname || ''} ${investmentAccount?.nickname || ''} ${institution?.name || ''} ${getPaymentMethodById(tx.paymentMethodId)?.name || ''}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.month && tx.date.slice(0, 7) !== filters.month) return false;
    return true;
  });
}

function getCurrentMonthCategoryExpense(category) {
  const categories = finance.groupExpenseByCategory(state.transactions, new Date());
  return categories[category] || 0;
}

function getBudgetStatus() {
  const status = state.budgets.map((budget) => ({
    ...budget,
    spent: getCurrentMonthCategoryExpense(budget.category)
  }));

  return {
    items: status,
    totalSpent: status.reduce((sum, item) => sum + item.spent, 0),
    totalLimit: status.reduce((sum, item) => sum + item.limit, 0),
    overCount: status.filter((item) => item.spent > item.limit).length
  };
}

function getActiveSubscriptionsTotal() {
  return state.subscriptions.filter((subscription) => subscription.active).reduce((sum, subscription) => sum + subscription.amount, 0);
}

function currentPeriodKey(date = new Date()) {
  return localISO(new Date(date.getFullYear(), date.getMonth(), 1)).slice(0, 7);
}

function getSubscriptionPayment(subscription, periodMonth = currentPeriodKey()) {
  return (Array.isArray(subscription?.payments) ? subscription.payments : [])
    .find((payment) => payment.periodMonth === periodMonth) || null;
}

function isSubscriptionPaid(subscription, periodMonth = currentPeriodKey()) {
  return finance.isSubscriptionPaid(subscription, periodMonth);
}

function getPendingSubscriptions(periodMonth = currentPeriodKey()) {
  return finance.getPendingSubscriptions(state.subscriptions, periodMonth);
}

function markSubscriptionAsPaid(subscriptionId, paidAt = localISO(new Date()), periodMonth = currentPeriodKey()) {
  const txId = uid();

  state.subscriptions = state.subscriptions.map((subscription) => {
    if (subscription.id !== subscriptionId || isSubscriptionPaid(subscription, periodMonth)) return subscription;
    const payment = {
      id: uid(),
      periodMonth,
      paidAt,
      amount: subscription.amount,
      transactionId: txId
    };
    return {
      ...subscription,
      payments: [...(subscription.payments || []), payment]
    };
  });

  const subscription = state.subscriptions.find((item) => item.id === subscriptionId);
  if (!subscription || !getSubscriptionPayment(subscription, periodMonth)) return;

  state.transactions.unshift({
    id: txId,
    description: `Assinatura - ${subscription.name}`,
    amount: subscription.amount,
    date: paidAt,
    type: 'expense',
    category: subscription.category || 'Assinaturas',
    recurring: false
  });
}

function undoSubscriptionPayment(subscriptionId, periodMonth = currentPeriodKey()) {
  let transactionId = '';
  state.subscriptions = state.subscriptions.map((subscription) => {
    if (subscription.id !== subscriptionId) return subscription;
    const payment = getSubscriptionPayment(subscription, periodMonth);
    transactionId = payment?.transactionId || '';
    return {
      ...subscription,
      payments: (subscription.payments || []).filter((item) => item.periodMonth !== periodMonth)
    };
  });
  if (transactionId) {
    state.transactions = state.transactions.filter((tx) => tx.id !== transactionId);
  }
}

function getNextChargeDate(dueDay) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const currentMonthLastDay = new Date(year, month + 1, 0).getDate();
  let next = new Date(year, month, Math.min(dueDay, currentMonthLastDay));

  if (next < new Date(year, month, today.getDate())) {
    const nextMonthLastDay = new Date(year, month + 2, 0).getDate();
    next = new Date(year, month + 1, Math.min(dueDay, nextMonthLastDay));
  }

  return next.toLocaleDateString('pt-BR');
}

function getCalendarItemsForDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const periodMonth = currentPeriodKey(date);
  const dateIso = localISO(date);
  const items = [];

  state.transactions.forEach((tx) => {
    const txDate = parseLocalDate(tx.date);
    const occursOnDate = tx.recurring
      ? txDate.getDate() === day
      : txDate.getFullYear() === year && txDate.getMonth() === month && txDate.getDate() === day;

    if (!occursOnDate) return;

    items.push({
      financialAccountId: tx.financialAccountId || '',
      paymentMethodId: tx.paymentMethodId || '',
      title: tx.description,
      amount: tx.amount,
      category: tx.category,
      typeLabel: getTypeMeta(tx.type).label,
      tone: tx.type,
      status: 'realized'
    });
  });

  state.subscriptions
    .filter((subscription) => {
      if (!subscription.active || isSubscriptionPaid(subscription, periodMonth)) return false;
      return finance.getSubscriptionDueDate(subscription, periodMonth) === dateIso;
    })
    .forEach((subscription) => {
      const status = finance.getSubscriptionStatus(subscription, periodMonth, localISO(new Date()));
      items.push({
        financialAccountId: subscription.financialAccountId || '',
        paymentMethodId: subscription.paymentMethodId || '',
        title: subscription.name,
        amount: subscription.amount,
        category: subscription.category,
        typeLabel: status === 'overdue' ? 'Assinatura atrasada' : 'Assinatura pendente',
        tone: status === 'overdue' ? 'subscription-overdue' : 'subscription-pending',
        status: 'pending'
      });
    });

  return items.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    return b.amount - a.amount;
  });
}

function getCalendarSummary(items) {
  return (Array.isArray(items) ? items : []).reduce((summary, item) => {
    const key = item.status === 'pending' ? 'pending' : 'realized';
    summary[key] = finance.addMoney(summary[key], item.amount || 0);
    return summary;
  }, { realized: 0, pending: 0 });
}

function groupDueItemsByDay(year, month) {
  const map = {};
  const totalDays = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= totalDays; day += 1) {
    const items = getCalendarItemsForDate(new Date(year, month, day));
    if (items.length) {
      map[day] = items;
    }
  }
  return map;
}

function getWeekDays(baseDate) {
  const current = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  const start = new Date(current);
  start.setDate(current.getDate() - current.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
    return {
      date,
      weekday: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      day: String(date.getDate()).padStart(2, '0'),
      isToday: localISO(date) === localISO(new Date())
    };
  });
}

function getUpcomingBills(daysAhead = 7) {
  const today = new Date();
  const items = [];

  for (let offset = 0; offset <= daysAhead; offset += 1) {
    const target = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    const dueMap = groupDueItemsByDay(target.getFullYear(), target.getMonth());
    const dayItems = (dueMap[target.getDate()] || []).filter((item) => item.status === 'pending');
    dayItems.forEach((item) => items.push({
      ...item,
      dueDate: new Date(target)
    }));
  }

  return items.sort((a, b) => a.dueDate - b.dueDate);
}

function sumAmount(items) {
  return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
}

function getReportInsights() {
  const position = finance.computeFinancialPosition(state.transactions, new Date(), state.investmentAccounts);
  const monthly = position.monthly;
  const monthlyNet = monthly.netCashFlow;
  const expenseByCategory = getExpenseCategoriesForCurrentMonth();
  const top = finance.getTopCategory(expenseByCategory);
  const topCategory = top
    ? { label: top.category, detail: currency.format(top.amount) }
    : { label: 'Sem despesas', detail: 'Nenhuma saída registrada' };

  const daysInMonth = finance.daysInMonth(new Date());
  const avgDailyExpense = monthly.expense / daysInMonth;
  const runway = finance.computeRunway(position.availableBalance, monthly.expense);

  return {
    topCategory,
    avgDailyExpense,
    runwayLabel: runway && Number.isFinite(runway) ? `${Math.max(0, runway).toFixed(1)} mês(es)` : 'N/A',
    monthlyNet
  };
}

function getExpenseCategoriesForCurrentMonth() {
  return finance.groupExpenseByCategory(state.transactions, new Date());
}

function buildFinancialInsights() {
  const position = finance.computeFinancialPosition(state.transactions, new Date(), state.investmentAccounts);
  const comparison = finance.compareMonths(state.transactions, new Date());
  const expenses = getExpenseCategoriesForCurrentMonth();
  const top = finance.getTopCategory(expenses);
  const upcoming = getUpcomingBills(7);
  const insights = [];

  insights.push(top ? {
    tone: 'info',
    label: 'Categoria',
    title: `${top.category} lidera as despesas`,
    description: `Essa categoria soma ${currency.format(top.amount)} no mês atual.`
  } : {
    tone: 'neutral',
    label: 'Categoria',
    title: 'Sem despesas no mês',
    description: 'Quando houver movimentações, a categoria de maior peso aparecerá aqui.'
  });

  insights.push({
    tone: comparison.delta.expense > 0 ? 'danger' : 'success',
    label: 'Comparativo',
    title: comparison.delta.expense > 0 ? 'Despesas subiram' : 'Despesas controladas',
    description: `Variação contra o mês anterior: ${currency.format(comparison.delta.expense)}.`
  });

  insights.push({
    tone: upcoming.length ? 'danger' : 'success',
    label: 'Agenda',
    title: upcoming.length ? `${upcoming.length} vencimento(s) próximos` : 'Sem vencimentos próximos',
    description: upcoming.length ? `Total previsto em 7 dias: ${currency.format(sumAmount(upcoming))}.` : 'Sua agenda financeira dos próximos 7 dias está livre.'
  });

  insights.push({
    tone: position.monthly.netCashFlow >= 0 ? 'success' : 'danger',
    label: 'Caixa',
    title: position.monthly.netCashFlow >= 0 ? 'Saldo líquido positivo' : 'Saldo líquido negativo',
    description: `Receitas - despesas - aportes + resgates = ${currency.format(position.monthly.netCashFlow)}.`
  });

  return insights;
}

function buildAlerts() {
  const alerts = [];
  const upcoming = getUpcomingBills(7);
  const budgetStatus = getBudgetStatus();
  const monthly = getMonthlySummary(new Date());
  const balance = computeBalance();
  const subscriptions = getActiveSubscriptionsTotal();

  if (upcoming.length) {
    alerts.push({
      tone: 'danger',
      label: 'Vencimentos',
      title: 'Existem contas próximas',
      description: `Há ${upcoming.length} item(ns) vencendo nos próximos 7 dias, somando ${currency.format(sumAmount(upcoming))}.`,
      href: '#/calendar'
    });
  }

  budgetStatus.items
    .filter((item) => item.spent > item.limit)
    .forEach((item) => {
      alerts.push({
        tone: 'danger',
        label: 'Orçamento',
        title: `${item.category} acima do limite`,
        description: `Você já consumiu ${currency.format(item.spent)} para um teto de ${currency.format(item.limit)} neste mês.`,
        href: '#/budgets'
      });
    });

  if (balance < 0) {
    alerts.push({
      tone: 'danger',
      label: 'Saldo',
      title: 'Seu saldo ficou negativo',
      description: 'Reduza gastos, revise assinaturas e realoque aportes antes de aumentar o risco de aperto de caixa.',
      href: '#/dashboard'
    });
  }

  if (monthly.income > 0 && (monthly.expense + monthly.investmentDeposit) / monthly.income < 0.75) {
    alerts.push({
      tone: 'success',
      label: 'Oportunidade',
      title: 'Seu mês está eficiente',
      description: 'Você está preservando uma boa fatia da renda. Talvez seja um ótimo momento para acelerar sua meta principal.',
      href: '#/goals'
    });
  }

  if (subscriptions > 150) {
    alerts.push({
      tone: 'info',
      label: 'Recorrência',
      title: 'Assinaturas merecem revisão',
      description: `Os serviços ativos somam ${currency.format(subscriptions)} por mês. Verifique o que realmente entrega valor.`,
      href: '#/subscriptions'
    });
  }

  return alerts;
}

function renderInvestmentCharts() {
  const canvas = document.getElementById('investmentAllocationChart');
  if (!canvas) return;
  const distribution = getInvestmentDistribution();
  charts.investmentAllocation = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: distribution.length ? distribution.map((item) => item.label) : ['Sem dados'],
      datasets: [{
        data: distribution.length ? distribution.map((item) => item.amount) : [1],
        backgroundColor: distribution.length ? distribution.map((item) => item.color) : ['rgba(139,124,246,.58)'],
        borderColor: '#0b1220',
        borderWidth: 3,
        hoverOffset: 3
      }]
    },
    options: doughnutChartOptions(distribution.map((item) => item.amount))
  });
  finalizeChart(charts.investmentAllocation);
}

function renderDashboardChart() {
  const canvas = document.getElementById('dashboardFlowChart');
  const allocationCanvas = document.getElementById('dashboardAllocationChart');

  const lastSixMonths = getLastMonths(6);
  const datasets = {
    labels: lastSixMonths.map((date) => date.toLocaleDateString('pt-BR', { month: 'short' })),
    available: [],
    invested: [],
    netWorth: []
  };

  lastSixMonths.forEach((date) => {
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const transactionsUntilMonth = (state.transactions || []).filter((tx) => parseLocalDate(tx.date) <= monthEnd);
    const position = finance.computeFinancialPosition(transactionsUntilMonth, date, state.investmentAccounts);
    datasets.available.push(position.availableBalance);
    datasets.invested.push(position.investedBalance);
    datasets.netWorth.push(position.netWorth);
  });

  if (canvas) {
    charts.dashboard = new Chart(canvas, {
      type: 'line',
      data: {
        labels: datasets.labels,
        datasets: [
          {
            label: 'Patrimônio',
            data: datasets.netWorth,
            borderColor: designColors.success,
            backgroundColor: designColors.successSoft,
            pointBackgroundColor: designColors.success,
            pointBorderColor: designColors.success,
            fill: true,
            tension: 0.42
          },
          {
            label: 'Saldo disponível',
            data: datasets.available,
            borderColor: designColors.info,
            backgroundColor: designColors.infoSoft,
            pointBackgroundColor: designColors.info,
            pointBorderColor: designColors.info,
            fill: true,
            tension: 0.42
          },
          {
            label: 'Cofrinhos',
            data: datasets.invested,
            borderColor: designColors.accent,
            backgroundColor: designColors.accentSoft,
            pointBackgroundColor: designColors.accent,
            pointBorderColor: designColors.accent,
            fill: true,
            tension: 0.42
          }
        ]
      },
      options: chartBaseOptions()
    });
    finalizeChart(charts.dashboard);
  }

  if (allocationCanvas) {
    const distribution = getInvestmentDistribution();
    charts.dashboardAllocation = new Chart(allocationCanvas, {
      type: 'doughnut',
      data: {
        labels: distribution.length ? distribution.map((item) => item.label) : ['Sem dados'],
        datasets: [{
          data: distribution.length ? distribution.map((item) => item.amount) : [1],
          backgroundColor: distribution.length ? distribution.map((item) => item.color) : ['rgba(139,124,246,.58)'],
          borderColor: '#0b1220',
          borderWidth: 3,
          hoverOffset: 3
        }]
      },
      options: doughnutChartOptions(distribution.map((item) => item.amount))
    });
    finalizeChart(charts.dashboardAllocation);
  }
}

function renderReportCharts() {
  const categoryCanvas = document.getElementById('reportCategoryChart');
  const balanceCanvas = document.getElementById('reportBalanceChart');
  const incomeExpenseCanvas = document.getElementById('reportIncomeExpenseChart');
  const investmentCanvas = document.getElementById('reportInvestmentChart');

  const categoryData = getExpenseCategoriesForCurrentMonth();
  const labels = Object.keys(categoryData);
  const values = Object.values(categoryData);

  if (categoryCanvas) {
    charts.reportCategory = new Chart(categoryCanvas, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Sem dados'],
      datasets: [{
        data: values.length ? values : [1],
        backgroundColor: [
          'rgba(52,211,153,.78)',
          'rgba(251,113,133,.78)',
          'rgba(139,124,246,.78)',
          'rgba(56,189,248,.76)',
          'rgba(251,191,36,.74)',
          'rgba(244,114,182,.72)'
        ],
        borderColor: '#0b1220',
        borderWidth: 3,
        hoverOffset: 3
      }]
    },
    options: doughnutChartOptions(values)
    });
    finalizeChart(charts.reportCategory);
  }

  const months = getLastMonths(6);
  const balances = months.map((date) => {
    const summary = getMonthlySummary(date);
    return summary.netCashFlow;
  });

  if (balanceCanvas) {
    charts.reportBalance = new Chart(balanceCanvas, {
      type: 'bar',
      data: {
        labels: months.map((date) => date.toLocaleDateString('pt-BR', { month: 'short' })),
        datasets: [{
          label: 'Saldo mensal',
          data: balances,
          backgroundColor: balances.map((value) => value >= 0 ? 'rgba(52,211,153,.70)' : 'rgba(251,113,133,.70)'),
          borderColor: balances.map((value) => value >= 0 ? 'rgba(52,211,153,.95)' : 'rgba(251,113,133,.95)'),
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: chartBaseOptions()
    });
    finalizeChart(charts.reportBalance);
  }

  if (incomeExpenseCanvas) {
    charts.reportIncomeExpense = new Chart(incomeExpenseCanvas, {
      type: 'bar',
      data: {
        labels: months.map((date) => date.toLocaleDateString('pt-BR', { month: 'short' })),
        datasets: [
          {
            label: 'Receitas',
            data: months.map((date) => getMonthlySummary(date).income),
            backgroundColor: 'rgba(52,211,153,.64)',
            borderRadius: 8
          },
          {
            label: 'Despesas',
            data: months.map((date) => getMonthlySummary(date).expense),
            backgroundColor: 'rgba(251,113,133,.62)',
            borderRadius: 8
          }
        ]
      },
      options: chartBaseOptions()
    });
    finalizeChart(charts.reportIncomeExpense);
  }

  if (investmentCanvas) {
    const investmentValues = months.map((date) => getMonthlySummary(date).investmentVariation);
    charts.reportInvestment = new Chart(investmentCanvas, {
      type: 'line',
      data: {
        labels: months.map((date) => date.toLocaleDateString('pt-BR', { month: 'short' })),
        datasets: [{
          label: 'Rendimento líquido',
          data: investmentValues,
          borderColor: designColors.accent,
          backgroundColor: designColors.accentSoft,
          pointBackgroundColor: designColors.accent,
          fill: true,
          tension: 0.42
        }]
      },
      options: chartBaseOptions()
    });
    finalizeChart(charts.reportInvestment);
  }
}

function chartBaseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: designColors.textSecondary,
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          padding: 18
        }
      },
      tooltip: {
        backgroundColor: 'rgba(8, 13, 24, 0.96)',
        borderColor: designColors.border,
        borderWidth: 1,
        titleColor: designColors.textPrimary,
        bodyColor: designColors.textSecondary,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context) => `${context.dataset.label || context.label}: ${currency.format(context.parsed.y ?? context.parsed)}`
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    elements: {
      line: {
        borderWidth: 2
      },
      point: {
        radius: 2.5,
        hoverRadius: 4
      }
    },
    scales: {
      x: {
        ticks: { color: designColors.textMuted },
        grid: { color: designColors.grid, drawBorder: false }
      },
      y: {
        ticks: {
          color: designColors.textMuted,
          callback: (value) => currency.format(value)
        },
        grid: { color: designColors.grid, drawBorder: false }
      }
    }
  };
}

function doughnutChartOptions(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: designColors.textSecondary,
          usePointStyle: true,
          boxWidth: 9,
          boxHeight: 9,
          padding: 18
        }
      },
      tooltip: {
        backgroundColor: 'rgba(8, 13, 24, 0.96)',
        borderColor: designColors.border,
        borderWidth: 1,
        titleColor: designColors.textPrimary,
        bodyColor: designColors.textSecondary,
        padding: 12,
        callbacks: {
          label: (context) => {
            const value = Number(context.parsed || 0);
            const percent = total > 0 ? ` (${((value / total) * 100).toFixed(1)}%)` : '';
            return `${context.label}: ${currency.format(value)}${percent}`;
          }
        }
      }
    }
  };
}

function destroyCharts() {
  Object.values(charts).forEach((chart) => {
    if (chart) chart.destroy();
  });
  charts = {
    dashboard: null,
    dashboardAllocation: null,
    investmentAllocation: null,
    reportCategory: null,
    reportBalance: null,
    reportIncomeExpense: null,
    reportInvestment: null
  };
}

function getLastMonths(quantity) {
  const list = [];
  const base = new Date();
  for (let index = quantity - 1; index >= 0; index -= 1) {
    list.push(new Date(base.getFullYear(), base.getMonth() - index, 1));
  }
  return list;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
