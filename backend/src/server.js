import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import {config} from './config.js';
import {listTables,listRecords,resolveTables,sendTextMessage} from './feishu.js';
import {normalizeEmployees,normalizeCompanies,normalizeAttendance,calculatePayroll} from './payroll.js';

const app=express();
app.use(helmet({crossOriginResourcePolicy:false}));
app.use(cors({origin:config.frontendOrigin==='*'?true:config.frontendOrigin}));
app.use(express.json({limit:'1mb'}));

app.get('/api/health',(req,res)=>res.json({ok:true,service:'mac-feishu-payroll',time:new Date().toISOString()}));

app.get('/api/feishu/tables',async(req,res)=>{try{res.json({ok:true,data:await resolveTables()})}catch(e){res.status(502).json({ok:false,message:e.message})}});

app.get('/api/payroll/sync',async(req,res)=>{
 try{
  const ids=await resolveTables();
  const [companies,employees,attendance,payrollItems]=await Promise.all([
   ids.companies?listRecords(ids.companies):[],ids.employees?listRecords(ids.employees):[],
   ids.attendance?listRecords(ids.attendance):[],ids.payrollItems?listRecords(ids.payrollItems):[]
  ]);
  res.json({ok:true,data:{companies:normalizeCompanies(companies),employees:normalizeEmployees(employees),attendance:normalizeAttendance(attendance),payrollItems}});
 }catch(e){res.status(502).json({ok:false,message:e.message})}
});

app.post('/api/payroll/calculate',async(req,res)=>{
 try{
  const month=req.body?.month||new Date().toISOString().slice(0,7),ids=await resolveTables();
  const [employees,attendance,payrollItems]=await Promise.all([
   ids.employees?listRecords(ids.employees):[],ids.attendance?listRecords(ids.attendance):[],ids.payrollItems?listRecords(ids.payrollItems):[]
  ]);
  const data=calculatePayroll(normalizeEmployees(employees),normalizeAttendance(attendance),payrollItems.map(r=>({employeeId:String(r.fields?.EmployeeID||r.fields?.['Employee ID']||''),...r.fields})),month);
  res.json({ok:true,data:{month,payroll:data}});
 }catch(e){res.status(502).json({ok:false,message:e.message})}
});

app.post('/api/payslips/send',async(req,res)=>{
 try{
  const ids=await resolveTables();
  if(!ids.employees)throw new Error('Employees table not found');
  const records=await listRecords(ids.employees);
  const emp=normalizeEmployees(records).find(x=>x.employeeId===String(req.body?.employeeId||''));
  if(!emp)throw new Error('Employee not found');
  if(!emp.openId)throw new Error('Employee has no Feishu Open ID');
  await sendTextMessage(emp.openId,`Payroll Payslip\nEmployee: ${emp.name}\nEmployee ID: ${emp.employeeId}\nPlease open the Payroll Web App to view the confidential payslip.`);
  res.json({ok:true});
 }catch(e){res.status(502).json({ok:false,message:e.message})}
});

app.listen(config.port,()=>console.log(`Payroll backend listening on ${config.port}`));
