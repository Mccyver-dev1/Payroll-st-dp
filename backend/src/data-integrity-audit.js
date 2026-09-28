import {resolveTables,getTableFields,listRecords} from './feishu.js';

const FIELD_ALIASES={
  EmployeeID:['EmployeeID','Employee Id','Employee ID'],
  PayrollMonth:['PayrollMonth','Month','Payroll Month'],
  Name:['Name','EmployeeName','Employee Name'],
  CompanyID:['CompanyID','Company Id','Company ID'],
  DepartmentID:['DepartmentID','Department Id','Department ID'],
  PositionID:['PositionID','Position Id','Position ID']
};

function findField(fields,logical){
  return (fields||[]).find(f=>(FIELD_ALIASES[logical]||[logical]).includes(f.field_name))?.field_name||null;
}
function value(v){
  if(Array.isArray(v))return v.map(x=>x?.text??x?.name??x?.id??'').join('|').trim();
  if(v&&typeof v==='object')return String(v.text??v.name??v.id??'').trim();
  return String(v??'').trim();
}
function key(v){return value(v).toLowerCase();}
function duplicate(rows,field){
  if(!field)return {available:false,count:rows.length,duplicates:[]};
  const map=new Map();
  for(const r of rows){const k=key(r.fields?.[field]);if(!k)continue;const a=map.get(k)||[];a.push(r.record_id);map.set(k,a);}
  return {available:true,count:rows.length,duplicates:[...map.entries()].filter(([,ids])=>ids.length>1).map(([value,recordIds])=>({value,recordIds}))};
}
function pairDuplicate(rows,ef,mf){
  if(!ef||!mf)return {available:false,count:rows.length,duplicates:[]};
  const map=new Map();
  for(const r of rows){
    const e=key(r.fields?.[ef]),m=key(r.fields?.[mf]);
    if(!e||!m)continue;
    const k=`${e}::${m}`;const a=map.get(k)||[];a.push(r.record_id);map.set(k,a);
  }
  return {available:true,count:rows.length,duplicates:[...map.entries()].filter(([,ids])=>ids.length>1).map(([value,recordIds])=>({value,recordIds}))};
}
function requiredValues(rows,fields){
  const missing=[];
  for(const r of rows){
    const rowMissing=fields.filter(f=>!value(r.fields?.[f]));
    if(rowMissing.length)missing.push({recordId:r.record_id,fields:rowMissing});
  }
  return {ok:missing.length===0,count:rows.length,missing:missing.slice(0,100),missingCount:missing.length};
}
function month(v){return key(v).slice(0,7);}

export async function buildDataIntegrityAudit(){
  const mapping=await resolveTables();
  const loaded={};
  for(const name of ['employees','attendanceSummary','payroll','payrollItems','payslips']){
    const tableId=mapping[name];
    if(!tableId){loaded[name]={tableId:null,fields:[],rows:[]};continue;}
    loaded[name]={tableId,fields:await getTableFields(tableId),rows:await listRecords(tableId)};
  }

  const ef=findField(loaded.employees.fields,'EmployeeID');
  const empName=findField(loaded.employees.fields,'Name');
  const af=findField(loaded.attendanceSummary.fields,'EmployeeID');
  const am=findField(loaded.attendanceSummary.fields,'PayrollMonth');
  const pf=findField(loaded.payroll.fields,'EmployeeID');
  const pm=findField(loaded.payroll.fields,'PayrollMonth');
  const pif=findField(loaded.payrollItems.fields,'EmployeeID');
  const pim=findField(loaded.payrollItems.fields,'PayrollMonth');
  const sf=findField(loaded.payslips.fields,'EmployeeID');
  const sm=findField(loaded.payslips.fields,'PayrollMonth');

  const employeeIds=new Set(loaded.employees.rows.map(r=>key(r.fields?.[ef])).filter(Boolean));

  const orphan=(rows,field)=>{
    if(!field)return {available:false,count:rows.length,orphans:[]};
    const out=[];
    for(const r of rows){
      const id=key(r.fields?.[field]);
      if(id&&!employeeIds.has(id))out.push({recordId:r.record_id,employeeId:value(r.fields?.[field])});
    }
    return {available:true,count:rows.length,orphans:out.slice(0,100),orphanCount:out.length};
  };

  const checks=[
    {name:'Employees required values',ok:!!ef&&requiredValues(loaded.employees.rows,[ef]).ok,details:{field:ef,...requiredValues(loaded.employees.rows,[ef])}},
    {name:'EmployeeID uniqueness',ok:!!ef&&duplicate(loaded.employees.rows,ef).duplicates.length===0,details:duplicate(loaded.employees.rows,ef)},
    {name:'AttendanceSummary EmployeeID references',ok:orphan(loaded.attendanceSummary.rows,af).available&&orphan(loaded.attendanceSummary.rows,af).orphanCount===0,details:orphan(loaded.attendanceSummary.rows,af)},
    {name:'Payroll EmployeeID references',ok:orphan(loaded.payroll.rows,pf).available&&orphan(loaded.payroll.rows,pf).orphanCount===0,details:orphan(loaded.payroll.rows,pf)},
    {name:'Payroll unique EmployeeID + PayrollMonth',ok:!!pf&&!!pm&&pairDuplicate(loaded.payroll.rows,pf,pm).duplicates.length===0,details:pairDuplicate(loaded.payroll.rows,pf,pm)},
    {name:'PayrollItems EmployeeID references',ok:orphan(loaded.payrollItems.rows,pif).available&&orphan(loaded.payrollItems.rows,pif).orphanCount===0,details:orphan(loaded.payrollItems.rows,pif)},
    {name:'Payslips EmployeeID references',ok:orphan(loaded.payslips.rows,sf).available&&orphan(loaded.payslips.rows,sf).orphanCount===0,details:orphan(loaded.payslips.rows,sf)}
  ];

  const fieldMap={employees:{EmployeeID:ef,Name:empName},attendanceSummary:{EmployeeID:af,PayrollMonth:am},payroll:{EmployeeID:pf,PayrollMonth:pm},payrollItems:{EmployeeID:pif,PayrollMonth:pim},payslips:{EmployeeID:sf,PayrollMonth:sm}};
  return {
    mode:'READ_ONLY',
    generatedAt:new Date().toISOString(),
    tableCounts:Object.fromEntries(Object.entries(loaded).map(([k,v])=>[k,{tableId:v.tableId,count:v.rows.length,fieldCount:v.fields.length}])),
    fieldMap,
    checks,
    ready:checks.every(c=>c.ok),
    policy:'Read-only only. No create, update, delete, approval, lock, or payroll commit is performed.'
  };
}
