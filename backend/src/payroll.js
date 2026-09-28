import { config } from './config.js';

const n=v=>Number(v??0)||0;
const pick=(fields,...names)=>{for(const name of names){if(fields?.[name]!==undefined&&fields?.[name]!==null&&fields?.[name]!=='')return fields[name]}return 0};
const text=(fields,...names)=>{for(const name of names){if(fields?.[name]!==undefined&&fields?.[name]!==null)return String(fields[name])}return ''};

export function normalizeEmployees(records){
 return records.map(r=>{const f=r.fields||{};return{
   recordId:r.record_id||r.id,
   employeeId:text(f,'EmployeeID','Employee ID','Emp ID','รหัสพนักงาน'),
   name:text(f,'Name','Employee Name','ชื่อ-นามสกุล','ชื่อพนักงาน'),
   company:text(f,'Company','Company Name','บริษัท'),
   department:text(f,'Department','Dept','แผนก'),
   position:text(f,'Position','Job Position','ตำแหน่ง'),
   salary:n(pick(f,'Salary','Base Salary','เงินเดือน','เงินเดือนพื้นฐาน')),
   openId:text(f,'OpenID','open_id','Feishu Open ID')
 }});}

export function normalizeCompanies(records){
 return records.map(r=>{const f=r.fields||{};return{recordId:r.record_id||r.id,companyId:text(f,'CompanyID','Company ID','รหัสบริษัท'),name:text(f,'Name','Company Name','ชื่อบริษัท'),taxId:text(f,'TaxID','Tax ID','เลขประจำตัวผู้เสียภาษี')}})
}

export function normalizeAttendance(records){
 return records.map(r=>{const f=r.fields||{};return{recordId:r.record_id||r.id,employeeId:text(f,'EmployeeID','Employee ID','Emp ID'),month:text(f,'PayrollMonth','Month','เดือน'),workDays:n(pick(f,'WorkDays','Working Days','วันทำงาน')),otHours:n(pick(f,'OT_Hours','OT Hours','OT'))}})
}

export function normalizePayrollItems(records){
 return records.map(r=>{const f=r.fields||{};return{
   recordId:r.record_id||r.id,
   payrollId:text(f,'PayrollID','Payroll ID'),
   employeeId:text(f,'EmployeeID','Employee ID','Emp ID'),
   allowances:n(pick(f,'Allowances','Allowance','เบี้ยเลี้ยง')),
   bonus:n(pick(f,'Bonus','โบนัส')),
   commission:n(pick(f,'Commission','คอมมิชชั่น')),
   kpi:n(pick(f,'KPI','KPI Pay','ค่าผลงาน')),
   deductions:n(pick(f,'Deduction','Deductions','หักอื่นๆ'))
 }});}

export function calculateSocialSecurity(wageBase){
 const base=Math.min(
   Math.max(n(wageBase),config.payroll.ssoMinimumWageBase),
   config.payroll.ssoWageCap
 );
 return Math.round(base*config.payroll.ssoRate);
}

export function calculateOTPay(salary,otHours){
 return n(otHours)*(n(salary)/config.payroll.otDivisor)*config.payroll.otMultiplier;
}

export function calculatePayroll(employees,attendance=[],items=[],month){
 const att=new Map(attendance.filter(x=>!month||String(x.month).startsWith(month)).map(x=>[x.employeeId,x]));
 const itemMap=new Map(items.map(x=>[x.employeeId,x]));
 return employees.map(e=>{
   const a=att.get(e.employeeId)||{otHours:0};
   const i=itemMap.get(e.employeeId)||{};
   const otPay=calculateOTPay(e.salary,a.otHours);
   const allowances=n(i.allowances)+n(i.bonus)+n(i.commission)+n(i.kpi);
   const deductions=n(i.deductions);
   const gross=e.salary+otPay+allowances;
   const sso=calculateSocialSecurity(gross);
   return {
     employeeId:e.employeeId,name:e.name,company:e.company,
     baseSalary:e.salary,otHours:a.otHours,otPay,allowances,deductions,
     gross,sso,tax:0,netBeforeTax:gross-sso-deductions,
     taxStatus:'NOT_CONFIGURED',net:gross-sso-deductions
   };
 });
}
