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

export function calculatePayroll(employees,attendance=[],items=[],month){
 const att=new Map(attendance.filter(x=>!month||String(x.month).startsWith(month)).map(x=>[x.employeeId,x]));
 const itemMap=new Map(items.map(x=>[x.employeeId,x]));
 return employees.map(e=>{
   const a=att.get(e.employeeId)||{otHours:0};
   const i=itemMap.get(e.employeeId)||{};
   const otPay=n(a.otHours)*(e.salary/config.otDivisor)*config.otMultiplier;
   const allowances=n(i.allowances)+n(i.bonus)+n(i.commission)+n(i.kpi);
   const deductions=n(i.deductions);
   const gross=e.salary+otPay+allowances;
   const sso=Math.min(gross*config.ssoRate,config.ssoCap);
   const taxable=Math.max(0,gross-sso-deductions);
   const tax=estimateMonthlyTax(taxable);
   const net=gross-sso-tax-deductions;
   return {employeeId:e.employeeId,name:e.name,company:e.company,baseSalary:e.salary,otHours:a.otHours,otPay,allowances,deductions,gross,sso,tax,net};
 })
}

export function estimateMonthlyTax(monthly){
 // Conservative placeholder progressive estimate. Replace with the approved company tax policy before production payroll.
 const annual=monthly*12;
 let annualTax=0;
 const bands=[[150000,0],[150000,.05],[200000,.10],[250000,.15],[500000,.20],[1000000,.25],[2000000,.30],[Infinity,.35]];
 let prev=0;
 for(const [limit,rate] of bands){const taxable=Math.max(0,Math.min(annual,limit)-prev);annualTax+=taxable*rate;prev=limit;if(annual<=limit)break}
 return annualTax/12;
}
