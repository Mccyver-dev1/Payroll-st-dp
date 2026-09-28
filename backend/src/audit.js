const CANONICAL = [
  'companies','departments','positions','employees','attendanceSummary','payroll','payrollItems','payslips'
];

const KEY_CANDIDATES = {
  companies: ['CompanyID','Company Id','Company ID','Code'],
  departments: ['DepartmentID','Department Id','Department ID','Code'],
  positions: ['PositionID','Position Id','Position ID','Code'],
  employees: ['EmployeeID','Employee Id','Employee ID','EmpID'],
  attendanceSummary: ['AttendanceSummaryID','AttendanceID','EmployeeID'],
  payroll: ['PayrollID','EmployeeID'],
  payrollItems: ['PayrollItemID','PayrollID','EmployeeID'],
  payslips: ['PayslipID','EmployeeID','PayrollID']
};

const REF_CANDIDATES = {
  attendanceSummary: [['EmployeeID','employees']],
  payroll: [['EmployeeID','employees']],
  payrollItems: [['PayrollID','payroll'],['EmployeeID','employees']],
  payslips: [['PayrollID','payroll'],['EmployeeID','employees']],
  departments: [['CompanyID','companies']],
  positions: [['DepartmentID','departments'],['CompanyID','companies']],
  employees: [['CompanyID','companies'],['DepartmentID','departments'],['PositionID','positions']]
};

function valuesFromCell(cell){
  if(cell == null) return [];
  if(Array.isArray(cell)) return cell.flatMap(valuesFromCell);
  if(typeof cell !== 'object') return [String(cell)];
  const out=[];
  for(const k of ['record_id','id','text','name','value','link_record_id']){
    if(cell[k] != null) out.push(String(cell[k]));
  }
  if(cell.text && typeof cell.text === 'object') out.push(...valuesFromCell(cell.text));
  return [...new Set(out)];
}

function fieldNames(fields){ return new Set(fields.map(f=>f.field_name).filter(Boolean)); }
function chooseField(names,candidates){ return candidates.find(x=>names.has(x)) || null; }

export function duplicateReport(tableKey, records, fields){
  const names=fieldNames(fields);
  const keyField=chooseField(names,KEY_CANDIDATES[tableKey]||[]);
  if(!keyField) return {status:'NO_KEY_FIELD',keyField:null,groups:[],duplicateCount:0};
  const groups=new Map();
  for(const r of records){
    const vals=valuesFromCell(r.fields?.[keyField]);
    const key=vals[0]?.trim();
    if(!key) continue;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(r.record_id);
  }
  const dup=[...groups.entries()].filter(([,ids])=>ids.length>1).map(([value,recordIds])=>({value,recordIds}));
  return {status:'OK',keyField,groups:dup,duplicateCount:dup.reduce((n,x)=>n+x.recordIds.length,0)};
}

export function orphanReport(sourceKey, sourceRecords, sourceFields, targetKey, targetRecords, targetFields, fieldName){
  const sourceNames=fieldNames(sourceFields);
  const targetNames=fieldNames(targetFields);
  const actualField=sourceNames.has(fieldName)?fieldName:null;
  if(!actualField) return {status:'FIELD_NOT_FOUND',fieldName};
  const targetKeyField=chooseField(targetNames,KEY_CANDIDATES[targetKey]||[]);
  if(!targetKeyField) return {status:'TARGET_KEY_NOT_FOUND',fieldName,targetKeyField:null,orphans:[]};
  const valid=new Set();
  for(const r of targetRecords) valuesFromCell(r.fields?.[targetKeyField]).forEach(v=>valid.add(v.trim()));
  const orphans=[];
  for(const r of sourceRecords){
    for(const v of valuesFromCell(r.fields?.[actualField])){
      if(v && !valid.has(v.trim())) orphans.push({record_id:r.record_id,value:v});
    }
  }
  return {status:'OK',fieldName,targetKeyField,orphanCount:orphans.length,orphans:orphans.slice(0,500)};
}

export function buildAudit({mapping, schemas, records}){
  const report={
    generatedAt:new Date().toISOString(),
    canonicalTables:CANONICAL.map(key=>({key,table_id:mapping[key]||null,status:mapping[key]?'FOUND':'NOT_FOUND',fieldCount:schemas[key]?.fields?.length||0,recordCount:records[key]?.length||0})),
    duplicates:{},
    orphans:{},
    fieldInventory:{},
    warnings:[]
  };

  for(const key of CANONICAL){
    const fields=schemas[key]?.fields||[];
    report.fieldInventory[key]=fields.map(f=>({field_id:f.field_id,field_name:f.field_name,type:f.type,property:f.property||null}));
    report.duplicates[key]=duplicateReport(key,records[key]||[],fields);
  }

  for(const [sourceKey, refs] of Object.entries(REF_CANDIDATES)){
    for(const [fieldName,targetKey] of refs){
      const item=orphanReport(sourceKey,records[sourceKey]||[],schemas[sourceKey]?.fields||[],targetKey,records[targetKey]||[],schemas[targetKey]?.fields||[],fieldName);
      report.orphans[`${sourceKey}.${fieldName}->${targetKey}`]=item;
    }
  }

  const missing=report.canonicalTables.filter(x=>x.status==='NOT_FOUND').map(x=>x.key);
  if(missing.length) report.warnings.push(`Missing canonical tables: ${missing.join(', ')}`);
  for(const [key,val] of Object.entries(report.duplicates)) if(val.duplicateCount>0) report.warnings.push(`${key}: duplicate key values detected in ${val.duplicateCount} records`);
  for(const [key,val] of Object.entries(report.orphans)) if(val.orphanCount>0) report.warnings.push(`${key}: ${val.orphanCount} orphan references detected`);
  return report;
}
