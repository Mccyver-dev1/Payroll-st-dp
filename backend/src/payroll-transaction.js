import {config} from './config.js';
import {resolveTables,listRecords,getTableFields} from './feishu.js';
import {createRecord,batchCreateRecords} from './feishu-write.js';
import {normalizeEmployees,normalizeAttendance,normalizePayrollItems} from './payroll.js';
import {calculatePayrollRun} from './payroll-engine.js';
import {validatePayrollInputs} from './payroll-validation.js';

const REQUIRED_WRITE_ENV='PAYROLL_API_KEY';

function requireWriteAccess(req){
  if(process.env.ENABLE_PAYROLL_WRITE!=='true')
    throw new Error('Payroll write is disabled. Set ENABLE_PAYROLL_WRITE=true on the server.');
  const expected=process.env[REQUIRED_WRITE_ENV]||'';
  if(!expected) throw new Error('Payroll write is disabled because PAYROLL_API_KEY is not configured.');
  const supplied=req.headers['x-payroll-api-key']||'';
  if(supplied!==expected) throw new Error('Unauthorized payroll write request.');
}

function fieldNames(fields){
  return new Set((fields||[]).map(f=>f.field_name));
}

function pickField(fields,names){
  const set=fieldNames(fields);
  return names.find(x=>set.has(x))||null;
}

function buildPayrollFields(row,fields){
  const names=fieldNames(fields);
  const out={};
  const put=(aliases,value)=>{
    const f=pickField(fields,aliases);
    if(f && names.has(f) && value!==undefined) out[f]=value;
  };
  put(['EmployeeID','Employee ID'],row.employeeId);
  put(['PayrollMonth','Month'],row.payrollMonth);
  put(['BaseSalary','Base Salary'],row.baseSalary);
  put(['OT_Hours','OT Hours'],row.otHours);
  put(['OTPay','OT Pay'],row.otPay);
  put(['Allowances','Allowance'],row.allowances);
  put(['Bonus'],row.bonus);
  put(['Commission'],row.commission);
  put(['KPI','KPI Pay'],row.kpi);
  put(['GrossSalary','Gross','Gross Pay'],row.gross);
  put(['SocialSecurity','SSO'],row.socialSecurity);
  put(['Deduction','Deductions'],row.deductions);
  put(['Tax'],row.tax);
  put(['NetSalary','Net Pay'],row.net);
  return out;
}

function identity(row){
  return `${row.employeeId}::${row.payrollMonth}`;
}

export async function preparePayrollTransaction(month){
  if(!month) throw new Error('Payroll month is required in YYYY-MM format.');
  const mapping=await resolveTables();
  if(!mapping.payroll) throw new Error('Payroll table was not found.');
  const employees=normalizeEmployees(await listRecords(mapping.employees));
  const attendance=normalizeAttendance(await listRecords(mapping.attendanceSummary));
  const items=normalizePayrollItems(await listRecords(mapping.payrollItems));
  const rows=calculatePayrollRun(employees,attendance,items,month);
  const validation=validatePayrollInputs(rows,month);
  if(!validation.ok) throw new Error(`Payroll validation failed: ${validation.errors.join('; ')}`);

  const payrollFields=await getTableFields(mapping.payroll);
  const existing=await listRecords(mapping.payroll);
  const employeeField=pickField(payrollFields,['EmployeeID','Employee ID']);
  const monthField=pickField(payrollFields,['PayrollMonth','Month']);
  if(!employeeField || !monthField)
    throw new Error('Payroll table must contain EmployeeID and PayrollMonth before production write is enabled.');

  const existingKeys=new Set();
  for(const r of existing){
    const ef=r.fields?.[employeeField];
    const mf=r.fields?.[monthField];
    const e=Array.isArray(ef)?ef[0]?.text||ef[0]?.name||ef[0]?.id||'':String(ef??'');
    const m=Array.isArray(mf)?mf[0]?.text||mf[0]?.name||mf[0]?.id||'':String(mf??'');
    existingKeys.add(`${e}::${String(m).slice(0,7)}`);
  }

  const candidates=rows.filter(r=>!existingKeys.has(identity(r)));
  const duplicates=rows.filter(r=>existingKeys.has(identity(r))).map(r=>r.employeeId);

  return {
    month,
    mapping,
    rows,
    candidates,
    duplicates,
    validation,
    payrollFields:payrollFields.map(f=>({field_id:f.field_id,field_name:f.field_name,type:f.type})),
    fieldMap:candidates.map(r=>({employeeId:r.employeeId,fields:buildPayrollFields(r,payrollFields)}))
  };
}

export async function commitPayrollTransaction(req,month){
  requireWriteAccess(req);
  const prepared=await preparePayrollTransaction(month);
  if(!prepared.candidates.length)
    return {...prepared,committed:0,created:[],message:'No new Payroll records to create. Existing employee/month keys were preserved.'};

  const payload=prepared.candidates.map(r=>buildPayrollFields(r,prepared.payrollFields));
  const result=await batchCreateRecords(prepared.mapping.payroll,payload);
  return {...prepared,committed:payload.length,created:result.data?.records||[],message:'Payroll records created in Feishu.'};
}
