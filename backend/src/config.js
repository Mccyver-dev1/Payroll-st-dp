import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT || 8787),
  frontendOrigin: process.env.FRONTEND_ORIGIN || '*',
  appId: process.env.FEISHU_APP_ID || '',
  appSecret: process.env.FEISHU_APP_SECRET || '',
  appToken: process.env.FEISHU_APP_TOKEN || '',
  tables: {
    companies: process.env.FEISHU_TABLE_COMPANIES || '',
    departments: process.env.FEISHU_TABLE_DEPARTMENTS || '',
    employees: process.env.FEISHU_TABLE_EMPLOYEES || '',
    attendance: process.env.FEISHU_TABLE_ATTENDANCE || '',
    payroll: process.env.FEISHU_TABLE_PAYROLL || '',
    payrollItems: process.env.FEISHU_TABLE_PAYROLL_ITEMS || '',
    payslips: process.env.FEISHU_TABLE_PAYSLIPS || ''
  },
  ssoRate: Number(process.env.SSO_RATE || 0.05),
  ssoCap: Number(process.env.SSO_CAP || 750),
  otDivisor: Number(process.env.OT_DIVISOR || 240),
  otMultiplier: Number(process.env.OT_MULTIPLIER || 1.5)
};
if(!config.appId || !config.appSecret || !config.appToken) console.warn('Feishu credentials are not fully configured.');
