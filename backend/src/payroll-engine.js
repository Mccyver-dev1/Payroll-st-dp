import {config} from './config.js';
import {calculateOTPay, calculateSocialSecurity} from './payroll.js';

const n=v=>Number(v??0)||0;

function monthKey(value){
  if(value===null||value===undefined) return '';
  const s=String(value);
  const m=s.match(/^(\d{4})[-/](\d{1,2})/);
  return m ? `${m[1]}-${String(m[2]).padStart(2,'0')}` : s;
}

export function aggregateAttendance(records, month=''){
  const map=new Map();
  for(const r of records||[]){
    const key=String(r.employeeId||'').trim();
    if(!key) continue;
    if(month && monthKey(r.month)!==month) continue;
    const cur=map.get(key)||{employeeId:key,workDays:0,otHours:0,lateMinutes:0,absentDays:0,rows:0};
    cur.workDays+=n(r.workDays);
    cur.otHours+=n(r.otHours);
    cur.lateMinutes+=n(r.lateMinutes);
    cur.absentDays+=n(r.absentDays);
    cur.rows++;
    map.set(key,cur);
  }
  return map;
}

export function aggregatePayrollItems(records){
  const map=new Map();
  for(const r of records||[]){
    const key=String(r.employeeId||'').trim();
    if(!key) continue;
    const cur=map.get(key)||{employeeId:key,allowances:0,bonus:0,commission:0,kpi:0,deductions:0,rows:0};
    cur.allowances+=n(r.allowances);
    cur.bonus+=n(r.bonus);
    cur.commission+=n(r.commission);
    cur.kpi+=n(r.kpi);
    cur.deductions+=n(r.deductions);
    cur.rows++;
    map.set(key,cur);
  }
  return map;
}

export function calculatePayrollRun(employees,attendance=[],items=[],month=''){
  const att=aggregateAttendance(attendance,month);
  const itemMap=aggregatePayrollItems(items);

  return (employees||[]).map(e=>{
    const employeeId=String(e.employeeId||'').trim();
    const a=att.get(employeeId)||{otHours:0,workDays:0,lateMinutes:0,absentDays:0,rows:0};
    const i=itemMap.get(employeeId)||{allowances:0,bonus:0,commission:0,kpi:0,deductions:0,rows:0};

    const otPay=calculateOTPay(e.salary,a.otHours);
    const allowances=i.allowances+i.bonus+i.commission+i.kpi;
    const gross=n(e.salary)+otPay+allowances;
    const sso=calculateSocialSecurity(gross);
    const netBeforeTax=gross-sso-i.deductions;

    return {
      employeeId,
      name:e.name||'',
      company:e.company||'',
      department:e.department||'',
      position:e.position||'',
      payrollMonth:month,
      baseSalary:n(e.salary),
      workDays:a.workDays,
      otHours:a.otHours,
      otPay,
      allowances:i.allowances,
      bonus:i.bonus,
      commission:i.commission,
      kpi:i.kpi,
      gross,
      socialSecurity:sso,
      deductions:i.deductions,
      tax:0,
      taxStatus:'NOT_CONFIGURED',
      netBeforeTax,
      net:netBeforeTax,
      sourceRows:{attendance:a.rows,payrollItems:i.rows}
    };
  });
}

export function validatePayrollRun(rows){
  const errors=[],warnings=[];
  for(const r of rows||[]){
    if(!r.employeeId) errors.push('Employee without EmployeeID');
    if(r.baseSalary<0) errors.push(`${r.employeeId}: negative salary`);
    if(r.otHours<0) errors.push(`${r.employeeId}: negative OT hours`);
    if(r.gross<0) errors.push(`${r.employeeId}: negative gross`);
    if(r.socialSecurity<0) errors.push(`${r.employeeId}: negative social security`);
    if(r.sourceRows.attendance>1) warnings.push(`${r.employeeId}: multiple attendance rows aggregated`);
    if(r.sourceRows.payrollItems>1) warnings.push(`${r.employeeId}: multiple payroll-item rows aggregated`);
  }
  return {ok:errors.length===0,errors,warnings};
}

export function runEngineSelfTest(){
  const employee=[{employeeId:'TEST-001',name:'Test',salary:24000}];
  const attendance=[
    {employeeId:'TEST-001',month:'2026-09',workDays:20,otHours:2},
    {employeeId:'TEST-001',month:'2026-09',workDays:4,otHours:3}
  ];
  const items=[
    {employeeId:'TEST-001',allowances:1000,bonus:500,commission:0,kpi:250,deductions:100},
    {employeeId:'TEST-001',allowances:200,bonus:0,commission:300,kpi:0,deductions:50}
  ];
  const rows=calculatePayrollRun(employee,attendance,items,'2026-09');
  const r=rows[0];
  const expectedOT=(5*(24000/240)*1.5);
  const pass=Math.abs(r.otPay-expectedOT)<0.01 &&
    r.allowances===1200 && r.bonus===500 && r.commission===300 &&
    r.kpi===250 && r.deductions===150 && r.sourceRows.attendance===2 &&
    r.sourceRows.payrollItems===2;
  return {pass,rows,expected:{otPay:expectedOT,allowances:1200,bonus:500,commission:300,kpi:250,deductions:150}};
}
