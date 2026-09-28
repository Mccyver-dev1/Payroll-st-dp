import {config} from './config.js';
import {calculateOTPay,calculateSocialSecurity} from './payroll.js';

function close(a,b,eps=0.01){return Math.abs(Number(a)-Number(b))<=eps;}

export function buildPayrollAudit(){
  const cases=[
    {name:'OT zero',salary:24000,ot:0,expected:0},
    {name:'OT one hour',salary:24000,ot:1,expected:150},
    {name:'OT ten hours',salary:24000,ot:10,expected:1500}
  ];
  const otTests=cases.map(x=>{
    const actual=calculateOTPay(x.salary,x.ot);
    return {...x,actual,status:close(actual,x.expected)?'PASS':'FAIL'};
  });

  const ssoCases=[
    {name:'below minimum',wage:1000,expected:Math.round(config.payroll.ssoMinimumWageBase*config.payroll.ssoRate)},
    {name:'normal wage',wage:10000,expected:Math.round(10000*config.payroll.ssoRate)},
    {name:'above cap',wage:30000,expected:Math.round(config.payroll.ssoWageCap*config.payroll.ssoRate)}
  ];
  const ssoTests=ssoCases.map(x=>{
    const actual=calculateSocialSecurity(x.wage);
    return {...x,actual,status:close(actual,x.expected)?'PASS':'FAIL'};
  });

  return {
    generatedAt:new Date().toISOString(),
    configuration:{
      otDivisor:config.payroll.otDivisor,
      otMultiplier:config.payroll.otMultiplier,
      ssoRate:config.payroll.ssoRate,
      ssoWageCap:config.payroll.ssoWageCap,
      ssoMinimumWageBase:config.payroll.ssoMinimumWageBase
    },
    formulas:{
      ot:'OT_Hours × (Salary / OT_DIVISOR) × OT_MULTIPLIER',
      socialSecurity:'ROUND(MIN(SSO_WAGE_CAP, MAX(SSO_MINIMUM_WAGE_BASE, WageBase)) × SSO_RATE, 0)',
      gross:'BaseSalary + OTPay + Allowances + Bonus + Commission + KPI',
      netBeforeTax:'Gross - SocialSecurity - Deductions',
      tax:'NOT CONFIGURED — requires approved company tax policy/configuration'
    },
    tests:{
      ot:otTests,
      socialSecurity:ssoTests,
      allPassed:[...otTests,...ssoTests].every(x=>x.status==='PASS')
    },
    warnings:[
      'Tax calculation is intentionally disabled in this step. Do not use this engine as a production Thai income-tax calculator until the company-approved tax rules and required employee tax data are configured.',
      'The social-security minimum/cap/rate are configurable environment values; verify the values against the payroll period before production use.'
    ]
  };
}
