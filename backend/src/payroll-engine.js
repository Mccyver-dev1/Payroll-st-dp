import { config } from './config.js';
import { calculateOTPay, calculateSocialSecurity } from './payroll.js';
import { kpiCommissionEligibility, payrollGroupForCompany, previousMonth, calculateWelfareFund, monthKey, round2 } from './payroll-rules.js';

const n = v => Number(v ?? 0) || 0;

export function aggregateAttendance(records, month = '') {
  const map = new Map();
  for (const r of records || []) {
    const key = String(r.employeeId || '').trim();
    if (!key) continue;
    if (month && monthKey(r.month) !== month) continue;
    const cur = map.get(key) || { employeeId:key, workDays:0, otHours:0, lateMinutes:0, absentDays:0, leaveDays:0, rows:0 };
    cur.workDays += n(r.workDays);
    cur.otHours += n(r.otHours);
    cur.lateMinutes += n(r.lateMinutes);
    cur.absentDays += n(r.absentDays);
    cur.leaveDays += n(r.leaveDays);
    cur.rows++;
    map.set(key, cur);
  }
  return map;
}

export function aggregatePayrollItems(records, performanceMonth = '', payrollMonth = '') {
  const map = new Map();
  for (const r of records || []) {
    const key = String(r.employeeId || '').trim();
    if (!key) continue;
    const pm = monthKey(r.performanceMonth);
    const paym = monthKey(r.payrollMonth);
    if (performanceMonth && pm !== performanceMonth) continue;
    if (payrollMonth && paym && paym !== payrollMonth) continue;
    const cur = map.get(key) || {
      employeeId:key, allowances:0, bonus:0, commission:0, onlineCommission:0, offlineCommission:0,
      kpi:0, fixedKpi:0, variableKpi:0, deductions:0, tax:0,
      welfareFundEligible:null, kpiEligible:null, commissionEligible:null, rows:0
    };
    cur.allowances += n(r.allowances);
    cur.bonus += n(r.bonus);
    cur.commission += n(r.commission);
    cur.onlineCommission += n(r.onlineCommission);
    cur.offlineCommission += n(r.offlineCommission);
    cur.kpi += n(r.kpi);
    cur.fixedKpi += n(r.fixedKpi);
    cur.variableKpi += n(r.variableKpi);
    cur.deductions += n(r.deductions);
    cur.tax += n(r.tax);
    if (r.welfareFundEligible !== '' && r.welfareFundEligible !== undefined && r.welfareFundEligible !== null) cur.welfareFundEligible = r.welfareFundEligible;
    if (r.kpiEligible !== '' && r.kpiEligible !== undefined && r.kpiEligible !== null) cur.kpiEligible = r.kpiEligible;
    if (r.commissionEligible !== '' && r.commissionEligible !== undefined && r.commissionEligible !== null) cur.commissionEligible = r.commissionEligible;
    cur.rows++;
    map.set(key, cur);
  }
  return map;
}

function pickTax(items, employee) {
  if (items.tax !== 0) return items.tax;
  return n(employee?.tax);
}

function welfareBase(row) {
  return config.payroll.welfareFundWageBase === 'GROSS' ? row.gross : row.baseSalary;
}

