import XLSX from 'xlsx';
import { resolveTables, listRecords, getTableFields } from './feishu.js';
import { batchCreateRecords } from './feishu-write.js';

const norm = v => String(v ?? '').trim();
const num = v => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const s = String(v ?? '').replace(/,/g, '').trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const key = s => norm(s).toLowerCase().replace(/[\s_\-\/().:]+/g, '');
const aliases = {
  employeeId: ['employeeid','employee id','emp id','รหัสพนักงาน','工号','工號','工號id'],
  month: ['payrollmonth','month','เดือน','月份','รอบเดือน','เดือนเงินเดือน'],
  workDays: ['workdays','workingdays','work days','working days','วันทำงาน','出勤天数','出勤天數'],
  otHours: ['ot_hours','ot hours','othours','ot','โอที','ชั่วโมงot','加班小时','加班時數'],
  leaveDays: ['leavedays','leave days','วันลา','ลา','请假天数','請假天數'],
  absentDays: ['absentdays','absent days','ขาดงาน','缺勤天数','缺勤天數'],
  lateMinutes: ['lateminutes','late minutes','สาย','นาทีสาย','迟到分钟','遲到分鐘']
};
const aliasMap = Object.fromEntries(Object.entries(aliases).flatMap(([field,names]) => names.map(n => [key(n), field])));

function findHeader(headers, field){
  const exact = headers.find(h => aliasMap[key(h)] === field);
  if (exact) return exact;
  return null;
}

function firstDataSheet(workbook){
  for(const name of workbook.SheetNames){
    const sheet=workbook.Sheets[name];
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:''});
    if(rows.some(r=>r.some(v=>norm(v)))) return {name,rows};
  }
  throw new Error('The workbook contains no readable rows.');
}

function parseMonth(v, fallback){
  const s=norm(v);
  if(/^\d{4}-\d{1,2}$/.test(s)){
    const [y,m]=s.split('-'); return `${y}-${String(m).padStart(2,'0')}`;
  }
  const d = v instanceof Date ? v : new Date(v);
  if(!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  return fallback;
}

export function parseAttendanceWorkbook(buffer, fallbackMonth=''){
  const wb=XLSX.read(buffer,{type:'buffer',cellDates:true});
  const {name,rows}=firstDataSheet(wb);
  const headerIndex=rows.findIndex(r=>{
    const hs=r.map(norm);
    return hs.some(h=>aliasMap[key(h)]==='employeeId');
  });
  if(headerIndex<0) throw new Error('EmployeeID column was not found in the Excel header.');
  const headers=rows[headerIndex].map(norm);
  const cols={};
  for(const field of Object.keys(aliases)) cols[field]=findHeader(headers,field);
  const out=[];
  for(let i=headerIndex+1;i<rows.length;i++){
    const raw=rows[i];
    if(!raw.some(v=>norm(v))) continue;
    const get=f=>cols[f]===null?'' : raw[headers.indexOf(cols[f])];
    const employeeId=norm(get('employeeId'));
    if(!employeeId) continue;
    out.push({
      employeeId,
      month:parseMonth(get('month'),fallbackMonth),
      workDays:num(get('workDays')),
      otHours:num(get('otHours')),
      leaveDays:num(get('leaveDays')),
      absentDays:num(get('absentDays')),
      lateMinutes:num(get('lateMinutes')),
      sourceSheet:name,
      sourceRow:i+1
    });
  }
  return {sheet:name,headers,rows:out};
}

function fieldSet(fields){ return new Set((fields||[]).map(f=>f.field_name)); }
function pick(set,names){ return names.find(n=>set.has(n)) || null; }
function buildFields(row, fields){
  const set=fieldSet(fields); const out={};
  const put=(names,value)=>{const f=pick(set,names);if(f&&value!==undefined)out[f]=value;};
  put(['EmployeeID','Employee ID','Emp ID'],row.employeeId);
  put(['PayrollMonth','Month'],row.month);
  put(['WorkDays','Working Days'],row.workDays);
  put(['OT_Hours','OT Hours','OT'],row.otHours);
  put(['LeaveDays','Leave Days'],row.leaveDays);
  put(['AbsentDays','Absent Days'],row.absentDays);
  put(['LateMinutes','Late Minutes'],row.lateMinutes);
  return out;
}

export async function validateAttendanceImport(rows, month){
  const mapping=await resolveTables();
  if(!mapping.attendanceSummary) throw new Error('AttendanceSummary table was not found.');
  const employees=mapping.employees?await listRecords(mapping.employees):[];
  const employeeIds=new Set(employees.map(r=>norm(r.fields?.EmployeeID || r.fields?.['Employee ID'])));
  const fields=await getTableFields(mapping.attendanceSummary);
  const errors=[]; const warnings=[]; const valid=[];
  for(const r of rows){
    if(month && r.month!==month) warnings.push(`${r.employeeId}: source month ${r.month} differs from selected ${month}`);
    if(!employeeIds.has(r.employeeId)) errors.push(`${r.employeeId}: EmployeeID not found in Feishu Employees`);
    else valid.push(r);
  }
  const required=pick(fieldSet(fields),['EmployeeID','Employee ID']);
  if(!required) errors.push('AttendanceSummary must contain EmployeeID before import.');
  return {ok:errors.length===0,errors,warnings,validCount:valid.length,fields:fields.map(f=>({field_id:f.field_id,field_name:f.field_name,type:f.type})),mapping};
}

export async function importAttendanceRows(rows, month){
  if(process.env.ENABLE_ATTENDANCE_IMPORT !== 'true') throw new Error('Attendance import is disabled. Set ENABLE_ATTENDANCE_IMPORT=true on Render to enable Feishu write.');
  const check=await validateAttendanceImport(rows,month);
  if(!check.ok) throw new Error(`Attendance import validation failed: ${check.errors.join('; ')}`);
  const payload=check.valid.map(r=>buildFields(r,check.fields));
  const created=[];
  for(let i=0;i<payload.length;i+=500){
    const part=payload.slice(i,i+500);
    const result=await batchCreateRecords(check.mapping.attendanceSummary,part);
    created.push(...(result.data?.records||[]));
  }
  return {...check,imported:created.length};
}
