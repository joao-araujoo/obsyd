#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');
const { Pool } = require('pg');

const BASE_DIR = __dirname;
const PUBLIC_DIR = path.join(BASE_DIR, 'public');
loadEnvFile(path.join(BASE_DIR, '.env'));
const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 8000);
const DATABASE_URL = String(process.env.DATABASE_URL || '').trim();
const NORMALIZED_DATABASE_URL = normalizeDatabaseUrl(DATABASE_URL);
const HAS_DATABASE = Boolean(NORMALIZED_DATABASE_URL);

const PAYMENT_METHOD_SEEDS = [
  ['pm_pix', 'pix', 'Pix', 'Pagamento instantâneo via chave, QR Code ou copia e cola.', 'qr-code', '#38bdf8', true, true, 10],
  ['pm_credit_card', 'credit_card', 'Cartão de crédito', 'Compra lançada em fatura de cartão de crédito.', 'credit-card', '#a78bfa', true, true, 20],
  ['pm_debit_card', 'debit_card', 'Cartão de débito', 'Compra debitada diretamente da conta.', 'badge-dollar-sign', '#34d399', true, true, 30],
  ['pm_cash', 'cash', 'Dinheiro', 'Pagamento em espécie.', 'banknote', '#fbbf24', true, true, 40],
  ['pm_boleto', 'boleto', 'Boleto', 'Pagamento por boleto bancário.', 'barcode', '#cbd5e1', true, true, 50],
  ['pm_bank_transfer', 'bank_transfer', 'Transferência bancária', 'Transferência entre contas.', 'landmark', '#60a5fa', true, true, 60],
  ['pm_ted_doc', 'ted_doc', 'TED/DOC', 'Transferência bancária tradicional.', 'send', '#93c5fd', true, true, 70],
  ['pm_auto_debit', 'auto_debit', 'Débito automático', 'Cobrança automática em conta.', 'repeat-2', '#2dd4bf', true, true, 80],
  ['pm_digital_wallet', 'digital_wallet', 'Carteira digital', 'Pagamento via carteira digital.', 'wallet-cards', '#fb7185', true, true, 90],
  ['pm_other', 'other', 'Outro', 'Método de pagamento não classificado.', 'circle-ellipsis', '#94a3b8', true, true, 100]
];

const FINANCIAL_INSTITUTION_SEEDS = [
  ['fi_nubank', 'nubank', 'Nubank', 'Nubank', 'bank', '/assets/img/bank-logos/Nubank_logo_2021.svg.png', 'landmark', '#820ad1', '#f0e7ff', 'https://nubank.com.br', true, true, 10],
  ['fi_banco_inter', 'banco-inter', 'Banco Inter', 'Inter', 'bank', '/assets/img/bank-logos/Logo-banco-inter.svg.png', 'landmark', '#ff7a00', '#fff1e5', 'https://www.bancointer.com.br', true, true, 20],
  ['fi_itau', 'itau', 'Itaú', 'Itaú', 'bank', '/assets/img/bank-logos/Itaú_Unibanco_logo_2023.svg.png', 'landmark', '#ec7000', '#1f4aa8', 'https://www.itau.com.br', true, true, 30],
  ['fi_santander', 'santander', 'Santander', 'Santander', 'bank', '/assets/img/bank-logos/Banco_Santander_Logotipo.svg.png', 'landmark', '#ec0000', '#ffffff', 'https://www.santander.com.br', true, true, 40],
  ['fi_bradesco', 'bradesco', 'Bradesco', 'Bradesco', 'bank', '/assets/img/bank-logos/Banco_Bradesco_logo.svg.png', 'landmark', '#cc092f', '#ffffff', 'https://banco.bradesco', true, true, 50],
  ['fi_banco_do_brasil', 'banco-do-brasil', 'Banco do Brasil', 'BB', 'bank', '/assets/img/bank-logos/Banco_do_Brasil_logo.svg.png', 'landmark', '#f8d117', '#1e3a8a', 'https://www.bb.com.br', true, true, 60],
  ['fi_caixa', 'caixa', 'Caixa', 'Caixa', 'bank', null, 'landmark', '#0066b3', '#f39200', 'https://www.caixa.gov.br', true, true, 70],
  ['fi_mercado_pago', 'mercado-pago', 'Mercado Pago', 'Mercado Pago', 'wallet', '/assets/img/bank-logos/Mercado_Pago.svg.webp', 'wallet-cards', '#00b1ea', '#ffffff', 'https://www.mercadopago.com.br', true, true, 80],
  ['fi_picpay', 'picpay', 'PicPay', 'PicPay', 'wallet', '/assets/img/bank-logos/picpay-1.svg', 'wallet-cards', '#11c76f', '#ffffff', 'https://picpay.com', true, true, 90],
  ['fi_c6_bank', 'c6-bank', 'C6 Bank', 'C6', 'bank', '/assets/img/bank-logos/Logo_C6_Bank.svg.png', 'landmark', '#111827', '#fbbf24', 'https://www.c6bank.com.br', true, true, 100],
  ['fi_btg_pactual', 'btg-pactual', 'BTG Pactual', 'BTG', 'investment', null, 'chart-no-axes-combined', '#123c69', '#dbeafe', 'https://www.btgpactual.com', true, true, 110],
  ['fi_xp', 'xp-investimentos', 'XP Investimentos', 'XP', 'investment', null, 'chart-candlestick', '#111827', '#f59e0b', 'https://www.xpi.com.br', true, true, 120],
  ['fi_neon', 'neon', 'Neon', 'Neon', 'bank', null, 'landmark', '#00a5ff', '#f8fafc', 'https://neon.com.br', true, true, 130],
  ['fi_next', 'next', 'Next', 'Next', 'bank', null, 'landmark', '#00ff5f', '#0f172a', 'https://next.me', true, true, 140],
  ['fi_pagbank', 'pagbank', 'PagBank', 'PagBank', 'wallet', null, 'wallet-cards', '#fbbf24', '#111827', 'https://pagbank.com.br', true, true, 150],
  ['fi_stone', 'stone', 'Stone', 'Stone', 'wallet', null, 'wallet-cards', '#00a868', '#ffffff', 'https://www.stone.com.br', true, true, 160],
  ['fi_cash', 'dinheiro-fisico', 'Dinheiro físico', 'Dinheiro', 'cash', null, 'banknote', '#fbbf24', '#111827', null, true, true, 170],
  ['fi_other', 'outro', 'Outro', 'Outro', 'other', null, 'circle-ellipsis', '#94a3b8', '#334155', null, true, true, 999]
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.txt': 'text/plain; charset=utf-8'
};

