import {resolveTables,getTableFields,listRecords} from './feishu.js';
import {validatePersistentRunSchema,validatePersistentAuditSchema} from './payroll-run-persistence.js';

const REQUIRED = {
  companies:['CompanyID','CompanyName'],
  departments:['DepartmentID','DepartmentName'],
  positions:['PositionID','PositionName'],
  employees:['EmployeeID','Name'],
  attendanceSummary:['EmployeeID','PayrollMonth'],
  payroll:['EmployeeID','PayrollMonth'],
  payrollItems:['EmployeeID','PayrollMonth'],
  payslips:['EmployeeID','PayrollMonth']
};

const aliases = {
  EmployeeID:['EmployeeID','Employee Id','Employee ID'],
  PayrollMonth:['PayrollMonth','Month','Payroll Month'],
  Name:['Name','EmployeeName','Employee Name'],
  CompanyID:['CompanyID','Company Id','Company ID'],
  CompanyName:['CompanyName','Company Name'],
  DepartmentID:['DepartmentID','Department Id','Department ID'],
  DepartmentName:['DepartmentName','Department Name'],
  PositionID:['PositionID','Position Id','Position ID'],
  PositionName:['PositionName','Position Id','Position Name']
};

function fieldByAlias(fields, logical){
  const names=aliases[logical]||[logical];
  return (fields||[]).find(f=>names.includes(f.field_name));
}
function text(v){
  if(Array.isArray(v)) return v.map(x=>x?.text??x?.name??x?.id??'').join('|');
  if(v&&typeof v==='object') return String(v.text??v.name??v.id??'');
  return String(v??'');
}
function duplicateReport(rows,fields){
  if(fields.some(f=>!f)) return {available:false,duplicates:[],checked:rows.length};
  const map=new Map();
  for(const row of rows){
    const key=fields.map(f=>text(row.fields?.[f]).trim()).join('::');
    if(!key.replace(/::/g,'')) continue;
    const ids=map.get(key)||[];ids.push(row.record_id);map.set(key,ids);
  }
  return {
    available:true,
    duplicates:[...map.entries()].filter(([,ids])=>ids.length>1).map(([key,recordIds])=>({key,recordIds})),
    checked:rows.length
  };
}

export async function buildGoLiveAudit(){
  const mapping=await resolveTables();
  const tables=[];

  for(const key of Object.keys(REQUIRED)){
    const tableId=mapping[key];
    if(!tableId){tables.push({key,status:'MISSING',tableId:null});continue;}
    const fields=await getTableFields(tableId);
    const missing=REQUIRED[key].filter(logical=>!fieldByAlias(fields,logical));
    tables.push({key,status:missing.length?'FIELD_GAP':'OK',tableId,fieldCount:fields.length,missing});
  }

  const runSchema=await validatePersistentRunSchema();
  const auditSchema=await validatePersistentAuditSchema();

  let payrollDuplicates={available:false,duplicates:[],checked:0};
  if(mapping.payroll){
    const fields=await getTableFields(mapping.payroll);
    payrollDuplicates=duplicateReport(
      await listRecords(mapping.payroll),
      [fieldByAlias(fields,'EmployeeID')?.field_name,fieldByAlias(fields,'PayrollMonth')?.field_name]
    );
  }

  let employeeDuplicates={available:false,duplicates:[],checked:0};
  if(mapping.employees){
    const fields=await getTableFields(mapping.employees);
    employeeDuplicates=duplicateReport(
      await listRecords(mapping.employees),
      [fieldByAlias(fields,'EmployeeID')?.field_name]
    );
  }

  const checks=[
    {name:'Canonical tables',ok:tables.every(t=>t.status==='OK'),details:tables},
    {name:'PayrollRuns persistence schema',ok:runSchema.ready,details:runSchema},
    {name:'PayrollAudit persistence schema',ok:auditSchema.ready,details:auditSchema},
    {name:'Payroll duplicate guard',ok:payrollDuplicates.available&&payrollDuplicates.duplicates.length===0,details:payrollDuplicates},
    {name:'EmployeeID duplicate guard',ok:employeeDuplicates.available&&employeeDuplicates.duplicates.length===0,details:employeeDuplicates}
  ];

  return {
    mode:'READ_ONLY',
    generatedAt:new Date().toISOString(),
    checks,
    ready:checks.every(c=>c.ok),
    writeEnabled:process.env.ENABLE_PAYROLL_WRITE==='true',
    policy:'This audit only reads Feishu. It never creates, updates, deletes, approves, locks, or commits payroll records.'
  };
}
