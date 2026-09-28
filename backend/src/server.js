import express from 'express';
import cors from 'cors';
import {config} from './config.js';
import {listTables,getTableFields,listRecords,resolveTables,normalizeRecord} from './feishu.js';
import {commitPayrollTransaction} from './payroll-transaction.js';
import {login,requireSession,logout,authStatus} from './auth.js';
import {originGuard,rateLimitLogin} from './security.js';
import {prepareRun,approveRun,lockRun,commitGuard,getRun,markCommitted,auditEvent,appendPersistentAudit} from './payroll-control.js';
import {productionReadiness} from './production-readiness.js';
import {buildGoLiveAudit} from './go-live-audit.js';

const app=express();
const allowedOrigin=config.frontendOrigin==='*'?true:config.frontendOrigin;
app.use(cors({origin:allowedOrigin,credentials:true}));
app.use(express.json({limit:'2mb'}));
app.use(originGuard);

app.get('/api/health',(_req,res)=>res.json({ok:true,service:'mac-feishu-payroll',version:'step-13-readonly-go-live-audit',timestamp:new Date().toISOString()}));
app.post('/api/auth/login',rateLimitLogin,(req,res)=>{try{return login(req,res);}catch(e){return res.status(500).json({ok:false,error:e.message});}});
app.post('/api/auth/logout',logout);
app.get('/api/auth/status',authStatus);

app.get('/api/production-readiness',requireSession,async(_req,res)=>{
 try{res.json({ok:true,report:await productionReadiness()});}
 catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.get('/api/go-live-audit',requireSession,async(_req,res)=>{
 try{res.json({ok:true,report:await buildGoLiveAudit()});}
 catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.get('/api/feishu/tables',requireSession,async(_req,res)=>{
 try{res.json({ok:true,tables:(await listTables()).map(t=>({name:t.name,table_id:t.table_id}))});}
 catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.get('/api/feishu/schema',requireSession,async(_req,res)=>{
 try{
  const mapping=await resolveTables(),schema={};
  for(const [key,tableId] of Object.entries(mapping)){
   if(key==='discoveredTables'||!tableId)continue;
   schema[key]={table_id:tableId,fields:await getTableFields(tableId)};
  }
  res.json({ok:true,mapping,schema});
 }catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.get('/api/sync',requireSession,async(_req,res)=>{
 try{
  const mapping=await resolveTables(),data={};
  for(const key of ['companies','departments','positions','employees','attendanceSummary','payroll','payrollItems','payslips']){
   const tableId=mapping[key],records=tableId?await listRecords(tableId):[];
   data[key]={status:tableId?'OK':'NOT_FOUND',table_id:tableId||null,count:records.length,records:records.map(normalizeRecord)};
  }
  res.json({ok:true,syncedAt:new Date().toISOString(),mapping,data});
 }catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.get('/api/payroll-run/:month',requireSession,async(req,res)=>{
 try{res.json({ok:true,run:await getRun(req.params.month)});}
 catch(e){res.status(422).json({ok:false,error:e.message});}
});

app.post('/api/payroll-run/:month/prepare',requireSession,async(req,res)=>{
 try{
  const out=await prepareRun(req.params.month,req.user);
  await appendPersistentAudit(auditEvent({month:req.params.month,action:'RUN_PREPARED',user:req.user,details:{rowCount:out.run.rowCount,newRecordCount:out.run.newRecordCount}}));
  res.json({ok:true,...out});
 }catch(e){res.status(422).json({ok:false,error:e.message});}
});

app.post('/api/payroll-run/:month/approve',requireSession,async(req,res)=>{
 try{
  const run=await approveRun(req.params.month,req.user);
  await appendPersistentAudit(auditEvent({month:req.params.month,action:'RUN_APPROVED',user:req.user}));
  res.json({ok:true,run});
 }catch(e){res.status(422).json({ok:false,error:e.message});}
});

app.post('/api/payroll-run/:month/lock',requireSession,async(req,res)=>{
 try{
  const run=await lockRun(req.params.month,req.user);
  await appendPersistentAudit(auditEvent({month:req.params.month,action:'RUN_LOCKED',user:req.user}));
  res.json({ok:true,run});
 }catch(e){res.status(422).json({ok:false,error:e.message});}
});

app.post('/api/payroll-transaction/commit',requireSession,async(req,res)=>{
 try{
  const gate=await productionReadiness();
  if(!gate.ready)return res.status(409).json({ok:false,error:'Production readiness gate failed.',report:gate});
  const audit=await buildGoLiveAudit();
  if(!audit.ready)return res.status(409).json({ok:false,error:'Read-only Go-Live Audit failed.',report:audit});
  const month=String(req.body?.month||''),run=await commitGuard(month);
  const result=await commitPayrollTransaction(req,month);
  const committed=await markCommitted(month,req.user);
  await appendPersistentAudit(auditEvent({month,action:'PAYROLL_COMMITTED',user:req.user,details:{committed:result.committed,preparedHash:run.preparedHash}}));
  res.json({ok:true,transaction:result,run:committed});
 }catch(e){
  const code=e.message.startsWith('Unauthorized')?401:422;
  res.status(code).json({ok:false,error:e.message});
 }
});

app.listen(config.port,()=>console.log(`Payroll backend listening on ${config.port}`));
