import XLSX from 'xlsx';

const STARLIVE_HEADERS=['Status','EmployeeID','Name','Nickname','Department','Position','Company','PayrollGroup','JoinDate','PerformanceMonth','PayrollMonth','WorkDays','LeaveDays','AbsentDays','LateMinutes','BaseSalary','Allowances','Bonus','OnlineCommission','OfflineCommission','Commission','FixedKPI','VariableKPI','KPI','OT_Hours','OTPay','GrossPay','Tax','SocialSecurity','EmployeeWelfareFund','OtherDeduction','TotalDeduction','NetPay','EmployerWelfareFund','KPIEligible','CommissionEligible','EligibilityStatus','EligibilityReason','BankAccount'];
const IAMDP_HEADERS=['Status','EmployeeID','Name','Company','PayrollGroup','Position','PerformanceMonth','PayrollMonth','PerformanceWorkDays','KPIEligible','CommissionEligible','FixedKPI','VariableKPI','KPI','OnlineCommission','OfflineCommission','Commission','TotalKPICommission'];
const full=r=>[r.status||'',r.employeeId||'',r.name||'',r.nickname||'',r.department||'',r.position||'',r.company||'',r.payrollGroup||'',r.joinDate||'',r.performanceMonth||'',r.payrollMonth||'',r.workDays??0,r.leaveDays??0,r.absentDays??0,r.lateMinutes??0,r.baseSalary??0,r.allowances??0,r.bonus??0,r.onlineCommission??0,r.offlineCommission??0,r.commission??0,r.fixedKpi??0,r.variableKpi??0,r.kpi??0,r.otHours??0,r.otPay??0,r.gross??0,r.tax??0,r.socialSecurity??0,r.employeeWelfareFund??0,r.otherDeduction??0,r.totalDeduction??0,r.net??0,r.employerWelfareFund??0,r.kpiEligible?'YES':'NO',r.commissionEligible?'YES':'NO',r.eligibilityStatus||'',r.eligibilityReason||'',r.bankAccount||''];
const iamdp=r=>[r.status||'',r.employeeId||'',r.name||'',r.company||'',r.payrollGroup||'',r.position||'',r.performanceMonth||'',r.payrollMonth||'',r.performanceWorkDays??0,r.kpiEligible?'YES':'NO',r.commissionEligible?'YES':'NO',r.fixedKpi??0,r.variableKpi??0,r.kpi??0,r.onlineCommission??0,r.offlineCommission??0,r.commission??0,(Number(r.kpi)||0)+(Number(r.commission)||0)];
export function buildPayrollWorkbook(rows,group=''){
 const selected=group?rows.filter(r=>r.payrollGroup===group):rows;
 const headers=group==='IAMDP'?IAMDP_HEADERS:STARLIVE_HEADERS;
 const mapper=group==='IAMDP'?iamdp:full;
 const ws=XLSX.utils.aoa_to_sheet([headers,...selected.map(mapper)]);
 ws['!freeze']={xSplit:0,ySplit:1}; ws['!autofilter']={ref:`A1:${XLSX.utils.encode_col(headers.length-1)}${Math.max(1,selected.length+1)}`};
 const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,group||'Payroll');
 const summary=group==='IAMDP'?[['PayrollGroup',group||'ALL'],['Employees',selected.length],['KPI',selected.reduce((s,r)=>s+Number(r.kpi||0),0)],['Commission',selected.reduce((s,r)=>s+Number(r.commission||0),0)],['TotalKPICommission',selected.reduce((s,r)=>s+Number(r.kpi||0)+Number(r.commission||0),0)]]:[['PayrollGroup',group||'ALL'],['Employees',selected.length],['GrossPay',selected.reduce((s,r)=>s+Number(r.gross||0),0)],['Tax',selected.reduce((s,r)=>s+Number(r.tax||0),0)],['SocialSecurity',selected.reduce((s,r)=>s+Number(r.socialSecurity||0),0)],['EmployeeWelfareFund',selected.reduce((s,r)=>s+Number(r.employeeWelfareFund||0),0)],['EmployerWelfareFund',selected.reduce((s,r)=>s+Number(r.employerWelfareFund||0),0)],['TotalDeduction',selected.reduce((s,r)=>s+Number(r.totalDeduction||0),0)],['NetPay',selected.reduce((s,r)=>s+Number(r.net||0),0)]];
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(summary),'Summary');
 return XLSX.write(wb,{type:'buffer',bookType:'xlsx'});
}
export {STARLIVE_HEADERS,IAMDP_HEADERS};
