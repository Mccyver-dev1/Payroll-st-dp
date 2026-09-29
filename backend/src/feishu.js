import { config, assertFeishuConfig } from './config.js';

const BASE = 'https://open.feishu.cn/open-apis';
let cached = { token: null, expiresAt: 0 };

async function jsonFetch(url, options = {}) {
  const r = await fetch(url, options);
  const raw = await r.text();
  let body;
  try { body = JSON.parse(raw); } catch { body = { raw }; }
  if (!r.ok || (body.code !== undefined && body.code !== 0)) {
    throw new Error(`Feishu API ${r.status}: ${body.msg || raw}`);
  }
  return body;
}

export async function tenantAccessToken() {
  assertFeishuConfig();
  if (cached.token && Date.now() < cached.expiresAt) return cached.token;
  const body = await jsonFetch(`${BASE}/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({app_id: config.appId, app_secret: config.appSecret})
  });
  const ttl = Number(body.expire || 7200);
  cached = {token: body.tenant_access_token, expiresAt: Date.now() + Math.max(60, ttl - 120) * 1000};
  return cached.token;
}

async function call(path, options = {}) {
  const token = await tenantAccessToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(options.headers || {})
  };

  // Content-Type is only needed when a request actually has a JSON body.
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  return jsonFetch(BASE + path, {
    ...options,
    headers
  });
}

export async function listTables() {
  const items = [];
  let pageToken = '';
  do {
    const qs = new URLSearchParams({page_size:'100'});
    if (pageToken) qs.set('page_token', pageToken);
    const out = await call(`/bitable/v1/apps/${config.appToken}/tables?${qs}`);
    items.push(...(out.data?.items || []));
    pageToken = out.data?.page_token || '';
  } while (pageToken);
  return items;
}

export async function getTableFields(tableId) {
  const items = [];
  let pageToken = '';
  do {
    const qs = new URLSearchParams({page_size:'100'});
    if (pageToken) qs.set('page_token', pageToken);
    const out = await call(`/bitable/v1/apps/${config.appToken}/tables/${tableId}/fields?${qs}`);
    items.push(...(out.data?.items || []));
    pageToken = out.data?.page_token || '';
  } while (pageToken);
  return items;
}

export async function listRecords(tableId) {
  const all = [];
  let pageToken = '';
  do {
    const qs = new URLSearchParams({page_size:'500'});
    if (pageToken) qs.set('page_token', pageToken);
    const out = await call(`/bitable/v1/apps/${config.appToken}/tables/${tableId}/records?${qs}`);
    all.push(...(out.data?.items || []));
    pageToken = out.data?.page_token || '';
  } while (pageToken);
  return all;
}

export async function resolveTables() {
  const tables = await listTables();
  const byName = new Map(tables.map(t => [t.name, t.table_id]));
  const pick = (key, names) => config.tables[key] || names.map(n => byName.get(n)).find(Boolean) || null;
  return {
    companies: pick('companies',['Companies']),
    departments: pick('departments',['Departments']),
    positions: pick('positions',['Positions']),
    employees: pick('employees',['Employees']),
    attendanceSummary: pick('attendanceSummary',['AttendanceSummary']),
    payroll: pick('payroll',['Payroll']),
    payrollItems: pick('payrollItems',['PayrollItems']),
    payslips: pick('payslips',['Payslips']),
    discoveredTables: tables.map(t => ({name:t.name, table_id:t.table_id}))
  };
}

function normalize(v) {
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === 'object') return v.text ?? v.name ?? v.id ?? v;
  return v;
}

export function normalizeRecord(record) {
  const fields = {};
  for (const [key,value] of Object.entries(record.fields || {})) fields[key] = normalize(value);
  return {record_id:record.record_id, fields};
}