const pool = HAS_DATABASE
  ? new Pool({
      connectionString: NORMALIZED_DATABASE_URL,
      ssl: NORMALIZED_DATABASE_URL.includes('sslmode=disable') ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    })
  : null;

let schemaPromise = null;
const loginAttempts = new Map();

if (pool) {
  pool.on('error', (error) => {
    console.error('Erro no pool PostgreSQL/Neon:', error);
  });
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, 'utf8');

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separatorIndex = line.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function normalizeDatabaseUrl(connectionString) {
  const value = String(connectionString || '').trim();
  if (!value) return '';
  if (!value.includes('sslmode=require')) return value;
  if (value.includes('uselibpqcompat=') || value.includes('sslmode=verify-full')) return value;
  return value.replace('sslmode=require', 'sslmode=verify-full');
}

function parseCookies(req) {
  const header = String(req.headers.cookie || '');
  const cookies = {};
  if (!header) return cookies;

  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) continue;
    cookies[rawKey] = decodeURIComponent(rest.join('=') || '');
  }

  return cookies;
}

function createSessionCookie(token, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const parts = [
    `obsyd_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function clearSessionCookie() {
  const parts = [
    'obsyd_session=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ];

  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function utcNow() {
  return new Date().toISOString();
}

function toDateOnly(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function deriveNameFromEmail(email) {
  const local = String(email || '').split('@', 1)[0].trim() || 'usuario';
  const normalized = local.replace(/[._-]+/g, ' ').trim();
  return normalized
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Usuário';
}

function dateFor(monthOffset = 0, day = 1) {
  const today = new Date();
  const year = today.getFullYear() + Math.floor((today.getMonth() + monthOffset) / 12);
  const monthIndex = ((today.getMonth() + monthOffset) % 12 + 12) % 12;
  const safeDay = Math.max(1, Math.min(day, 28));
  return `${year.toString().padStart(4, '0')}-${String(monthIndex + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

async function ensureDatabase() {
  if (!HAS_DATABASE || !pool) {
    throw new Error('DATABASE_URL não configurada. Adicione a connection string do Neon nas variáveis de ambiente.');
  }

  if (!schemaPromise) {
    schemaPromise = initializeSchema();
  }

  return schemaPromise;
}

async function initializeSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hint TEXT,
      password_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS goals (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target NUMERIC NOT NULL DEFAULT 0,
      current_amount NUMERIC NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS calculator_settings (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      initial_amount NUMERIC NOT NULL DEFAULT 0,
      monthly_contribution NUMERIC NOT NULL DEFAULT 0,
      annual_rate NUMERIC NOT NULL DEFAULT 0,
      years INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      amount NUMERIC NOT NULL DEFAULT 0,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      date DATE NOT NULL,
      recurring BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT transactions_type_check CHECK (type IN ('income', 'expense', 'investment'))
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      is_system_default BOOLEAN NOT NULL DEFAULT TRUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS financial_institutions (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      short_name TEXT,
      type TEXT NOT NULL DEFAULT 'bank',
      logo_path TEXT,
      icon TEXT,
      brand_color TEXT,
      secondary_color TEXT,
      website TEXT,
      is_system_default BOOLEAN NOT NULL DEFAULT TRUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS financial_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      institution_id TEXT REFERENCES financial_institutions(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      nickname TEXT,
      type TEXT NOT NULL,
      subtype TEXT,
      last_four_digits TEXT,
      card_brand TEXT,
      color TEXT,
      icon TEXT,
      initial_balance NUMERIC NOT NULL DEFAULT 0,
      manual_balance NUMERIC,
      credit_limit NUMERIC,
      closing_day INTEGER,
      due_day INTEGER,
      include_in_total_balance BOOLEAN NOT NULL DEFAULT TRUE,
      is_default BOOLEAN NOT NULL DEFAULT FALSE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      archived_at TIMESTAMPTZ,
      notes TEXT,
      external_provider TEXT,
      external_account_id TEXT,
      external_item_id TEXT,
      last_sync_at TIMESTAMPTZ,
      sync_status TEXT,
      consent_expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT financial_accounts_type_check CHECK (type IN ('checking_account', 'savings_account', 'credit_card', 'debit_card', 'cash', 'digital_wallet', 'investment_account', 'prepaid_card', 'benefits_card', 'other')),
      CONSTRAINT financial_accounts_last_four_digits_check CHECK (last_four_digits IS NULL OR last_four_digits ~ '^[0-9]{1,4}$'),
      CONSTRAINT financial_accounts_closing_day_check CHECK (closing_day IS NULL OR closing_day BETWEEN 1 AND 31),
      CONSTRAINT financial_accounts_due_day_check CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31)
    );

    CREATE TABLE IF NOT EXISTS financial_account_payment_methods (
      id TEXT PRIMARY KEY,
      financial_account_id TEXT NOT NULL REFERENCES financial_accounts(id) ON DELETE CASCADE,
      payment_method_id TEXT NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
      is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (financial_account_id, payment_method_id)
    );

    CREATE TABLE IF NOT EXISTS investment_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      institution_id TEXT REFERENCES financial_institutions(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      nickname TEXT,
      account_number TEXT,
      initial_investment NUMERIC NOT NULL DEFAULT 0,
      current_total NUMERIC NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'BRL',
      investment_type TEXT NOT NULL,
      risk_profile TEXT NOT NULL DEFAULT 'balanced',
      color TEXT,
      icon TEXT,
      notes TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      archived_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT investment_accounts_investment_type_check CHECK (investment_type IN ('stock', 'crypto', 'reits', 'fixed_income', 'fund', 'pension', 'other')),
      CONSTRAINT investment_accounts_risk_profile_check CHECK (risk_profile IN ('conservative', 'moderate', 'aggressive', 'balanced'))
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      limit_amount NUMERIC NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount NUMERIC NOT NULL DEFAULT 0,
      due_day INTEGER NOT NULL DEFAULT 1,
      category TEXT NOT NULL DEFAULT 'Assinaturas',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT subscriptions_due_day_check CHECK (due_day BETWEEN 1 AND 31)
    );

    CREATE TABLE IF NOT EXISTS subscription_payments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subscription_id TEXT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
      period_month TEXT NOT NULL,
      paid_at DATE NOT NULL,
      amount NUMERIC NOT NULL DEFAULT 0,
      transaction_id TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_id, subscription_id, period_month)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id_date ON transactions(user_id, date DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id_type_date ON transactions(user_id, type, date DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id_category_date ON transactions(user_id, category, date DESC);
    CREATE INDEX IF NOT EXISTS idx_financial_accounts_user_id ON financial_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_financial_accounts_institution_id ON financial_accounts(institution_id);
    CREATE INDEX IF NOT EXISTS idx_financial_accounts_type ON financial_accounts(type);
    CREATE INDEX IF NOT EXISTS idx_financial_accounts_is_active ON financial_accounts(is_active);
    CREATE INDEX IF NOT EXISTS idx_investment_accounts_user_id ON investment_accounts(user_id);
    CREATE INDEX IF NOT EXISTS idx_investment_accounts_institution_id ON investment_accounts(institution_id);
    CREATE INDEX IF NOT EXISTS idx_investment_accounts_is_active ON investment_accounts(is_active);
    CREATE INDEX IF NOT EXISTS idx_budgets_user_id_created_at ON budgets(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_created_at ON subscriptions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id_period ON subscription_payments(user_id, period_month DESC);
  `);

  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
  await pool.query('ALTER TABLE goals ADD COLUMN IF NOT EXISTS current_amount NUMERIC NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method_id TEXT');
  await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS financial_account_id TEXT');
  await pool.query('ALTER TABLE transactions ADD COLUMN IF NOT EXISTS investment_account_id TEXT');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_transactions_financial_account_id ON transactions(financial_account_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_transactions_payment_method_id ON transactions(payment_method_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_transactions_investment_account_id ON transactions(investment_account_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_transactions_user_id_financial_account_id ON transactions(user_id, financial_account_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_transactions_user_id_payment_method_id ON transactions(user_id, payment_method_id)');
  await pool.query('CREATE INDEX IF NOT EXISTS idx_transactions_user_id_investment_account_id ON transactions(user_id, investment_account_id)');
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_payment_method_id_fkey') THEN
        ALTER TABLE transactions
          ADD CONSTRAINT transactions_payment_method_id_fkey
          FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE RESTRICT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_financial_account_id_fkey') THEN
        ALTER TABLE transactions
          ADD CONSTRAINT transactions_financial_account_id_fkey
          FOREIGN KEY (financial_account_id) REFERENCES financial_accounts(id) ON DELETE RESTRICT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_investment_account_id_fkey') THEN
        ALTER TABLE transactions
          ADD CONSTRAINT transactions_investment_account_id_fkey
          FOREIGN KEY (investment_account_id) REFERENCES investment_accounts(id) ON DELETE RESTRICT;
      END IF;
    END $$;
  `);
  await seedSystemPresets();
}

async function seedSystemPresets() {
  for (const method of PAYMENT_METHOD_SEEDS) {
    await pool.query(
      `INSERT INTO payment_methods (id, slug, name, description, icon, color, is_system_default, is_active, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         icon = EXCLUDED.icon,
         color = EXCLUDED.color,
         is_system_default = EXCLUDED.is_system_default,
         is_active = EXCLUDED.is_active,
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()`,
      method
    );
  }

  for (const institution of FINANCIAL_INSTITUTION_SEEDS) {
    await pool.query(
      `INSERT INTO financial_institutions (id, slug, name, short_name, type, logo_path, icon, brand_color, secondary_color, website, is_system_default, is_active, sort_order, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         short_name = EXCLUDED.short_name,
         type = EXCLUDED.type,
         logo_path = EXCLUDED.logo_path,
         icon = EXCLUDED.icon,
         brand_color = EXCLUDED.brand_color,
         secondary_color = EXCLUDED.secondary_color,
         website = EXCLUDED.website,
         is_system_default = EXCLUDED.is_system_default,
         is_active = EXCLUDED.is_active,
         sort_order = EXCLUDED.sort_order,
         updated_at = NOW()`,
      institution
    );
  }
}

async function withTransaction(callback) {
  await ensureDatabase();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw error;
  } finally {
    client.release();
  }
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) return reject(error);
      resolve(key);
    });
  });
  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, passwordHash) {
  if (!passwordHash || !String(passwordHash).includes(':')) return false;
  const [salt, storedHash] = String(passwordHash).split(':', 2);
  if (!salt || !storedHash) return false;

  const derivedKey = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) return reject(error);
      resolve(key);
    });
  });

  const expected = Buffer.from(storedHash, 'hex');
  const received = Buffer.from(derivedKey.toString('hex'), 'hex');
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}

