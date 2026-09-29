import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 8787),
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  appToken: process.env.FEISHU_APP_TOKEN || '',
  payroll: {
    otDivisor: Number(process.env.OT_DIVISOR || 240),
    otMultiplier: Number(process.env.OT_MULTIPLIER || 1.5),
    ssoRate: Number(process.env.SSO_RATE || 0.05),
    ssoWageCap: Number(process.env.SSO_WAGE_CAP || 17500),
    ssoMinimumWageBase: Number(process.env.SSO_MINIMUM_WAGE_BASE || 1650),

    // KPI / Commission eligibility
    kpiRequiredWorkDays: Number(process.env.KPI_REQUIRED_WORK_DAYS || 30),

    // Employee Welfare Fund (EWFund)
    // Officially announced rates: 0.25% from 2026-10-01 through 2031-09-30,
    // then 0.50% from 2031-10-01. Eligibility/coverage is kept as a payroll rule.
    welfareFundStartMonth: process.env.WELFARE_FUND_START_MONTH || '2026-10',
    welfareFundSecondRateMonth: process.env.WELFARE_FUND_SECOND_RATE_MONTH || '2031-10',
    welfareFundFirstRate: Number(process.env.WELFARE_FUND_FIRST_RATE || 0.0025),
    welfareFundSecondRate: Number(process.env.WELFARE_FUND_SECOND_RATE || 0.005),
    welfareFundWageBase: process.env.WELFARE_FUND_WAGE_BASE || 'BASE_SALARY',

    // Payroll-group mapping. Keep these as configuration so company names can
    // change without changing payroll calculation code.
    starliveCompanyHints: (process.env.STARLIVE_COMPANY_HINTS ||
      'starlive,star live,thaiteli').split(',').map(s => s.trim()).filter(Boolean),
    iamdpCompanyHints: (process.env.IAMDP_COMPANY_HINTS ||
      'iamdp,flying fish,frying fish').split(',').map(s => s.trim()).filter(Boolean)
  },
  tables: {
    companies: process.env.FEISHU_TABLE_COMPANIES || '',
    departments: process.env.FEISHU_TABLE_DEPARTMENTS || '',
    positions: process.env.FEISHU_TABLE_POSITIONS || '',
    employees: process.env.FEISHU_TABLE_EMPLOYEES || '',
    attendanceSummary: process.env.FEISHU_TABLE_ATTENDANCE_SUMMARY || '',
    payroll: process.env.FEISHU_TABLE_PAYROLL || '',
    payrollItems: process.env.FEISHU_TABLE_PAYROLL_ITEMS || '',
    payslips: process.env.FEISHU_TABLE_PAYSLIPS || ''
  }
};

export function assertFeishuConfig() {
  const missing = ['appId', 'appSecret', 'appToken'].filter(k => !config[k]);
  if (missing.length) {
    throw new Error(`Missing Feishu configuration: ${missing.join(', ')}`);
  }
}
