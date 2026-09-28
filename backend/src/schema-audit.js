const CANONICAL = [
  'companies','departments','positions','employees',
  'attendanceSummary','payroll','payrollItems','payslips'
];

const PAYROLL_EXPECTED = {
  employees: [
    ['EmployeeID', ['text','number','autoNumber']],
    ['CompanyID', ['text','link','singleSelect']],
    ['DepartmentID', ['text','link','singleSelect']],
    ['PositionID', ['text','link','singleSelect']],
    ['Salary', ['number','currency']]
  ],
  attendanceSummary: [
    ['EmployeeID', ['text','link']],
    ['PayrollMonth', ['date','text']],
    ['WorkDays', ['number']],
    ['OT_Hours', ['number']],
    ['LateMinutes', ['number']],
    ['AbsentDays', ['number']]
  ],
  payroll: [
    ['EmployeeID', ['text','link']],
    ['PayrollMonth', ['date','text']],
    ['BaseSalary', ['number','currency']],
    ['OTPay', ['number','currency']],
    ['Deduction', ['number','currency']],
    ['SocialSecurity', ['number','currency']],
    ['Tax', ['number','currency']],
    ['NetSalary', ['number','currency']]
  ],
  payrollItems: [
    ['PayrollID', ['text','link']],
    ['EmployeeID', ['text','link']],
    ['ItemType', ['text','singleSelect']],
    ['Amount', ['number','currency']]
  ],
  payslips: [
    ['PayslipID', ['text','autoNumber']],
    ['PayrollID', ['text','link']],
    ['EmployeeID', ['text','link']],
    ['NetSalary', ['number','currency']]
  ]
};

function typeLabel(type) {
  const map = {
    1:'text', 2:'number', 3:'singleSelect', 4:'multiSelect',
    5:'date', 7:'checkbox', 11:'user', 13:'phone',
    15:'url', 17:'attachment', 18:'link', 19:'formula',
    20:'duplexLink', 21:'lookup', 22:'createdTime', 23:'modifiedTime',
    1001:'currency'
  };
  return map[type] || String(type ?? 'unknown');
}

function propertySummary(property) {
  if (!property || typeof property !== 'object') return null;
  const out = {};
  for (const k of ['options','formula','formatter','auto_fill','multiple','table_id','back_field_name','filter_info','condition','date_formatter']) {
    if (property[k] !== undefined) out[k] = property[k];
  }
  return Object.keys(out).length ? out : null;
}

function normalizeField(f) {
  return {
    field_id: f.field_id,
    field_name: f.field_name,
    type: f.type,
    type_label: typeLabel(f.type),
    is_primary: !!f.is_primary,
    property: propertySummary(f.property),
    raw_property: f.property ?? null
  };
}

function fieldIndex(fields) {
  return new Map(fields.map(f => [String(f.field_name || '').trim().toLowerCase(), f]));
}

function findField(fields, aliases) {
  const idx = fieldIndex(fields);
  for (const alias of aliases) {
    const f = idx.get(alias.toLowerCase());
    if (f) return f;
  }
  return null;
}

function containsExpectedType(actual, allowed) {
  const a = typeLabel(actual.type);
  return allowed.includes(a) || allowed.includes(String(actual.type));
}

export function buildSchemaAudit({mapping, schemas}) {
  const tables = {};
  const warnings = [];
  const critical = [];
  const payrollReadiness = [];

  for (const key of CANONICAL) {
    const fields = (schemas[key]?.fields || []).map(normalizeField);
    const present = new Set(fields.map(f => f.field_name));
    tables[key] = {
      table_id: mapping[key] || null,
      status: mapping[key] ? 'FOUND' : 'NOT_FOUND',
      field_count: fields.length,
      fields,
      links: fields.filter(f => ['link','duplexLink'].includes(f.type_label)),
      lookups: fields.filter(f => f.type_label === 'lookup'),
      formulas: fields.filter(f => f.type_label === 'formula')
    };
    if (!mapping[key]) critical.push(`Missing canonical table: ${key}`);
    if (mapping[key] && fields.length === 0) warnings.push(`${key}: no fields returned`);
  }

  for (const [tableKey, expectations] of Object.entries(PAYROLL_EXPECTED)) {
    const fields = schemas[tableKey]?.fields || [];
    const row = {table: tableKey, checks: [], missing: [], type_mismatches: []};
    for (const [name, allowed] of expectations) {
      const f = findField(fields, [name]);
      if (!f) {
        row.missing.push(name);
        warnings.push(`${tableKey}: expected field missing: ${name}`);
      } else if (!containsExpectedType(f, allowed)) {
        row.type_mismatches.push({
          field: f.field_name,
          actual: typeLabel(f.type),
          expected: allowed
        });
        warnings.push(`${tableKey}.${f.field_name}: type ${typeLabel(f.type)} is not in expected set ${allowed.join(', ')}`);
      } else {
        row.checks.push({field: f.field_name, type: typeLabel(f.type), status:'OK'});
      }
    }
    row.status = row.missing.length || row.type_mismatches.length ? 'REVIEW' : 'OK';
    payrollReadiness.push(row);
  }

  const payrollFields = schemas.payroll?.fields || [];
  const hasTax = !!findField(payrollFields, ['Tax','IncomeTax','WithholdingTax','ภาษี','ภาษีหัก ณ ที่จ่าย']);
  const hasSS = !!findField(payrollFields, ['SocialSecurity','SSO','ประกันสังคม']);
  const hasNet = !!findField(payrollFields, ['NetSalary','NetPay','เงินสุทธิ']);
  if (!hasTax) critical.push('Payroll: Tax field not detected');
  if (!hasSS) critical.push('Payroll: Social Security field not detected');
  if (!hasNet) critical.push('Payroll: Net Salary field not detected');

  return {
    generatedAt: new Date().toISOString(),
    canonicalTables: tables,
    payrollReadiness,
    critical,
    warnings,
    summary: {
      canonicalFound: Object.values(tables).filter(x => x.status === 'FOUND').length,
      canonicalTotal: CANONICAL.length,
      criticalCount: critical.length,
      warningCount: warnings.length,
      payrollTablesReviewed: Object.keys(PAYROLL_EXPECTED).length
    }
  };
}