async function validatePasswordWithLegacyUpgrade(client, user, password, now) {
  if (!user) return false;

  if (user.password_hash && await verifyPassword(password, user.password_hash)) {
    return true;
  }

  const legacyPlainHash = user.password_hash && !String(user.password_hash).includes(':') && password === user.password_hash;
  const legacyHint = user.password_hint && password === user.password_hint;

  if (!legacyPlainHash && !legacyHint) {
    return false;
  }

  const nextHash = await hashPassword(password);
  await client.query(
    'UPDATE users SET password_hash = $1, password_hint = NULL, updated_at = $2 WHERE id = $3',
    [nextHash, now, user.id]
  );
  return true;
}

async function initializeEmptyUserState(client, userId) {
  const now = utcNow();

  await client.query(
    'INSERT INTO goals (user_id, name, target, current_amount, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (user_id) DO NOTHING',
    [userId, 'Objetivo principal', 0, 0, now]
  );

  await client.query(
    `INSERT INTO calculator_settings (user_id, initial_amount, monthly_contribution, annual_rate, years, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, 0, 0, 0, 10, now]
  );
}

async function findUserByToken(token, client = pool) {
  if (!token) return null;
  await ensureDatabase();
  const result = await client.query(
    `SELECT u.id, u.name, u.email
     FROM sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token = $1
     LIMIT 1`,
    [token]
  );
  return result.rows[0] || null;
}

async function buildState(userId, client = pool) {
  await ensureDatabase();

  const [userResult, goalResult, calculatorResult, paymentMethodsResult, financialInstitutionsResult, financialAccountsResult, financialAccountMethodsResult, investmentAccountsResult, transactionsResult, budgetsResult, subscriptionsResult, subscriptionPaymentsResult] = await Promise.all([
    client.query('SELECT id, name, email FROM users WHERE id = $1 LIMIT 1', [userId]),
    client.query('SELECT name, target, current_amount FROM goals WHERE user_id = $1 LIMIT 1', [userId]),
    client.query('SELECT initial_amount, monthly_contribution, annual_rate, years FROM calculator_settings WHERE user_id = $1 LIMIT 1', [userId]),
    client.query(
      `SELECT id, slug, name, description, icon, color, is_system_default, is_active, sort_order
       FROM payment_methods
       WHERE is_active = TRUE
       ORDER BY sort_order, name`
    ),
    client.query(
      `SELECT id, slug, name, short_name, type, logo_path, icon, brand_color, secondary_color, website, is_system_default, is_active, sort_order
       FROM financial_institutions
       WHERE is_active = TRUE
       ORDER BY sort_order, name`
    ),
    client.query(
      `SELECT id, user_id, institution_id, name, nickname, type, subtype, last_four_digits, card_brand, color, icon,
              initial_balance, manual_balance, credit_limit, closing_day, due_day, include_in_total_balance,
              is_default, is_active, archived_at, notes, external_provider, external_account_id, external_item_id,
              last_sync_at, sync_status, consent_expires_at
       FROM financial_accounts
       WHERE user_id = $1
       ORDER BY is_active DESC, is_default DESC, created_at DESC`,
      [userId]
    ),
    client.query(
      `SELECT fam.financial_account_id, fam.payment_method_id
       FROM financial_account_payment_methods fam
       INNER JOIN financial_accounts fa ON fa.id = fam.financial_account_id
       WHERE fa.user_id = $1 AND fam.is_enabled = TRUE`,
      [userId]
    ),
    client.query(
      `SELECT id, user_id, institution_id, name, nickname, account_number, initial_investment, current_total, currency,
              investment_type, risk_profile, color, icon, notes, is_active, archived_at
       FROM investment_accounts
       WHERE user_id = $1
       ORDER BY is_active DESC, created_at DESC`,
      [userId]
    ),
    client.query(
      `SELECT id, description, amount, type, category, date, recurring, payment_method_id, financial_account_id, investment_account_id
       FROM transactions
       WHERE user_id = $1
       ORDER BY date DESC, created_at DESC`,
      [userId]
    ),
    client.query(
      `SELECT id, category, limit_amount
       FROM budgets
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    ),
    client.query(
      `SELECT id, name, amount, due_day, category, active
       FROM subscriptions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    ),
    client.query(
      `SELECT id, subscription_id, period_month, paid_at, amount, transaction_id
       FROM subscription_payments
       WHERE user_id = $1
       ORDER BY period_month DESC, paid_at DESC`,
      [userId]
    )
  ]);

  const user = userResult.rows[0] || null;
  const goal = goalResult.rows[0] || null;
  const calculator = calculatorResult.rows[0] || null;

  return {
    profile: {
      name: user?.name || 'Usuário',
      email: user?.email || ''
    },
    goal: {
      name: goal?.name || 'Meta financeira',
      target: Number(goal?.target || 0),
      currentAmount: Number(goal?.current_amount || 0)
    },
    calculator: {
      initialAmount: Number(calculator?.initial_amount || 0),
      monthlyContribution: Number(calculator?.monthly_contribution || 0),
      annualRate: Number(calculator?.annual_rate || 0),
      years: Number(calculator?.years || 0)
    },
    paymentMethods: paymentMethodsResult.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description || '',
      icon: row.icon || 'circle',
      color: row.color || '#94a3b8',
      isSystemDefault: Boolean(row.is_system_default),
      isActive: Boolean(row.is_active),
      sortOrder: Number(row.sort_order || 0)
    })),
    financialInstitutions: financialInstitutionsResult.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      shortName: row.short_name || row.name,
      type: row.type,
      logoPath: row.logo_path || '',
      icon: row.icon || 'landmark',
      brandColor: row.brand_color || '#94a3b8',
      secondaryColor: row.secondary_color || '#334155',
      website: row.website || '',
      isSystemDefault: Boolean(row.is_system_default),
      isActive: Boolean(row.is_active),
      sortOrder: Number(row.sort_order || 0)
    })),
    financialAccounts: financialAccountsResult.rows.map((row) => ({
      id: row.id,
      institutionId: row.institution_id || '',
      name: row.name,
      nickname: row.nickname || '',
      type: row.type,
      subtype: row.subtype || '',
      lastFourDigits: row.last_four_digits || '',
      cardBrand: row.card_brand || '',
      color: row.color || '',
      icon: row.icon || '',
      initialBalance: Number(row.initial_balance || 0),
      manualBalance: row.manual_balance === null ? null : Number(row.manual_balance || 0),
      creditLimit: row.credit_limit === null ? null : Number(row.credit_limit || 0),
      closingDay: row.closing_day === null ? null : Number(row.closing_day || 0),
      dueDay: row.due_day === null ? null : Number(row.due_day || 0),
      includeInTotalBalance: Boolean(row.include_in_total_balance),
      isDefault: Boolean(row.is_default),
      isActive: Boolean(row.is_active),
      archivedAt: row.archived_at ? row.archived_at.toISOString() : '',
      notes: row.notes || '',
      externalProvider: row.external_provider || '',
      externalAccountId: row.external_account_id || '',
      externalItemId: row.external_item_id || '',
      lastSyncAt: row.last_sync_at ? row.last_sync_at.toISOString() : '',
      syncStatus: row.sync_status || '',
      consentExpiresAt: row.consent_expires_at ? row.consent_expires_at.toISOString() : '',
      paymentMethodIds: financialAccountMethodsResult.rows
        .filter((method) => method.financial_account_id === row.id)
        .map((method) => method.payment_method_id)
    })),
    investmentAccounts: investmentAccountsResult.rows.map((row) => ({
      id: row.id,
      institutionId: row.institution_id || '',
      name: row.name,
      nickname: row.nickname || '',
      accountNumber: row.account_number || '',
      initialInvestment: Number(row.initial_investment || 0),
      currentTotal: Number(row.current_total || 0),
      currency: row.currency || 'BRL',
      investmentType: row.investment_type,
      riskProfile: row.risk_profile || 'balanced',
      color: row.color || '',
      icon: row.icon || '',
      notes: row.notes || '',
      isActive: Boolean(row.is_active),
      archivedAt: row.archived_at ? row.archived_at.toISOString() : ''
    })),
    transactions: transactionsResult.rows.map((row) => ({
      id: row.id,
      description: row.description,
      amount: Number(row.amount || 0),
      type: row.type,
      category: row.category,
      date: toDateOnly(row.date),
      recurring: Boolean(row.recurring),
      paymentMethodId: row.payment_method_id || '',
      financialAccountId: row.financial_account_id || '',
      investmentAccountId: row.investment_account_id || ''
    })),
    budgets: budgetsResult.rows.map((row) => ({
      id: row.id,
      category: row.category,
      limit: Number(row.limit_amount || 0)
    })),
    subscriptions: subscriptionsResult.rows.map((row) => {
      const payments = subscriptionPaymentsResult.rows
        .filter((payment) => payment.subscription_id === row.id)
        .map((payment) => ({
          id: payment.id,
          periodMonth: payment.period_month,
          paidAt: toDateOnly(payment.paid_at),
          amount: Number(payment.amount || 0),
          transactionId: payment.transaction_id || ''
        }));

      return {
        id: row.id,
        name: row.name,
        amount: Number(row.amount || 0),
        dueDay: Number(row.due_day || 1),
        category: row.category,
        active: Boolean(row.active),
        payments
      };
    })
  };
}

async function replaceUserDataset(userId, state, client) {
  const now = utcNow();
  const profile = state?.profile || {};
  const goal = state?.goal || {};
  const calculator = state?.calculator || {};
  const financialAccounts = Array.isArray(state?.financialAccounts) ? state.financialAccounts : [];
  const investmentAccounts = Array.isArray(state?.investmentAccounts) ? state.investmentAccounts : [];
  const transactions = Array.isArray(state?.transactions) ? state.transactions : [];
  const budgets = Array.isArray(state?.budgets) ? state.budgets : [];
  const subscriptions = Array.isArray(state?.subscriptions) ? state.subscriptions : [];

  const userResult = await client.query('SELECT id, email FROM users WHERE id = $1 LIMIT 1', [userId]);
  const user = userResult.rows[0];
  if (!user) throw new Error('Usuário não encontrado.');

  await client.query(
    'UPDATE users SET name = $1, email = $2, updated_at = $3 WHERE id = $4',
    [
      String(profile.name || 'Usuário').trim() || 'Usuário',
      String(profile.email || user.email).trim().toLowerCase() || user.email,
      now,
      userId
    ]
  );

  await client.query('DELETE FROM goals WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM calculator_settings WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM subscription_payments WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM financial_accounts WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM investment_accounts WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM budgets WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);

  await client.query(
    'INSERT INTO goals (user_id, name, target, current_amount, updated_at) VALUES ($1, $2, $3, $4, $5)',
      [
        userId,
        String(goal.name || 'Meta financeira').trim() || 'Meta financeira',
        sanitizeMoney(goal.target),
        sanitizeMoney(goal.currentAmount),
        now
      ]
  );

  await client.query(
    `INSERT INTO calculator_settings (user_id, initial_amount, monthly_contribution, annual_rate, years, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId,
      sanitizeMoney(calculator.initialAmount),
      sanitizeMoney(calculator.monthlyContribution),
      Number.isFinite(Number(calculator.annualRate)) ? Math.max(0, Number(calculator.annualRate)) : 0,
      Number(calculator.years || 0),
      now
    ]
  );

  const validInstitutionIds = new Set((await client.query('SELECT id FROM financial_institutions')).rows.map((row) => row.id));
  const validPaymentMethodIds = new Set((await client.query('SELECT id FROM payment_methods')).rows.map((row) => row.id));
  const accountIds = new Set();
  const investmentAccountIds = new Set();

  for (const item of financialAccounts) {
    const accountId = String(item.id || makeId('fa'));
    const type = ['checking_account', 'savings_account', 'credit_card', 'debit_card', 'cash', 'digital_wallet', 'investment_account', 'prepaid_card', 'benefits_card', 'other'].includes(item.type)
      ? item.type
      : 'checking_account';
    const institutionId = validInstitutionIds.has(String(item.institutionId || '')) ? String(item.institutionId) : null;
    const lastFourDigits = String(item.lastFourDigits || '').replace(/\D/g, '').slice(0, 4) || null;
    const closingDay = normalizeDay(item.closingDay);
    const dueDay = normalizeDay(item.dueDay);
    const isActive = item.isActive !== false && !item.archivedAt;
    const archivedAt = isActive ? null : (item.archivedAt || now);

    accountIds.add(accountId);
    await client.query(
      `INSERT INTO financial_accounts (
         id, user_id, institution_id, name, nickname, type, subtype, last_four_digits, card_brand,
         color, icon, initial_balance, manual_balance, credit_limit, closing_day, due_day,
         include_in_total_balance, is_default, is_active, archived_at, notes, external_provider,
         external_account_id, external_item_id, last_sync_at, sync_status, consent_expires_at, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)`,
      [
        accountId,
        userId,
        institutionId,
        String(item.name || item.nickname || 'Conta financeira').trim() || 'Conta financeira',
        String(item.nickname || '').trim() || null,
        type,
        String(item.subtype || '').trim() || null,
        lastFourDigits,
        String(item.cardBrand || '').trim() || null,
        sanitizeColor(item.color),
        String(item.icon || '').trim() || null,
        sanitizeMoney(item.initialBalance),
        item.manualBalance === null || item.manualBalance === undefined || item.manualBalance === '' ? null : sanitizeMoney(item.manualBalance),
        item.creditLimit === null || item.creditLimit === undefined || item.creditLimit === '' ? null : sanitizeMoney(item.creditLimit),
        closingDay,
        dueDay,
        item.includeInTotalBalance !== false,
        Boolean(item.isDefault),
        isActive,
        archivedAt,
        String(item.notes || '').trim() || null,
        String(item.externalProvider || '').trim() || null,
        String(item.externalAccountId || '').trim() || null,
        String(item.externalItemId || '').trim() || null,
        parseOptionalTimestamp(item.lastSyncAt),
        String(item.syncStatus || '').trim() || null,
        parseOptionalTimestamp(item.consentExpiresAt),
        now,
        now
      ]
    );

    const methodIds = Array.isArray(item.paymentMethodIds) ? item.paymentMethodIds : [];
    for (const methodId of methodIds.filter((id) => validPaymentMethodIds.has(String(id)))) {
      await client.query(
        `INSERT INTO financial_account_payment_methods (id, financial_account_id, payment_method_id, is_enabled, created_at)
         VALUES ($1, $2, $3, TRUE, $4)
         ON CONFLICT (financial_account_id, payment_method_id) DO UPDATE SET is_enabled = TRUE`,
        [makeId('fapm'), accountId, String(methodId), now]
      );
    }
  }

  for (const item of investmentAccounts) {
    const investmentAccountId = String(item.id || makeId('invacct'));
    const institutionId = validInstitutionIds.has(String(item.institutionId || '')) ? String(item.institutionId) : null;
    const investmentType = ['stock', 'crypto', 'reits', 'fixed_income', 'fund', 'pension', 'other'].includes(item.investmentType) ? item.investmentType : 'other';
    const riskProfile = ['conservative', 'moderate', 'aggressive', 'balanced'].includes(item.riskProfile) ? item.riskProfile : 'balanced';
    const isActive = item.isActive !== false;
    const archivedAt = !isActive && item.archivedAt ? parseOptionalTimestamp(item.archivedAt) : null;

    investmentAccountIds.add(investmentAccountId);
    await client.query(
      `INSERT INTO investment_accounts (
         id, user_id, institution_id, name, nickname, account_number, initial_investment, current_total,
         currency, investment_type, risk_profile, color, icon, notes, is_active, archived_at, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        investmentAccountId,
        userId,
        institutionId,
        String(item.name || item.nickname || 'Conta de investimento').trim() || 'Conta de investimento',
        String(item.nickname || '').trim() || null,
        String(item.accountNumber || '').trim() || null,
        sanitizeMoney(item.initialInvestment),
        sanitizeMoney(item.currentTotal),
        String(item.currency || 'BRL').trim() || 'BRL',
        investmentType,
        riskProfile,
        sanitizeColor(item.color),
        String(item.icon || '').trim() || null,
        String(item.notes || '').trim() || null,
        isActive,
        archivedAt,
        now,
        now
      ]
    );
  }

  for (const item of transactions) {
    const type = ['income', 'expense', 'investment'].includes(item.type) ? item.type : 'expense';
    const paymentMethodId = validPaymentMethodIds.has(String(item.paymentMethodId || '')) ? String(item.paymentMethodId) : null;
    const financialAccountId = accountIds.has(String(item.financialAccountId || '')) ? String(item.financialAccountId) : null;
    const investmentAccountId = investmentAccountIds.has(String(item.investmentAccountId || '')) ? String(item.investmentAccountId) : null;
    await client.query(
      `INSERT INTO transactions (id, user_id, description, amount, type, category, date, recurring, payment_method_id, financial_account_id, investment_account_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        String(item.id || makeId('tx')),
        userId,
        String(item.description || 'Sem descrição').trim() || 'Sem descrição',
        sanitizeMoney(item.amount),
        type,
        String(item.category || 'Outros').trim() || 'Outros',
        String(item.date || utcNow().slice(0, 10)),
        Boolean(item.recurring),
        paymentMethodId,
        financialAccountId,
        investmentAccountId,
        now,
        now
      ]
    );
  }

  for (const item of budgets) {
    await client.query(
      `INSERT INTO budgets (id, user_id, category, limit_amount, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        String(item.id || makeId('budget')),
        userId,
        String(item.category || 'Outros').trim() || 'Outros',
        sanitizeMoney(item.limit),
        now,
        now
      ]
    );
  }

  for (const item of subscriptions) {
    const dueDay = Math.max(1, Math.min(31, Number(item.dueDay || 1)));
    const subscriptionId = String(item.id || makeId('sub'));
    await client.query(
      `INSERT INTO subscriptions (id, user_id, name, amount, due_day, category, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        subscriptionId,
        userId,
        String(item.name || 'Assinatura').trim() || 'Assinatura',
        sanitizeMoney(item.amount),
        dueDay,
        String(item.category || 'Assinaturas').trim() || 'Assinaturas',
        item.active !== false,
        now,
        now
      ]
    );

    const payments = Array.isArray(item.payments) ? item.payments : [];
    for (const payment of payments) {
      const periodMonth = String(payment.periodMonth || '').slice(0, 7);
      if (!/^\d{4}-\d{2}$/.test(periodMonth)) continue;
      await client.query(
        `INSERT INTO subscription_payments (id, user_id, subscription_id, period_month, paid_at, amount, transaction_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (user_id, subscription_id, period_month) DO NOTHING`,
        [
          String(payment.id || makeId('subpay')),
          userId,
          subscriptionId,
          periodMonth,
          String(payment.paidAt || utcNow().slice(0, 10)),
          sanitizeMoney(payment.amount || item.amount),
          String(payment.transactionId || ''),
          now
        ]
      );
    }
  }
}

