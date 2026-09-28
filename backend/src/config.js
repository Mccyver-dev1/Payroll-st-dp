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
    positions: process.env.FEISHU_TABLE_POSITIONS || '',
    employees: process.env.FEISHU_TABLE_EMPLOYEES || '',
    attendanceSummary: process.env.FEISHU_TABLE_ATTENDANCE_SUMMARY || '',
    payroll: process.env.FEISHU_TABLE_PAYROLL || '',
    payrollItems: process.env.FEISHU_TABLE_PAYROLL_ITEMS || '',
    payslips: process.env.FEISHU_TABLE_PAYSLIPS || ''
  }
};

export function assertFeishuConfig() {
  const missing = ['appId','appSecret','appToken'].filter(k => !config[k]);
  if (missing.length) throw new Error(`Missing Feishu configuration: ${missing.join(', ')}`);
}
