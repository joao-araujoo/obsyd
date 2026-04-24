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

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id_date ON transactions(user_id, date DESC, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_budgets_user_id_created_at ON budgets(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_created_at ON subscriptions(user_id, created_at DESC);
  `);

  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
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

async function initializeEmptyUserState(client, userId) {
  const now = utcNow();

  await client.query(
    'INSERT INTO goals (user_id, name, target, updated_at) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO NOTHING',
    [userId, 'Objetivo principal', 0, now]
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

  const [userResult, goalResult, calculatorResult, transactionsResult, budgetsResult, subscriptionsResult] = await Promise.all([
    client.query('SELECT id, name, email FROM users WHERE id = $1 LIMIT 1', [userId]),
    client.query('SELECT name, target FROM goals WHERE user_id = $1 LIMIT 1', [userId]),
    client.query('SELECT initial_amount, monthly_contribution, annual_rate, years FROM calculator_settings WHERE user_id = $1 LIMIT 1', [userId]),
    client.query(
      `SELECT id, description, amount, type, category, date, recurring
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
      target: Number(goal?.target || 0)
    },
    calculator: {
      initialAmount: Number(calculator?.initial_amount || 0),
      monthlyContribution: Number(calculator?.monthly_contribution || 0),
      annualRate: Number(calculator?.annual_rate || 0),
      years: Number(calculator?.years || 0)
    },
    transactions: transactionsResult.rows.map((row) => ({
      id: row.id,
      description: row.description,
      amount: Number(row.amount || 0),
      type: row.type,
      category: row.category,
      date: toDateOnly(row.date),
      recurring: Boolean(row.recurring)
    })),
    budgets: budgetsResult.rows.map((row) => ({
      id: row.id,
      category: row.category,
      limit: Number(row.limit_amount || 0)
    })),
    subscriptions: subscriptionsResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      amount: Number(row.amount || 0),
      dueDay: Number(row.due_day || 1),
      category: row.category,
      active: Boolean(row.active)
    }))
  };
}

async function replaceUserDataset(userId, state, client) {
  const now = utcNow();
  const profile = state?.profile || {};
  const goal = state?.goal || {};
  const calculator = state?.calculator || {};
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
  await client.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM budgets WHERE user_id = $1', [userId]);
  await client.query('DELETE FROM subscriptions WHERE user_id = $1', [userId]);

  await client.query(
    'INSERT INTO goals (user_id, name, target, updated_at) VALUES ($1, $2, $3, $4)',
    [
      userId,
      String(goal.name || 'Meta financeira').trim() || 'Meta financeira',
      Number(goal.target || 0),
      now
    ]
  );

  await client.query(
    `INSERT INTO calculator_settings (user_id, initial_amount, monthly_contribution, annual_rate, years, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      userId,
      Number(calculator.initialAmount || 0),
      Number(calculator.monthlyContribution || 0),
      Number(calculator.annualRate || 0),
      Number(calculator.years || 0),
      now
    ]
  );

  for (const item of transactions) {
    const type = ['income', 'expense', 'investment'].includes(item.type) ? item.type : 'expense';
    await client.query(
      `INSERT INTO transactions (id, user_id, description, amount, type, category, date, recurring, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        String(item.id || makeId('tx')),
        userId,
        String(item.description || 'Sem descrição').trim() || 'Sem descrição',
        Number(item.amount || 0),
        type,
        String(item.category || 'Outros').trim() || 'Outros',
        String(item.date || utcNow().slice(0, 10)),
        Boolean(item.recurring),
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
        Number(item.limit || 0),
        now,
        now
      ]
    );
  }

  for (const item of subscriptions) {
    const dueDay = Math.max(1, Math.min(31, Number(item.dueDay || 1)));
    await client.query(
      `INSERT INTO subscriptions (id, user_id, name, amount, due_day, category, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        String(item.id || makeId('sub')),
        userId,
        String(item.name || 'Assinatura').trim() || 'Assinatura',
        Number(item.amount || 0),
        dueDay,
        String(item.category || 'Assinaturas').trim() || 'Assinaturas',
        item.active !== false,
        now,
        now
      ]
    );
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
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    ...extraHeaders
  });
  res.end(body);
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS'
  });
  res.end(data);
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
      'Access-Control-Allow-Origin': '*',
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

    if (!email || !email.includes('@') || !password) {
      return sendJson(res, 400, { error: 'Informe um e-mail e uma senha válidos.' });
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
          throw new Error('Nenhuma conta encontrada com esse e-mail.');
        }

        let isValid = false;
        if (user.password_hash) {
          isValid = await verifyPassword(password, user.password_hash);
        } else if (user.password_hint) {
          isValid = password === user.password_hint;
          if (isValid) {
            const nextHash = await hashPassword(password);
            await client.query(
              'UPDATE users SET password_hash = $1, password_hint = NULL, updated_at = $2 WHERE id = $3',
              [nextHash, now, user.id]
            );
          }
        }

        if (!isValid) {
          throw new Error('Senha incorreta.');
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
