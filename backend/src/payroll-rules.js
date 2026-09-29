import {config} from './config.js';

const n=v=>Number(v??0)||0;

function boolValue(v){
  if(typeof v==='boolean') return v;
  if(v===null||v===undefined||v==='') return null;
  const s=String(v).trim().toLowerCase();
  if(['true','1','yes','y','✓','✔','eligible','ได้','มี'].includes(s)) return true;
  if(['false','0','no','n','×','✕','not eligible','ไม่ได้','ไม่มี'].includes(s)) return false;
  return null;
}

function normalizeCompany(value){
  return String(value??'').trim().toLowerCase()
    .replace(/[（）()]/g,' ')
    .replace(/\s+/g,' ');
}

export function payrollGroupForCompany(company){
  const s=normalizeCompany(company);
  if(!s) return 'UNMAPPED';

  const starliveHints=config.payroll.starliveCompanyHints||[];
  const iamdpHints=config.payroll.iamdpCompanyHints||[];

  if(starliveHints.some(x=>s.includes(String(x).toLowerCase()))) return 'STARLIVE';
  if(iamdpHints.some(x=>s.includes(String(x).toLowerCase()))) return 'IAMDP';

  return 'UNMAPPED';
}

export function parseDate(value){
  if(value===null||value===undefined||value==='') return null;
  if(value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if(typeof value==='number'){
    if(value>1000000000000){
      const d=new Date(value);
      if(!Number.isNaN(d.getTime())) return d;
    }
    if(value>30000 && value<100000){
      const d=new Date(Date.UTC(1899,11,30)+value*86400000);
      if(!Number.isNaN(d.getTime())) return d;
    }
  }

  const s=String(value).trim();
  const m=s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if(m){
    const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
    if(!Number.isNaN(d.getTime())) return d;
  }

  const d=new Date(s);
  return Number.isNaN(d.getTime())?null:d;
}

export function monthKey(value){
  if(value===null||value===undefined||value==='') return '';
  const s=String(value);
  const m=s.match(/^(\d{4})[-/](\d{1,2})/);
  return m?`${m[1]}-${String(m[2]).padStart(2,'0')}`:s.slice(0,7);
}

export function previousMonth(month){
  const [y,m]=String(month).split('-').map(Number);
  if(!y||!m) throw new Error('Payroll month must be YYYY-MM.');
  const d=new Date(Date.UTC(y,m-2,1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
}

export function kpiCommissionEligibility({employee,attendance,performanceMonth,rule={}}){
  const joinDate=parseDate(employee?.joinDate);
  const joinDay=joinDate?.getDate()||null;
  const workDays=n(attendance?.workDays);

  const explicitKpi=boolValue(rule.kpiEligible ?? employee?.kpiEligible);
  const explicitCommission=boolValue(rule.commissionEligible ?? employee?.commissionEligible);

  const basicEligible=joinDay===1 && workDays>=config.payroll.kpiRequiredWorkDays;

  const kpiEligible=explicitKpi===false?false:(explicitKpi===true?basicEligible:basicEligible);
  const commissionEligible=explicitCommission===false?false:(explicitCommission===true?basicEligible:basicEligible);

  let status='NOT_ELIGIBLE';
  if(basicEligible) status='ELIGIBLE';

  return {
    performanceMonth,
    joinDay,
    workDays,
    basicEligible,
    kpiEligible,
    commissionEligible,
    status,
    reason:
      !joinDate ? 'MISSING_JOIN_DATE' :
      joinDay!==1 ? 'JOINED_AFTER_FIRST_DAY' :
      workDays<config.payroll.kpiRequiredWorkDays ? 'WORK_DAYS_BELOW_30' :
      'ELIGIBLE'
  };
}

export function welfareFundRate(payrollMonth){
  const effective=String(payrollMonth)>=config.payroll.welfareFundStartMonth;
  if(!effective) return {employeeRate:0,employerRate:0,effective:false};
  const secondPhase=String(payrollMonth)>=config.payroll.welfareFundSecondRateMonth;
  const rate=secondPhase?config.payroll.welfareFundSecondRate:config.payroll.welfareFundFirstRate;
  return {employeeRate:rate,employerRate:rate,effective:true};
}

export function calculateWelfareFund(wageBase,payrollMonth,eligible=true){
  const rate=welfareFundRate(payrollMonth);
  if(!eligible||!rate.effective) return {employee:0,employer:0,rate:0,effective:rate.effective};
  const base=Math.max(0,n(wageBase));
  return {
    employee:Math.round(base*rate.employeeRate),
    employer:Math.round(base*rate.employerRate),
    rate:rate.employeeRate,
    effective:true
  };
}

export function round2(v){
  return Math.round((n(v)+Number.EPSILON)*100)/100;
}