function extractSessionToken(req) {
  const cookies = parseCookies(req);
  if (cookies.obsyd_session) {
    return cookies.obsyd_session;
  }

  const authHeader = String(req.headers.authorization || '');
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return null;
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  res.writeHead(statusCode, {
    ...securityHeaders(),
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...extraHeaders
  });
  res.end(body);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    ...securityHeaders(),
    'Content-Type': contentType,
    'Content-Length': data.length,
    'Cache-Control': 'no-store'
  });
  res.end(data);
}

function securityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        raw = '';
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed && typeof parsed === 'object' ? parsed : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function getClientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local').split(',')[0].trim();
}

function isRateLimited(key, limit = 8, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const current = loginAttempts.get(key) || { count: 0, resetAt: now + windowMs };
  if (current.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  current.count += 1;
  loginAttempts.set(key, current);
  return current.count > limit;
}

function sanitizeMoney(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric < 0) return 0;
  return Math.round(numeric * 100) / 100;
}

function normalizeDay(value) {
  if (value === null || value === undefined || value === '') return null;
  const day = Number(value);
  if (!Number.isFinite(day)) return null;
  return Math.max(1, Math.min(31, Math.trunc(day)));
}

function sanitizeColor(value) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : null;
}

function parseOptionalTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function resolveStaticPath(urlPathname) {
  let requestedPath = urlPathname || '/';
  if (requestedPath === '/') return path.join(PUBLIC_DIR, 'index.html');

  requestedPath = requestedPath.replace(/^\/+/, '');
  const candidate = path.resolve(path.join(PUBLIC_DIR, requestedPath));
  const safeRoot = path.resolve(PUBLIC_DIR);

  if (!candidate.startsWith(safeRoot)) {
    return null;
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    const indexFile = path.join(candidate, 'index.html');
    if (fs.existsSync(indexFile)) return indexFile;
  }

  return path.join(PUBLIC_DIR, 'index.html');
}