export function calculatePayrollRun(employees, attendance = [], items = [], month = '') {
  if (!/^\d{4}-\d{2}$/.test(String(month))) throw new Error('Payroll month must be YYYY-MM.');

  const performanceMonth = previousMonth(month);
  // Attendance/OT belong to the payroll month. KPI/Commission eligibility belongs to the performance month.
  const payrollAttendance = aggregateAttendance(attendance, month);
  const performanceAttendance = aggregateAttendance(attendance, performanceMonth);
  const itemMap = aggregatePayrollItems(items, performanceMonth, month);

  return (employees || []).map(e => {
    const employeeId = String(e.employeeId || '').trim();
    const a = payrollAttendance.get(employeeId) || { employeeId, workDays:0, otHours:0, lateMinutes:0, absentDays:0, leaveDays:0, rows:0 };
    const pa = performanceAttendance.get(employeeId) || { employeeId, workDays:0, otHours:0, lateMinutes:0, absentDays:0, leaveDays:0, rows:0 };
    const i = itemMap.get(employeeId) || {
      employeeId, allowances:0, bonus:0, commission:0, onlineCommission:0, offlineCommission:0,
      kpi:0, fixedKpi:0, variableKpi:0, deductions:0, tax:0,
      welfareFundEligible:null, kpiEligible:null, commissionEligible:null, rows:0
    };

    const eligibility = kpiCommissionEligibility({
      employee:e,
      attendance:pa,
      performanceMonth,
      rule:{ kpiEligible:i.kpiEligible, commissionEligible:i.commissionEligible }
    });

    const rawCommission = i.commission + i.onlineCommission + i.offlineCommission;
    const rawKpi = i.kpi + i.fixedKpi + i.variableKpi;
    const commission = eligibility.commissionEligible ? rawCommission : 0;
    const kpi = eligibility.kpiEligible ? rawKpi : 0;
    const otPay = calculateOTPay(e.salary, a.otHours);
    const gross = n(e.salary) + i.allowances + i.bonus + commission + kpi + otPay;
    const socialSecurity = calculateSocialSecurity(gross);
    const tax = pickTax(i, e);
    const welfareEligible = i.welfareFundEligible === false || String(i.welfareFundEligible).toLowerCase() === 'false' ? false : true;
    const welfare = calculateWelfareFund(welfareBase({baseSalary:n(e.salary),gross}), month, welfareEligible);
    const totalDeduction = tax + socialSecurity + welfare.employee + n(i.deductions);
    const net = gross - totalDeduction;

    return {
      employeeId, name:e.name||'', nickname:e.nickname||'', company:e.company||'', payrollGroup:payrollGroupForCompany(e.company),
      department:e.department||'', position:e.position||'', status:e.status||'', joinDate:e.joinDate||'', bankAccount:e.bankAccount||'',
      payrollMonth:month, performanceMonth,
      baseSalary:round2(e.salary), workDays:round2(a.workDays), otHours:round2(a.otHours), leaveDays:round2(a.leaveDays),
      lateMinutes:round2(a.lateMinutes), absentDays:round2(a.absentDays),
      performanceWorkDays:round2(pa.workDays), performanceAttendanceRows:pa.rows,
      allowances:round2(i.allowances), bonus:round2(i.bonus),
      onlineCommission:round2(eligibility.commissionEligible ? i.onlineCommission : 0),
      offlineCommission:round2(eligibility.commissionEligible ? i.offlineCommission : 0),
      commission:round2(commission), fixedKpi:round2(eligibility.kpiEligible ? i.fixedKpi : 0),
      variableKpi:round2(eligibility.kpiEligible ? i.variableKpi : 0), kpi:round2(kpi), otPay:round2(otPay), gross:round2(gross),
      tax:round2(tax), socialSecurity:round2(socialSecurity), employeeWelfareFund:round2(welfare.employee),
      employerWelfareFund:round2(welfare.employer), otherDeduction:round2(i.deductions), totalDeduction:round2(totalDeduction), net:round2(net),
      kpiEligible:eligibility.kpiEligible, commissionEligible:eligibility.commissionEligible, eligibilityStatus:eligibility.status,
      eligibilityReason:eligibility.reason, welfareFundEffective:welfare.effective, welfareFundRate:welfare.rate,
      taxStatus: (i.tax !== 0 || n(e.tax) !== 0) ? 'IMPORTED' : 'NOT_PROVIDED_BY_ACCOUNTING',
      sourceRows:{attendance:a.rows, performanceAttendance:pa.rows, payrollItems:i.rows}
    };
  });
}

export function validatePayrollRun(rows) {
  const errors=[], warnings=[], seen=new Set();
  for(const r of rows||[]){
    const id=String(r.employeeId||'').trim();
    if(!id){errors.push('Employee without EmployeeID');continue;}
    if(seen.has(id)) warnings.push(`${id}: duplicate payroll result row`);
    seen.add(id);
    if(r.payrollGroup==='UNMAPPED') errors.push(`${id}: company "${r.company}" is not mapped to STARLIVE or IAMDP`);
    if(r.baseSalary<0) errors.push(`${id}: negative salary`);
    if(r.otHours<0) errors.push(`${id}: negative OT hours`);
    if(r.gross<0) errors.push(`${id}: negative gross`);
    if(r.socialSecurity<0) errors.push(`${id}: negative social security`);
    if(r.employeeWelfareFund<0) errors.push(`${id}: negative Employee Welfare Fund`);
    if(r.net<0) warnings.push(`${id}: NetPay is negative; review deductions`);
    if((r.kpiEligible||r.commissionEligible) && r.sourceRows.payrollItems===0) warnings.push(`${id}: eligible for KPI/Commission but no All KPI/PayrollItems source row was found for ${r.performanceMonth}`);
    if(r.taxStatus==='NOT_PROVIDED_BY_ACCOUNTING') warnings.push(`${id}: Tax was not provided by Accounting for ${r.payrollMonth}; system uses Tax=0 until supplied.`);
  }
  return {ok:errors.length===0,errors,warnings,employeeCount:seen.size};
}

export function runEngineSelfTest(){
  const employee=[{employeeId:'TEST-001',name:'Test',salary:24000,company:'STAR LIVE ONLINE CO., LTD.',joinDate:'2026-08-01'}];
  const attendance=[{employeeId:'TEST-001',month:'2026-08',workDays:30,otHours:2},{employeeId:'TEST-001',month:'2026-09',workDays:30,otHours:5}];
  const items=[{employeeId:'TEST-001',performanceMonth:'2026-08',payrollMonth:'2026-09',allowances:1000,bonus:500,commission:300,kpi:250,tax:123,deductions:150}];
  const rows=calculatePayrollRun(employee,attendance,items,'2026-09'); const r=rows[0];
  const expectedOT=5*(24000/240)*1.5;
  return {pass:Math.abs(r.otPay-expectedOT)<.01&&r.performanceWorkDays===30&&r.workDays===30&&r.tax===123&&r.performanceMonth==='2026-08'&&r.payrollGroup==='STARLIVE'&&r.kpiEligible&&r.commissionEligible,rows,expected:{otPay:expectedOT,tax:123}};
}
