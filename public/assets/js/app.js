const API_BASE = '';
const BRAND_NAME = 'Obsyd';
const finance = window.ObsydFinance;

const app = document.getElementById('app');

const routes = [
  { key: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { key: 'transactions', label: 'Transações', icon: 'arrow-right-left' },
  { key: 'goals', label: 'Metas', icon: 'piggy-bank' },
  { key: 'calculator', label: 'Juros Compostos', icon: 'calculator' },
  { key: 'calendar', label: 'Calendário', icon: 'calendar-days' },
  { key: 'budgets', label: 'Orçamentos', icon: 'wallet-cards' },
  { key: 'subscriptions', label: 'Assinaturas', icon: 'repeat-2' },
  { key: 'reports', label: 'Relatórios', icon: 'chart-no-axes-combined' },
  { key: 'alerts', label: 'Alertas', icon: 'bell-ring' },
  { key: 'backup', label: 'Backup', icon: 'database-backup' }
];

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });

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
  reportCategory: null,
  reportBalance: null
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
    <div class="min-h-[100dvh] lg:grid lg:grid-cols-[304px_minmax(0,1fr)]">
      ${renderToastRegion()}
      <div id="sidebarOverlay" class="${ui.sidebarOpen ? 'fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden' : 'hidden'}"></div>

      <aside id="sidebar" class="mobile-drawer glass-strong fixed left-2 top-2 z-50 h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[min(320px,calc(100vw-1rem))] overflow-hidden rounded-[28px] border border-white/10 px-4 py-4 shadow-glow ${ui.sidebarOpen ? 'open' : ''} lg:sticky lg:left-0 lg:top-0 lg:h-[100dvh] lg:max-h-[100dvh] lg:w-[304px] lg:rounded-none lg:border-l-0 lg:border-t-0 lg:border-b-0 lg:px-5 lg:py-5">
        <div class="flex h-full min-h-0 flex-col">
          <div class="flex items-center justify-between gap-3">
            <a href="#/dashboard" class="flex min-w-0 items-center gap-3">
              <img src="./assets/img/obsyd-mark.svg" alt="Logo Obsyd" class="h-12 w-12 shrink-0" />
              <div class="min-w-0">
                <div class="truncate text-base font-semibold tracking-tight text-white">${BRAND_NAME}</div>
                <div class="truncate text-[11px] uppercase tracking-[0.28em] text-slate-500">Sistema financeiro pessoal</div>
              </div>
            </a>
            <button id="closeSidebarBtn" class="btn-secondary h-11 w-11 shrink-0 p-0 lg:hidden" aria-label="Fechar menu">${icon('x', 'h-5 w-5')}</button>
          </div>

          <nav class="sidebar-nav mt-5 flex-1 space-y-2 overflow-y-auto pr-1">
            ${routes.map((route) => `
              <a href="#/${route.key}" class="sidebar-link ${current === route.key ? 'active' : ''}">
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300">${icon(route.icon, 'h-4 w-4')}</span>
                <span class="truncate font-medium">${route.label}</span>
              </a>
            `).join('')}
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
                <span aria-hidden="true">
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 16L18 12M18 12L14 8M18 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M10 4H7.8C6.11984 4 5.27976 4 4.63803 4.32698C4.07354 4.6146 3.6146 5.07354 3.32698 5.63803C3 6.27976 3 7.11984 3 8.8V15.2C3 16.8802 3 17.7202 3.32698 18.362C3.6146 18.9265 4.07354 19.3854 4.63803 19.673C5.27976 20 6.11984 20 7.8 20H10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div class="min-w-0">
        <header class="sticky top-0 z-30 border-b border-white/10 bg-slate-950/72 backdrop-blur-xl">
          <div class="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div class="flex items-start justify-between gap-3 max-lg:items-center">
              <div class="flex min-w-0 items-center gap-3">
                <button id="openSidebarBtn" class="btn-secondary h-11 w-11 shrink-0 p-0 lg:hidden" aria-label="Abrir menu">${icon('menu', 'h-5 w-5')}</button>
                <div class="min-w-0 max-lg:hidden">
                  <p class="text-[11px] uppercase tracking-[0.28em] text-slate-500">${headerCopy.eyebrow}</p>
                  <h1 class="text-2xl font-semibold tracking-tight text-slate-50 sm:text-[2rem]">${headerCopy.title}</h1>
                  <p class="mt-1 text-sm text-slate-400">${headerCopy.subtitle}</p>
                </div>
              </div>
              <div class="hidden xl:flex items-center gap-2 pl-4">
                <span class="tag tag-slate">${monthLabel.format(new Date())}</span>
                <span class="tag tag-slate">Saldo disponível: ${currency.format(computeBalance())}</span>
                <span class="tag tag-emerald">${getWelcomeLabel()}</span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 max-lg:hidden xl:hidden">
              <span class="tag tag-slate">${monthLabel.format(new Date())}</span>
              <span class="tag tag-slate">Saldo disponível: ${currency.format(computeBalance())}</span>
              <span class="tag tag-emerald">${getWelcomeLabel()}</span>
            </div>
          </div>
        </header>

        <main class="mx-auto max-w-[1600px] px-4 py-6 pb-24 sm:px-6 lg:px-8">
          ${content}
        </main>
      </div>
    </div>
  `;
}

function getWelcomeLabel() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const firstName = String(auth.name || state.profile?.name || 'você').trim().split(/\s+/)[0];
  return `${greeting}, ${firstName}`;
}

function getHeaderCopy(route, fallbackTitle) {
  const firstName = String(auth.name || state.profile?.name || 'você').trim().split(/\s+/)[0];
  if (route === 'dashboard') {
    return {
      eyebrow: `${BRAND_NAME} • visão central`,
      title: `${getWelcomeLabel()}. Sua operação financeira está ganhando contexto.`,
      subtitle: `${firstName}, acompanhe caixa, metas e próximos movimentos em um painel pensado para decidir rápido e com segurança.`
    };
  }

  return {
    eyebrow: `${BRAND_NAME} • área logada`,
    title: fallbackTitle,
    subtitle: 'Tudo o que você altera aqui fica salvo na sua conta e sincronizado com o Neon em tempo real.'
  };
}

function renderPage(route) {
  switch (route) {
    case 'dashboard':
      return renderDashboardPage();
    case 'transactions':
      return renderTransactionsPage();
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
  const position = finance.computeFinancialPosition(state.transactions, new Date());
  const monthly = position.monthly;
  const budgetStatus = getBudgetStatus();
  const dueSoon = getUpcomingBills(7);
  const pendingSubscriptions = getPendingSubscriptions(currentPeriodKey());
  const pendingTotal = sumAmount(pendingSubscriptions);
  const budgetPct = budgetStatus.totalLimit > 0 ? Math.min(100, (budgetStatus.totalSpent / budgetStatus.totalLimit) * 100) : 0;
  const recent = getSortedTransactions().slice(0, 6);
  const insights = buildFinancialInsights();

  return `
    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      ${metricCard('Saldo disponível', currency.format(position.availableBalance), 'Caixa livre: receitas menos despesas e aportes.', position.availableBalance >= 0 ? 'emerald' : 'rose', 'card-enter')}
      ${metricCard('Receitas do mês', currency.format(monthly.income), 'Entradas registradas no mês atual.', 'emerald', 'card-enter card-enter-delay-1')}
      ${metricCard('Despesas do mês', currency.format(monthly.expense), 'Saídas consumidas no mês atual.', 'rose', 'card-enter card-enter-delay-2')}
      ${metricCard('Investimentos do mês', currency.format(monthly.investment), 'Aportes destinados ao futuro.', 'violet', 'card-enter card-enter-delay-3')}
    </section>

    <section class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_.95fr]">
      <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-xl font-semibold tracking-tight">Fluxo financeiro dos últimos 6 meses</h2>
            <p class="mt-1 text-sm text-slate-400">Receitas, despesas e investimentos com leitura estável já no primeiro carregamento.</p>
          </div>
          <a href="#/transactions" class="btn-secondary">Ver transações</a>
        </div>
        <div class="chart-frame mt-6">
          <canvas id="dashboardFlowChart"></canvas>
        </div>
      </article>

      <div class="grid grid-cols-1 gap-6">
        ${infoCard('Taxa de poupança', `${monthly.savingsRate.toFixed(1)}%`, 'Regra: (receitas - despesas) / receitas.', 'emerald')}
        ${infoCard('Saldo líquido mensal', currency.format(monthly.netCashFlow), 'Receitas menos despesas e investimentos.', monthly.netCashFlow >= 0 ? 'emerald' : 'rose')}
        ${infoCard('Patrimônio financeiro', currency.format(position.netWorth), 'Saldo disponível + total aportado em investimentos.', 'violet')}
        ${infoCard('Contas vencendo em 7 dias', `${dueSoon.length} item(ns)`, dueSoon.length ? `Pendente previsto: ${currency.format(sumAmount(dueSoon))}` : 'Nenhuma conta próxima do vencimento.', 'rose')}
        ${infoCard('Assinaturas pendentes', currency.format(pendingTotal), `${pendingSubscriptions.length} obrigação(ões) ainda não realizadas.`, pendingTotal ? 'rose' : 'emerald')}
        <article class="glass rounded-[28px] p-5 hover-lift">
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-semibold tracking-tight">Uso dos orçamentos</h3>
              <p class="mt-1 text-sm text-slate-400">Visão geral dos limites mensais por categoria.</p>
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

    <section class="mt-6 glass rounded-[30px] p-5 sm:p-6 hover-lift">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 class="text-xl font-semibold tracking-tight">Insights financeiros</h2>
          <p class="mt-1 text-sm text-slate-400">Leituras automáticas com a mesma regra usada nos relatórios.</p>
        </div>
        <a href="#/reports" class="btn-secondary">Ver relatórios</a>
      </div>
      <div class="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        ${insights.map(renderInsightCard).join('')}
      </div>
    </section>

    <section class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_.9fr]">
      <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-semibold tracking-tight">Últimas movimentações</h2>
            <p class="mt-1 text-sm text-slate-400">Atividade recente do seu fluxo financeiro.</p>
          </div>
          <a href="#/transactions" class="btn-secondary">Adicionar nova</a>
        </div>
        <div class="mt-5 space-y-3">
          ${recent.length ? recent.map(renderTransactionListItem).join('') : emptyState('Ainda não existem movimentações.')}
        </div>
      </article>

      <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-semibold tracking-tight">Resumo de prioridades</h2>
            <p class="mt-1 text-sm text-slate-400">Atalhos para o que merece atenção agora.</p>
          </div>
        </div>
        <div class="mt-5 grid gap-4">
          ${priorityCard('Meta principal', `${state.goal.name}`, `${getGoalProgress().progress.toFixed(0)}% concluído`, '#/goals')}
          ${priorityCard('Planejamento', `Crescimento em foco`, `Patrimônio projetado: ${currency.format(compoundProjection().futureValue)}`, '#/calculator')}
          ${priorityCard('Orçamentos', `${budgetStatus.overCount} categoria(s) acima do limite`, 'Ajuste categorias com maior pressão.', '#/budgets')}
          ${priorityCard('Backup local', 'Exportar ou importar seus dados', 'Proteja seu histórico em JSON.', '#/backup')}
        </div>
      </article>
    </section>

    <section class="mt-6">
      ${renderDashboardWeekCalendar()}
    </section>
  `;
}

function metricCard(title, value, subtitle, tone, enterClass = '') {
  const ring = {
    emerald: 'from-emerald-500/15 to-emerald-400/10 text-emerald-300',
    rose: 'from-rose-500/15 to-rose-400/10 text-rose-300',
    violet: 'from-violet-500/15 to-violet-400/10 text-violet-300'
  }[tone] || 'from-white/10 to-white/5 text-slate-200';

  return `
    <article class="glass metric-ring rounded-[28px] p-5 hover-lift ${enterClass}">
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm text-slate-300">${title}</span>
        <span class="rounded-full bg-gradient-to-br ${ring} px-3 py-1 text-xs font-semibold">${tone === 'rose' ? 'Atenção' : 'Live'}</span>
      </div>
      <p class="mt-4 text-3xl font-semibold tracking-tight">${value}</p>
      <p class="mt-2 text-sm text-slate-400">${subtitle}</p>
    </article>
  `;
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
          <div class="rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2">
            <div class="truncate font-medium text-slate-100">${escapeHtml(item.title)}</div>
            <div class="mt-1 flex items-center justify-between gap-2 text-slate-400">
              <span class="truncate">${escapeHtml(item.category || item.typeLabel || 'Agenda')}</span>
              <span>${currency.format(item.amount)}</span>
            </div>
          </div>
        `).join('') : '<div class="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-center text-slate-500">Sem itens</div>'}
      </div>
    </article>
  `;
}

function renderTransactionsPage() {
  const categories = getAvailableCategories();
  const selectedCategory = valueOf('draftTransactionCategory', categories[0] || 'Outros');
  const isCustomCategory = selectedCategory === '__custom__';
  const transactions = filterTransactions({
    type: valueOf('filterType', 'all'),
    recurring: valueOf('filterRecurring', 'all'),
    search: valueOf('searchTransaction', ''),
    month: valueOf('filterMonth', localISO(new Date()).slice(0, 7))
  });
  const monthly = getMonthlySummary(parseLocalDate(`${valueOf('filterMonth', localISO(new Date()).slice(0, 7))}-01`));

  return `
    <section class="space-y-6">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
        ${metricCard('Receitas filtradas', currency.format(monthly.income), 'Entradas no mês selecionado.', 'emerald')}
        ${metricCard('Despesas filtradas', currency.format(monthly.expense), 'Saídas consumidas no mês.', 'rose')}
        ${metricCard('Investimentos', currency.format(monthly.investment), 'Aportes registrados.', 'violet')}
        ${metricCard('Saldo líquido', currency.format(monthly.netCashFlow), 'Receitas - despesas - aportes.', monthly.netCashFlow >= 0 ? 'emerald' : 'rose')}
      </div>

      <section class="grid grid-cols-1 gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <article class="glass rounded-[28px] p-5 sm:p-6">
          <div class="flex items-start gap-3">
            <span class="feature-icon feature-icon-violet">${icon('plus', 'h-5 w-5')}</span>
            <div>
              <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Nova movimentação</p>
              <h2 class="mt-2 text-xl font-semibold tracking-tight">Adicionar transação</h2>
            </div>
          </div>

          <form id="transactionForm" class="mt-6 space-y-4">
            <div>
              <label class="mb-2 block text-sm text-slate-300">Descrição</label>
              <input class="input-luxury" name="description" required placeholder="Ex.: Compra no mercado" autocomplete="off" />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="mb-2 block text-sm text-slate-300">Tipo</label>
                <div class="select-wrap">
                  <select class="select-luxury" name="type">
                    <option value="income">Receita</option>
                    <option value="expense" selected>Despesa</option>
                    <option value="investment">Investimento</option>
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

            <label class="inline-flex items-center gap-3 text-sm text-slate-300">
              <input name="recurring" type="checkbox" class="h-4 w-4 rounded border-white/20 bg-slate-900/60" />
              Marcar como recorrente
            </label>

            <button class="btn-primary w-full" type="submit">${icon('save', 'h-4 w-4')} Salvar transação</button>
          </form>
        </article>

        <article class="glass rounded-[28px] p-5 sm:p-6 min-w-0">
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p class="text-xs uppercase tracking-[0.24em] text-slate-400">Gestão inteligente</p>
                <h2 class="mt-2 text-xl font-semibold tracking-tight">Lista de transações</h2>
              </div>
              <button id="exportTransactionsCsvBtn" class="btn-secondary w-full sm:w-auto" type="button">${icon('download', 'h-4 w-4')} Exportar CSV</button>
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
                    ['investment', 'Investimentos']
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
                    <th class="px-4 py-3 font-medium">Data</th>
                    <th class="px-4 py-3 font-medium">Tipo</th>
                    <th class="px-4 py-3 font-medium text-right">Valor</th>
                    <th class="px-4 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  ${transactions.length ? transactions.map(renderTransactionRow).join('') : `<tr><td colspan="6" class="px-4 py-12 text-center text-slate-400">Nenhuma transação encontrada para os filtros atuais.</td></tr>`}
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
            <div class="progress-bar bg-gradient-to-r from-emerald-400 via-violet-400 to-violet-500" style="width:${Math.min(100, goal.progress)}%"></div>
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
    cells.push('<div class="rounded-[24px] border border-dashed border-white/8 bg-white/[0.02]"></div>');
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
            <div class="rounded-2xl border px-2.5 py-2 ${scheduleToneClass(item.tone)}">
              <div class="truncate font-medium">${escapeHtml(item.title)}</div>
              <div class="mt-1 flex items-center justify-between gap-2 text-slate-400">
                <span class="truncate">${escapeHtml(item.category || item.typeLabel || 'Agenda')}</span>
                <span>${currency.format(item.amount)}</span>
              </div>
            </div>
          `).join('') || '<div class="text-slate-500">Sem vencimentos</div>'}
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
                <p class="mt-1 text-sm text-slate-400">${escapeHtml(item.category || item.typeLabel || 'Agenda')} • ${escapeHtml(item.typeLabel || '')}</p>
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
            <div class="rounded-2xl border px-3 py-2 ${scheduleToneClass(item.tone)}">
              <div class="truncate font-medium text-slate-100">${escapeHtml(item.title)}</div>
              <div class="mt-1 flex items-center justify-between gap-2 text-xs text-slate-400">
                <span class="truncate">${escapeHtml(item.category || item.typeLabel || 'Agenda')}</span>
                <span>${currency.format(item.amount)}</span>
              </div>
            </div>
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
  return `
    <section class="grid grid-cols-1 gap-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        ${metricCard('Maior categoria do mês', insights.topCategory.label, insights.topCategory.detail, 'rose')}
        ${metricCard('Despesa média diária', currency.format(insights.avgDailyExpense), 'Média aproximada no mês corrente.', 'emerald')}
        ${metricCard('Runway estimado', insights.runwayLabel, 'Meses que o saldo cobriria no ritmo atual.', 'violet')}
        ${metricCard('Saldo líquido mensal', currency.format(insights.monthlyNet), 'Receitas menos despesas e investimentos.', 'emerald')}
      </div>

      <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
          <div>
            <h2 class="text-xl font-semibold tracking-tight">Despesas por categoria</h2>
            <p class="mt-1 text-sm text-slate-400">Leitura visual do peso de cada categoria no mês atual.</p>
          </div>
          <div class="chart-frame mt-6">
            <canvas id="reportCategoryChart"></canvas>
          </div>
        </article>

        <article class="glass rounded-[30px] p-5 sm:p-6 hover-lift">
          <div>
            <h2 class="text-xl font-semibold tracking-tight">Saldo mensal dos últimos 6 meses</h2>
            <p class="mt-1 text-sm text-slate-400">Compara a geração líquida de caixa mês a mês.</p>
          </div>
          <div class="chart-frame mt-6">
            <canvas id="reportBalanceChart"></canvas>
          </div>
        </article>
      </section>
    </section>
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
  return `
    <div class="rounded-[24px] border border-white/10 bg-white/5 p-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div class="flex items-center gap-3">
            <h3 class="font-semibold">${escapeHtml(tx.description)}</h3>
            ${typeBadge(tx.type)}
          </div>
          <p class="mt-1 text-sm text-slate-400">${escapeHtml(tx.category)} • ${formatDate(tx.date)}${tx.recurring ? ' • recorrente' : ''}</p>
        </div>
        <div class="text-right font-semibold ${tx.type === 'income' ? 'text-emerald-300' : tx.type === 'investment' ? 'text-violet-300' : 'text-rose-300'}">${currency.format(tx.amount)}</div>
      </div>
    </div>
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
      <td class="px-4 py-4 text-slate-300">${formatDate(tx.date)}</td>
      <td class="px-4 py-4">${typeBadge(tx.type)}</td>
      <td class="px-4 py-4 text-right font-semibold ${typeMeta.textClass}">
        ${currency.format(tx.amount)}
      </td>
      <td class="px-4 py-4 text-right">
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
            <span class="tag tag-slate">${icon(tx.recurring ? 'repeat-2' : 'circle', 'h-3.5 w-3.5')} ${tx.recurring ? 'Recorrente' : 'Pontual'}</span>
          </div>
        </div>
      </div>
      <div class="mt-4 flex justify-end">
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
  return `<div class="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-slate-400">${escapeHtml(text)}</div>`;
}

function typeBadge(type) {
  const meta = getTypeMeta(type);
  return `<span class="tag ${meta.tagClass}">${icon(meta.icon, 'h-3.5 w-3.5')} ${meta.label}</span>`;
}

function getTypeMeta(type) {
  if (type === 'income') {
    return { label: 'Receita', icon: 'trending-up', tagClass: 'tag-emerald', textClass: 'text-emerald-300', iconClass: 'category-icon-emerald' };
  }
  if (type === 'investment') {
    return { label: 'Investimento', icon: 'landmark', tagClass: 'tag-violet', textClass: 'text-violet-300', iconClass: 'category-icon-violet' };
  }
  return { label: 'Despesa', icon: 'trending-down', tagClass: 'tag-rose', textClass: 'text-rose-300', iconClass: 'category-icon-rose' };
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
  if (tone === 'income') return 'border-emerald-400/20 bg-emerald-400/10';
  if (tone === 'investment') return 'border-violet-400/20 bg-violet-400/10';
  if (tone === 'subscription-pending') return 'border-sky-400/20 bg-sky-400/10';
  if (tone === 'subscription-overdue') return 'border-rose-400/30 bg-rose-400/15';
  return 'border-rose-400/20 bg-rose-400/10';
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
    const data = new FormData(event.currentTarget);
    const category = resolveCategoryValue({
      category: data.get('category'),
      customCategory: data.get('customCategory')
    });
    const amount = readPositiveAmount(data.get('amount'));
    if (!amount) {
      showToast('Informe um valor maior que zero.', 'error', 'Transação inválida');
      return;
    }

    state.transactions.unshift({
      id: uid(),
      description: String(data.get('description') || '').trim(),
      amount,
      date: String(data.get('date') || localISO(new Date())),
      type: String(data.get('type') || 'expense'),
      category,
      recurring: Boolean(data.get('recurring'))
    });

    persistViewValue('draftTransactionCategory', category);
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

  document.querySelectorAll('[data-delete-transaction]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!confirmAction('Excluir esta transação? Essa ação será salva na sua conta.')) return;
      state.transactions = state.transactions.filter((tx) => tx.id !== button.dataset.deleteTransaction);
      saveState();
      render();
    });
  });
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
    ['data', 'descricao', 'categoria', 'tipo', 'valor', 'recorrente'],
    ...transactions.map((tx) => [
      tx.date,
      tx.description,
      tx.category,
      tx.type,
      tx.amount.toFixed(2).replace('.', ','),
      tx.recurring ? 'sim' : 'nao'
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
    && Array.isArray(nextState.subscriptions);
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
    .filter((tx) => tx.type === 'investment')
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

function persistViewValue(key, value) {
  ui.viewState[key] = value;
}

function valueOf(key, fallback) {
  const value = ui.viewState[key];
  return value ?? fallback;
}

function filterTransactions(filters) {
  return getSortedTransactions().filter((tx) => {
    if (filters.type !== 'all' && tx.type !== filters.type) return false;
    if (filters.recurring === 'recurring' && !tx.recurring) return false;
    if (filters.recurring === 'single' && tx.recurring) return false;
    if (filters.search && !`${tx.description} ${tx.category}`.toLowerCase().includes(filters.search.toLowerCase())) return false;
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
      title: tx.description,
      amount: tx.amount,
      category: tx.category,
      typeLabel: tx.type === 'income' ? 'Receita' : tx.type === 'investment' ? 'Investimento' : 'Despesa',
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
  const position = finance.computeFinancialPosition(state.transactions, new Date());
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
  const position = finance.computeFinancialPosition(state.transactions, new Date());
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
    description: `Receitas - despesas - investimentos = ${currency.format(position.monthly.netCashFlow)}.`
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

  if (monthly.income > 0 && (monthly.expense + monthly.investment) / monthly.income < 0.75) {
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

function renderDashboardChart() {
  const canvas = document.getElementById('dashboardFlowChart');
  if (!canvas) return;

  const lastSixMonths = getLastMonths(6);
  const datasets = {
    labels: lastSixMonths.map((date) => date.toLocaleDateString('pt-BR', { month: 'short' })),
    income: [],
    expense: [],
    investment: []
  };

  lastSixMonths.forEach((date) => {
    const summary = getMonthlySummary(date);
    datasets.income.push(summary.income);
    datasets.expense.push(summary.expense);
    datasets.investment.push(summary.investment);
  });

  charts.dashboard = new Chart(canvas, {
    type: 'line',
    data: {
      labels: datasets.labels,
      datasets: [
        {
          label: 'Receitas',
          data: datasets.income,
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.16)',
          fill: true,
          tension: 0.35
        },
        {
          label: 'Despesas',
          data: datasets.expense,
          borderColor: 'rgba(251, 113, 133, 1)',
          backgroundColor: 'rgba(251, 113, 133, 0.12)',
          fill: true,
          tension: 0.35
        },
        {
          label: 'Investimentos',
          data: datasets.investment,
          borderColor: 'rgba(139, 92, 246, 1)',
          backgroundColor: 'rgba(139, 92, 246, 0.12)',
          fill: true,
          tension: 0.35
        }
      ]
    },
    options: chartBaseOptions()
  });
  finalizeChart(charts.dashboard);
}

function renderReportCharts() {
  const categoryCanvas = document.getElementById('reportCategoryChart');
  const balanceCanvas = document.getElementById('reportBalanceChart');
  if (!categoryCanvas || !balanceCanvas) return;

  const categoryData = getExpenseCategoriesForCurrentMonth();
  const labels = Object.keys(categoryData);
  const values = Object.values(categoryData);

  charts.reportCategory = new Chart(categoryCanvas, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Sem dados'],
      datasets: [{
        data: values.length ? values : [1],
        backgroundColor: [
          'rgba(16,185,129,.85)',
          'rgba(251,113,133,.85)',
          'rgba(139,92,246,.85)',
          'rgba(56,189,248,.85)',
          'rgba(251,191,36,.85)',
          'rgba(244,114,182,.85)'
        ],
        borderWidth: 0
      }]
    },
    options: doughnutChartOptions(values)
  });
  finalizeChart(charts.reportCategory);

  const months = getLastMonths(6);
  const balances = months.map((date) => {
    const summary = getMonthlySummary(date);
    return summary.income - summary.expense - summary.investment;
  });

  charts.reportBalance = new Chart(balanceCanvas, {
    type: 'bar',
    data: {
      labels: months.map((date) => date.toLocaleDateString('pt-BR', { month: 'short' })),
      datasets: [{
        label: 'Saldo mensal',
        data: balances,
        backgroundColor: balances.map((value) => value >= 0 ? 'rgba(16,185,129,.78)' : 'rgba(251,113,133,.78)'),
        borderRadius: 12
      }]
    },
    options: chartBaseOptions()
  });
  finalizeChart(charts.reportBalance);
}

function chartBaseOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1'
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label || context.label}: ${currency.format(context.parsed.y ?? context.parsed)}`
        }
      }
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(255,255,255,0.05)' }
      },
      y: {
        ticks: {
          color: '#94a3b8',
          callback: (value) => currency.format(value)
        },
        grid: { color: 'rgba(255,255,255,0.05)' }
      }
    }
  };
}

function doughnutChartOptions(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          usePointStyle: true,
          padding: 18
        }
      },
      tooltip: {
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
    reportCategory: null,
    reportBalance: null
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
