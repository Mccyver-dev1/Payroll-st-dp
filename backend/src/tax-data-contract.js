const REQUIRED_EMPLOYEE_TAX_FIELDS = [
  ['EmployeeID', ['text','number','autoNumber']],
  ['TaxID', ['text','number']],
  ['TaxStatus', ['text','singleSelect']],
  ['TaxYear', ['number','text']],
  ['WithholdingEligible', ['checkbox','text','singleSelect']],
];

const OPTIONAL_TAX_INPUTS = [
  'SpouseStatus','SpouseIncomeStatus','ChildCount','ParentCount',
  'DisabilityAllowance','InsurancePremium','ProvidentFund',
  'RetirementFund','Donation','OtherAllowance','TaxExemption',
  'PreviousEmployerIncome','PreviousEmployerTax','YTDIncome','YTDWithholding'
];

const PAYROLL_TAX_OUTPUTS = [
  ['Tax', ['number','currency']],
  ['TaxableIncome', ['number','currency']],
  ['YTDIncome', ['number','currency']],
  ['YTDWithholding', ['number','currency']]
];

function label(type){
  const map={1:'text',2:'number',3:'singleSelect',4:'multiSelect',5:'date',7:'checkbox',18:'link',19:'formula',20:'duplexLink',21:'lookup'};
  return map[type]||String(type??'unknown');
}
function idx(fields){return new Map((fields||[]).map(f=>[String(f.field_name||'').trim().toLowerCase(),f]));}
function find(fields,name){return idx(fields).get(name.toLowerCase())||null;}
function check(fields,name,allowed){
  const f=find(fields,name);
  if(!f)return {field:name,status:'MISSING',expected:allowed};
  const actual=label(f.type);
  return {field:f.field_name,status:allowed.includes(actual)?'OK':'TYPE_REVIEW',actual,expected:allowed};
}

export function buildTaxDataContract({schemas}){
  const employeeFields=schemas.employees?.fields||[];
  const payrollFields=schemas.payroll?.fields||[];
  const employeeChecks=REQUIRED_EMPLOYEE_TAX_FIELDS.map(([n,a])=>check(employeeFields,n,a));
  const payrollChecks=PAYROLL_TAX_OUTPUTS.map(([n,a])=>check(payrollFields,n,a));
  const optional=OPTIONAL_TAX_INPUTS.map(name=>({field:name,present:!!find(employeeFields,name)}));
  const missingEmployee=employeeChecks.filter(x=>x.status==='MISSING').map(x=>x.field);
  const missingPayroll=payrollChecks.filter(x=>x.status==='MISSING').map(x=>x.field);
  const typeReview=[...employeeChecks,...payrollChecks].filter(x=>x.status==='TYPE_REVIEW');

  return {
    generatedAt:new Date().toISOString(),
    purpose:'Tax-data contract and readiness only. No tax amount is calculated here.',
    employee:{
      required:employeeChecks,
      missing:missingEmployee,
      optional:optional
    },
    payroll:{
      requiredOutputs:payrollChecks,
      missing:missingPayroll
    },
    status:{
      readyForTaxEngine:missingEmployee.length===0 && missingPayroll.length===0 && typeReview.length===0,
      missingCount:missingEmployee.length+missingPayroll.length,
      typeReviewCount:typeReview.length
    },
    rulesToConfirmBeforeTaxEngine:[
      'Payroll tax year and payroll period must be explicit.',
      'Employee tax identity/status data must be available before production withholding.',
      'Year-to-date income and withholding must be tracked if the company requires cumulative withholding.',
      'Allowances/deductions must have a documented source and approval status.',
      'The tax engine must be versioned by effective date and must not silently change historical payroll.'
    ]
  };
}
