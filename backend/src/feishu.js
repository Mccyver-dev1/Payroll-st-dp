import { config, assertFeishuConfig } from './config.js';

const BASE = 'https://open.feishu.cn/open-apis';

let cached = {
  token: null,
  expiresAt: 0
};

/**
 * Execute Feishu Open API request.
 */
async function jsonFetch(url, options = {}) {
  const response = await fetch(url, options);

  const raw = await response.text();

  let body;

  try {
    body = JSON.parse(raw);
  } catch {
    body = {
      raw
    };
  }

  if (
    !response.ok ||
    (body.code !== undefined && body.code !== 0)
  ) {
    throw new Error(
      `Feishu API ${response.status}: code=${body.code ?? 'unknown'} msg=${body.msg || raw}`
    );
  }

  return body;
}

/**
 * Get tenant access token.
 */
export async function tenantAccessToken() {
  assertFeishuConfig();

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

  const ttl = Number(
    body.expire || 7200
  );

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
 * GET:
 *   Authorization + Accept
 *
 * Request with body:
 *   Authorization + Accept + Content-Type
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
 *
 * Important:
 * The first request intentionally has NO query parameters.
 * This isolates Feishu's list-tables endpoint from pagination
 * parameter issues.
 */
export async function listTables() {
  const items = [];

  let pageToken = '';
  let firstRequest = true;

  do {
    let path =
      `/bitable/v1/apps/${config.appToken}/tables`;

    /*
     * First request:
     * GET /tables
     *
     * Do not send page_size/page_token.
     */
    if (!firstRequest) {
      const qs = new URLSearchParams();

      qs.set('page_size', '100');

      if (pageToken) {
        qs.set(
          'page_token',
          pageToken
        );
      }

      path += `?${qs.toString()}`;
    }

    const out = await call(path);

    items.push(
      ...(out.data?.items || [])
    );

    pageToken =
      out.data?.page_token || '';

    const hasMore =
      Boolean(out.data?.has_more);

    firstRequest = false;

    /*
     * Stop if Feishu says there are
     * no more pages, even if page_token
     * happens to be present.
     */
    if (!hasMore) {
      break;
    }

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
    const qs = new URLSearchParams();

    qs.set('page_size', '100');

    if (pageToken) {
      qs.set(
        'page_token',
        pageToken
      );
    }

    const out = await call(
      `/bitable/v1/apps/${config.appToken}/tables/${tableId}/fields?${qs.toString()}`
    );

    items.push(
      ...(out.data?.items || [])
    );

    pageToken =
      out.data?.page_token || '';

    if (!out.data?.has_more) {
      break;
    }

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
    const qs = new URLSearchParams();

    /*
     * Feishu allows up to 500 records
     * per request for this endpoint.
     */
    qs.set('page_size', '500');

    if (pageToken) {
      qs.set(
        'page_token',
        pageToken
      );
    }

    const out = await call(
      `/bitable/v1/apps/${config.appToken}/tables/${tableId}/records?${qs.toString()}`
    );

    all.push(
      ...(out.data?.items || [])
    );

    pageToken =
      out.data?.page_token || '';

    if (!out.data?.has_more) {
      break;
    }

  } while (pageToken);

  return all;
}

/**
 * Resolve payroll tables.
 *
 * Priority:
 * 1. Explicit table ID from environment variables
 * 2. Automatic discovery by table name
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
  ) => {
    return (
      config.tables[key] ||
      names
        .map(
          name => byName.get(name)
        )
        .find(Boolean) ||
      null
    );
  };

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
 * Normalize a Feishu record.
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
