import {validatePersistentRunSchema,validatePersistentAuditSchema} from './payroll-run-persistence.js';

const TYPE_RULES={
  PayrollRunID:['text','string'],
  PayrollMonth:['text','string','date'],
  Status:['single_select','select','text','string'],
  PreparedHash:['text','string'],
  RowCount:['number'],
  NewRecordCount:['number'],
  DuplicateCount:['number'],
  PreparedBy:['text','string'],
  ValidatedAt:['date','datetime'],
  ApprovedBy:['text','string'],
  ApprovedAt:['date','datetime'],
  LockedBy:['text','string'],
  LockedAt:['date','datetime'],
  CommittedAt:['date','datetime'],
  UpdatedAt:['date','datetime'],
  EventID:['text','string'],
  PayrollMonth:['text','string','date'],
  Action:['text','string','single_select','select'],
  User:['text','string'],
  EventAt:['date','datetime'],
  Details:['text','string']
};

function normalizeType(type){
  if(type===1)return 'text';
  if(type===2)return 'number';
  if(type===5)return 'date';
  if(type===3)return 'single_select';
  return String(type??'').toLowerCase();
}
function inspectTypes(fields,map){
  const issues=[];
  for(const [logical,fieldName] of Object.entries(map||{})){
    const f=(fields||[]).find(x=>x.field_name===fieldName);
    if(!f)continue;
    const allowed=TYPE_RULES[fieldName]||[];
    const actual=normalizeType(f.type);
    if(allowed.length&&!allowed.includes(actual))issues.push({field:fieldName,actualType:actual,allowedTypes:allowed});
  }
  return issues;
}

export async function productionReadiness(){
  const [runs,audit]=await Promise.all([validatePersistentRunSchema(),validatePersistentAuditSchema()]);
  const checks=[
    {check:'PayrollRuns configured',ok:runs.ready,details:runs.ready?'Configured':'Missing FEISHU_TABLE_PAYROLL_RUNS or required fields'},
    {check:'PayrollAudit configured',ok:audit.ready,details:audit.ready?'Configured':'Missing FEISHU_TABLE_PAYROLL_AUDIT or required fields'},
    {check:'PayrollRuns field types',ok:runs.ready&&inspectTypes(runs.fields,runs.mapping).length===0,issues:runs.ready?inspectTypes(runs.fields,runs.mapping):[]},
    {check:'PayrollAudit field types',ok:audit.ready&&inspectTypes(audit.fields,audit.mapping).length===0,issues:audit.ready?inspectTypes(audit.fields,audit.mapping):[]},
    {check:'Payroll write explicitly enabled',ok:process.env.ENABLE_PAYROLL_WRITE==='true',details:process.env.ENABLE_PAYROLL_WRITE==='true'?'ENABLED':'DISABLED'}
  ];
  const ready=checks.every(x=>x.ok);
  return {ready,writeEnabled:process.env.ENABLE_PAYROLL_WRITE==='true',checks,policy:ready?'CONTROLLED PAYROLL MAY PROCEED TO FINAL LIVE TEST':'FAIL CLOSED — DO NOT ENABLE PAYROLL WRITE'};
}
