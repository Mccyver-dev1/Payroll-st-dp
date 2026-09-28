const n=v=>Number(v??0)||0;

export function validatePayrollInputs(rows,month=''){
  const errors=[],warnings=[],seen=new Set();
  for(const r of rows||[]){
    const id=String(r.employeeId||'').trim();
    if(!id){errors.push('Missing EmployeeID');continue;}
    if(seen.has(id)) warnings.push(`${id}: duplicate payroll result row`);
    seen.add(id);
    if(month && String(r.payrollMonth)!==month) errors.push(`${id}: payroll month mismatch`);
    if(!Number.isFinite(n(r.baseSalary)) || r.baseSalary<0) errors.push(`${id}: invalid BaseSalary`);
    if(!Number.isFinite(n(r.otHours)) || r.otHours<0) errors.push(`${id}: invalid OT_Hours`);
    if(!Number.isFinite(n(r.gross)) || r.gross<0) errors.push(`${id}: invalid Gross`);
    if(!Number.isFinite(n(r.socialSecurity)) || r.socialSecurity<0) errors.push(`${id}: invalid SocialSecurity`);
    if(!Number.isFinite(n(r.deductions)) || r.deductions<0) errors.push(`${id}: invalid Deductions`);
    if(r.taxStatus!=='NOT_CONFIGURED') warnings.push(`${id}: TaxStatus is not NOT_CONFIGURED; review tax engine ownership`);
  }
  return {ok:errors.length===0,errors,warnings,employeeCount:seen.size,month};
}
