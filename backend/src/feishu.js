import { config, assertFeishuConfig } from './config.js';

const BASE = 'https://open.feishu.cn/open-apis';

let cached = {
  token: null,
  expiresAt: 0
};

/**
 * Fetch JSON from Feishu Open API.
 * Includes HTTP status + Feishu error code/message for diagnostics.
 */
async function jsonFetch(url, options = {}) {
  const r = await fetch(url, options);

  const raw = await r.text();

  let body;

  try {
    body = JSON.parse(raw);
  } catch {
    body = {
      raw
    };
  }

  if (
    !r.ok ||
    (body.code !== undefined && body.code !== 0)
  ) {
    throw new Error(
      `Feishu API ${r.status}: code=${body.code ?? 'unknown'} msg=${body.msg || raw}`
    );
  }

  return body;
}

/**
 * Get Feishu tenant access token.
 *
 * Uses:
 * FEISHU_APP_ID
 * FEISHU_APP_SECRET
 */
export async function tenantAccessToken() {
  assertFeishuConfig();

  // Reuse cached token while valid.
  if (
    cached.token &&
    Date.now() < cached.expiresAt
  ) {
    return cached.token;
  }

  const body = await jsonFetch(
    `${BASE}/auth/v3/tenant_access_token/internal`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        app_id: config.appId,
        app_secret: config.appSecret
      })
    }
  );

  const ttl = Number(body.expire || 7200);

  cached = {
    token: body.tenant_access_token,
    expiresAt:
      Date.now() +
      Math.max(60, ttl - 120) * 1000
  };

  return cached.token;
}

/**
 * Call Feishu Open API.
 *
 * GET requests:
 * - Authorization
 * - Accept
 *
 * Requests with a body:
 * - additionally send Content-Type application/json
 */
async function call(path, options = {}) {
  const token = await tenantAccessToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    ...(options.headers || {})
  };

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  return jsonFetch(
    BASE + path,
    {
      ...options,
      headers
    }
  );
}

/**
 * List all tables in the Feishu Base.
 */
export async function listTables() {
  const items = [];

  let pageToken = '';

  do {
    const qs = new URLSearchParams({
      page_size: '100'
    });

    if (pageToken) {
      qs.set('page_token', pageToken);
    }

    const out = await call(
      `/bitable/v1/apps/${config.appToken}/tables?${qs}`
    );

    items.push(
      ...(out.data?.items || [])
    );

    pageToken =
      out.data?.page_token || '';

  } while (pageToken);

  return items;
}

/**
 * Get all fields of a Feishu Base table.
 */
export async function getTableFields(tableId) {
  const items = [];

  let pageToken = '';

  do {
    const qs = new URLSearchParams({
      page_size: '100'
    });

    if (pageToken) {
      qs.set('page_token', pageToken);
    }

    const out = await call(
      `/bitable/v1/apps/${config.appToken}/tables/${tableId}/fields?${qs}`
    );

    items.push(
      ...(out.data?.items || [])
    );

    pageToken =
      out.data?.page_token || '';

  } while (pageToken);

  return items;
}

/**
 * List all records from a Feishu Base table.
 */
export async function listRecords(tableId) {
  const all = [];

  let pageToken = '';

  do {
    const qs = new URLSearchParams({
      page_size: '500'
    });

    if (pageToken) {
      qs.set('page_token', pageToken);
    }

    const out = await call(
      `/bitable/v1/apps/${config.appToken}/tables/${tableId}/records?${qs}`
    );

    all.push(
      ...(out.data?.items || [])
    );

    pageToken =
      out.data?.page_token || '';

  } while (pageToken);

  return all;
}

/**
 * Resolve payroll tables by:
 *
 * 1. Explicit environment variable table ID
 * 2. Table name discovery
 */
export async function resolveTables() {
  const tables = await listTables();

  const byName = new Map(
    tables.map(
      table => [
        table.name,
        table.table_id
      ]
    )
  );

  const pick = (
    key,
    names
  ) =>
    config.tables[key] ||
    names
      .map(
        name => byName.get(name)
      )
      .find(Boolean) ||
    null;

  return {
    companies: pick(
      'companies',
      ['Companies']
    ),

    departments: pick(
      'departments',
      ['Departments']
    ),

    positions: pick(
      'positions',
      ['Positions']
    ),

    employees: pick(
      'employees',
      ['Employees']
    ),

    attendanceSummary: pick(
      'attendanceSummary',
      ['AttendanceSummary']
    ),

    payroll: pick(
      'payroll',
      ['Payroll']
    ),

    payrollItems: pick(
      'payrollItems',
      ['PayrollItems']
    ),

    payslips: pick(
      'payslips',
      ['Payslips']
    ),

    discoveredTables:
      tables.map(
        table => ({
          name: table.name,
          table_id: table.table_id
        })
      )
  };
}

/**
 * Normalize Feishu field values.
 *
 * Feishu may return values as:
 * - primitive
 * - array
 * - object
 * - object.text
 * - object.name
 * - object.id
 */
function normalize(value) {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (
    value &&
    typeof value === 'object'
  ) {
    return (
      value.text ??
      value.name ??
      value.id ??
      value
    );
  }

  return value;
}

/**
 * Normalize a Feishu record into a predictable structure.
 */
export function normalizeRecord(record) {
  const fields = {};

  for (
    const [key, value]
    of Object.entries(
      record.fields || {}
    )
  ) {
    fields[key] = normalize(value);
  }

  return {
    record_id: record.record_id,
    fields
  };
}
