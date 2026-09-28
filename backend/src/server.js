import express from 'express';
import cors from 'cors';
import {config} from './config.js';
import {listTables,getTableFields,listRecords,resolveTables,normalizeRecord} from './feishu.js';
import {buildAudit} from './audit.js';
import {buildSchemaAudit} from './schema-audit.js';
import {buildPayrollAudit} from './payroll-audit.js';
import {normalizeEmployees,normalizeAttendance,normalizePayrollItems} from './payroll.js';
import {calculatePayrollRun,validatePayrollRun,runEngineSelfTest} from './payroll-engine.js';
import {buildTaxDataContract} from './tax-data-contract.js';
import {validatePayrollInputs} from './payroll-validation.js';
import {preparePayrollTransaction,commitPayrollTransaction} from './payroll-transaction.js';
import {login,requireSession,logout,authStatus} from './auth.js';
import {originGuard,rateLimitLogin} from './security.js';
import {prepareRun,approveRun,lockRun,commitGuard,getRun,markCommitted,auditEvent,appendPersistentAudit,auditPersistenceReadiness} from './payroll-control.js';

const app=express();
const allowedOrigin=config.frontendOrigin==='*'?true:config.frontendOrigin;
app.use(cors({origin:allowedOrigin,credentials:true}));
app.use(express.json({limit:'2mb'}));
app.use(originGuard);

app.get('/api/health',(_req,res)=>res.json({ok:true,service:'mac-feishu-payroll',version:'step-11-persistent-run-audit',timestamp:new Date().toISOString()}));
app.post('/api/auth/login',rateLimitLogin,(req,res)=>{try{return login(req,res);}catch(e){return res.status(500).json({ok:false,error:e.message});}});
app.post('/api/auth/logout',logout);
app.get('/api/auth/status',authStatus);

async function loadBase(){
 const mapping=await resolveTables(),schemas={},records={};
 for(const key of ['companies','departments','positions','employees','attendanceSummary','payroll','payrollItems','payslips']){
  const tableId=mapping[key];if(!tableId){schemas[key]={fields:[]};records[key]=[];continue;}
  schemas[key]={table_id:tableId,fields:await getTableFields(tableId)};records[key]=await listRecords(tableId);
 }
 return {mapping,schemas,records};
}

app.get('/api/production-readiness',requireSession,async(_req,res)=>{
 try{
  const persistent=await auditPersistenceReadiness();
  const writeEnabled=process.env.ENABLE_PAYROLL_WRITE==='true';
  res.json({ok:true,productionWriteEnabled:writeEnabled,persistentRunAudit:persistent,readyForControlledPayroll:writeEnabled&&persistent.ready});
 }catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.get('/api/feishu/tables',requireSession,async(_req,res)=>{try{res.json({ok:true,tables:(await listTables()).map(t=>({name:t.name,table_id:t.table_id}))});}catch(e){res.status(502).json({ok:false,error:e.message});}});
app.get('/api/feishu/schema',requireSession,async(_req,res)=>{try{const mapping=await resolveTables(),schema={};for(const [key,tableId] of Object.entries(mapping)){if(key==='discoveredTables'||!tableId)continue;schema[key]={table_id:tableId,fields:await getTableFields(tableId)};}res.json({ok:true,mapping,schema});}catch(e){res.status(502).json({ok:false,error:e.message});}});
app.get('/api/sync',requireSession,async(_req,res)=>{try{const {mapping,records}=await loadBase(),data={};for(const key of ['companies','departments','positions','employees','attendanceSummary','payroll','payrollItems','payslips'])data[key]={status:mapping[key]?'OK':'NOT_FOUND',table_id:mapping[key]||null,count:(records[key]||[]).length,records:(records[key]||[]).map(normalizeRecord)};res.json({ok:true,syncedAt:new Date().toISOString(),mapping,data});}catch(e){res.status(502).json({ok:false,error:e.message});}});

app.get('/api/payroll-run/:month',requireSession,async(req,res)=>{try{res.json({ok:true,run:await getRun(req.params.month)});}catch(e){res.status(422).json({ok:false,error:e.message});}});
app.post('/api/payroll-run/:month/prepare',requireSession,async(req,res)=>{try{const out=await prepareRun(req.params.month,req.user);const ev=auditEvent({month:req.params.month,action:'RUN_PREPARED',user:req.user,details:{rowCount:out.run.rowCount,newRecordCount:out.run.newRecordCount}});await appendPersistentAudit(ev);res.json({ok:true,...out});}catch(e){res.status(422).json({ok:false,error:e.message});}});
app.post('/api/payroll-run/:month/approve',requireSession,async(req,res)=>{try{const run=await approveRun(req.params.month,req.user);await appendPersistentAudit(auditEvent({month:req.params.month,action:'RUN_APPROVED',user:req.user}));res.json({ok:true,run});}catch(e){res.status(422).json({ok:false,error:e.message});}});
app.post('/api/payroll-run/:month/lock',requireSession,async(req,res)=>{try{const run=await lockRun(req.params.month,req.user);await appendPersistentAudit(auditEvent({month:req.params.month,action:'RUN_LOCKED',user:req.user}));res.json({ok:true,run});}catch(e){res.status(422).json({ok:false,error:e.message});}});
app.get('/api/payroll-run/:month/audit',requireSession,async(req,res)=>{res.json({ok:true,message:'Audit events are persisted in Feishu Payroll Audit table. Use Feishu table or connector for historical retrieval.'});});

app.post('/api/payroll-transaction/commit',requireSession,async(req,res)=>{
 try{
  const month=String(req.body?.month||'');const run=await commitGuard(month);
  const result=await commitPayrollTransaction(req,month);
  const committed=await markCommitted(month,req.user);
  await appendPersistentAudit(auditEvent({month,action:'PAYROLL_COMMITTED',user:req.user,details:{committed:result.committed,preparedHash:run.preparedHash}}));
  res.json({ok:true,transaction:result,run:committed});
 }catch(e){const code=e.message.startsWith('Unauthorized')?401:422;res.status(code).json({ok:false,error:e.message});}
});

app.listen(config.port,()=>console.log(`Payroll backend listening on ${config.port}`));