async function handler(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      ...securityHeaders(),
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
    });
    return res.end();
  }

  if (requestUrl.pathname === '/api/health' && req.method === 'GET') {
    if (!HAS_DATABASE) {
      return sendJson(res, 503, {
        ok: false,
        configured: false,
        engine: 'neon-postgres',
        error: 'DATABASE_URL não configurada.'
      });
    }

    try {
      await ensureDatabase();
      await pool.query('SELECT 1 AS ok');
      return sendJson(res, 200, { ok: true, configured: true, engine: 'neon-postgres' });
    } catch (error) {
      return sendJson(res, 503, {
        ok: false,
        configured: true,
        engine: 'neon-postgres',
        error: error.message || 'Falha ao conectar no banco.'
      });
    }
  }

  if (requestUrl.pathname.startsWith('/api/')) {
    try {
      await ensureDatabase();
    } catch (error) {
      return sendJson(res, 500, { error: error.message || 'Banco de dados não configurado.' });
    }
  }

  if (requestUrl.pathname === '/api/auth/login' && req.method === 'POST') {
    const payload = await readJsonBody(req);
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '').trim();
    const attemptKey = `${getClientIp(req)}:${email || 'sem-email'}`;

    if (!email || !email.includes('@') || !password) {
      return sendJson(res, 400, { error: 'Informe um e-mail e uma senha válidos.' });
    }
    if (isRateLimited(attemptKey)) {
      return sendJson(res, 429, { error: 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.' });
    }

    try {
      const result = await withTransaction(async (client) => {
        const now = utcNow();
        const userResult = await client.query(
          'SELECT id, name, email, password_hash, password_hint FROM users WHERE email = $1 LIMIT 1',
          [email]
        );
        const user = userResult.rows[0] || null;
        if (!user) {
          throw new Error('Credenciais inválidas.');
        }

        const isValid = await validatePasswordWithLegacyUpgrade(client, user, password, now);

        if (!isValid) {
          throw new Error('Credenciais inválidas.');
        }

        const token = crypto.randomBytes(24).toString('base64url');
        await client.query('INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)', [token, user.id, now]);
        return { token, user: { id: user.id, name: user.name, email: user.email } };
      });

      return sendJson(res, 200, result, {
        'Set-Cookie': createSessionCookie(result.token)
      });
    } catch (error) {
      return sendJson(res, 401, { error: error.message || 'Não foi possível entrar.' });
    }
  }

  if (requestUrl.pathname === '/api/auth/register' && req.method === 'POST') {
    const payload = await readJsonBody(req);
    const name = String(payload.name || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '').trim();

    if (!name || name.length < 2) {
      return sendJson(res, 400, { error: 'Informe seu nome para criar a conta.' });
    }
    if (!email || !email.includes('@')) {
      return sendJson(res, 400, { error: 'Informe um e-mail válido.' });
    }
    if (password.length < 6) {
      return sendJson(res, 400, { error: 'A senha precisa ter pelo menos 6 caracteres.' });
    }

    try {
      const result = await withTransaction(async (client) => {
        const now = utcNow();
        const existing = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);
        if (existing.rows[0]) {
          throw new Error('Já existe uma conta com esse e-mail.');
        }

        const newUser = {
          id: makeId('user'),
          name,
          email,
          passwordHash: await hashPassword(password),
          createdAt: now,
          updatedAt: now
        };

        await client.query(
          `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [newUser.id, newUser.name, newUser.email, newUser.passwordHash, newUser.createdAt, newUser.updatedAt]
        );

        await initializeEmptyUserState(client, newUser.id);

        const token = crypto.randomBytes(24).toString('base64url');
        await client.query('INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)', [token, newUser.id, now]);
        return { token, user: { id: newUser.id, name: newUser.name, email: newUser.email } };
      });

      return sendJson(res, 201, result, {
        'Set-Cookie': createSessionCookie(result.token)
      });
    } catch (error) {
      const status = error.message === 'Já existe uma conta com esse e-mail.' ? 409 : 400;
      return sendJson(res, status, { error: error.message || 'Não foi possível criar a conta.' });
    }
  }

  if (requestUrl.pathname === '/api/auth/me' && req.method === 'GET') {
    const token = extractSessionToken(req);
    const user = await findUserByToken(token);
    if (!user) return sendJson(res, 401, { error: 'Sessão inválida ou expirada.' });
    return sendJson(res, 200, { user: { id: user.id, name: user.name, email: user.email } });
  }

  if (requestUrl.pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = extractSessionToken(req);
    if (!token) return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
    await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': clearSessionCookie() });
  }

  if (requestUrl.pathname === '/api/bootstrap' && req.method === 'GET') {
    const token = extractSessionToken(req);
    const user = await findUserByToken(token);
    if (!user) return sendJson(res, 401, { error: 'Sessão inválida ou expirada.' });
    return sendJson(res, 200, { state: await buildState(user.id) });
  }

  if (requestUrl.pathname === '/api/bootstrap' && req.method === 'PUT') {
    const token = extractSessionToken(req);
    const payload = await readJsonBody(req);
    const user = await findUserByToken(token);

    if (!user) return sendJson(res, 401, { error: 'Sessão inválida ou expirada.' });
    if (!payload || typeof payload.state !== 'object' || Array.isArray(payload.state)) {
      return sendJson(res, 400, { error: 'Payload inválido para sincronização.' });
    }

    try {
      const nextState = await withTransaction(async (client) => {
        await replaceUserDataset(user.id, payload.state, client);
        return buildState(user.id, client);
      });
      return sendJson(res, 200, { ok: true, state: nextState });
    } catch (error) {
      return sendJson(res, 500, { error: error.message || 'Falha ao salvar os dados.' });
    }
  }

  if (req.method === 'GET') {
    const filePath = resolveStaticPath(requestUrl.pathname);
    if (!filePath) return sendJson(res, 400, { error: 'Caminho inválido.' });
    if (!fs.existsSync(filePath)) return sendJson(res, 404, { error: 'Arquivo não encontrado.' });
    return sendFile(res, filePath);
  }

  return sendJson(res, 404, { error: 'Rota não encontrada.' });
}

const server = http.createServer((req, res) => {
  handler(req, res).catch((error) => {
    console.error('Erro inesperado:', error);
    sendJson(res, 500, { error: 'Erro interno do servidor.' });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Obsyd disponível em http://${HOST}:${PORT}`);
  console.log('Engine de persistência: Neon PostgreSQL');
  console.log(`DATABASE_URL configurada: ${HAS_DATABASE ? 'sim' : 'não'}`);
  console.log('Healthcheck: /api/health');
});
