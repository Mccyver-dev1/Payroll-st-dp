import express from 'express';
import cors from 'cors';
import {config} from './config.js';
import {listTables,getTableFields,listRecords,resolveTables,normalizeRecord} from './feishu.js';
import {buildAudit} from './audit.js';
import {buildSchemaAudit} from './schema-audit.js';
import {buildPayrollAudit} from './payroll-audit.js';

const app=express();
app.use(cors({origin:config.frontendOrigin}));
app.use(express.json({limit:'2mb'}));

app.get('/api/health',(_req,res)=>res.json({ok:true,service:'mac-feishu-payroll',version:'step-4-payroll-audit',timestamp:new Date().toISOString()}));

app.get('/api/feishu/tables',async(_req,res)=>{
 try{res.json({ok:true,tables:(await listTables()).map(t=>({name:t.name,table_id:t.table_id}))});}
 catch(e){res.status(502).json({ok:false,error:e.message});}
});

async function loadBase(){
 const mapping=await resolveTables(),schemas={},records={};
 for(const key of ['companies','departments','positions','employees','attendanceSummary','payroll','payrollItems','payslips']){
  const tableId=mapping[key];
  if(!tableId){schemas[key]={fields:[]};records[key]=[];continue;}
  schemas[key]={table_id:tableId,fields:await getTableFields(tableId)};
  records[key]=await listRecords(tableId);
 }
 return {mapping,schemas,records};
}

app.get('/api/feishu/schema',async(_req,res)=>{
 try{
  const mapping=await resolveTables(),schema={};
  for(const [key,tableId] of Object.entries(mapping)){
   if(key==='discoveredTables'||!tableId)continue;
   schema[key]={table_id:tableId,fields:await getTableFields(tableId)};
  }
  res.json({ok:true,mapping,schema});
 }catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.get('/api/sync',async(_req,res)=>{
 try{
  const {mapping,records}=await loadBase(),data={};
  for(const key of ['companies','departments','positions','employees','attendanceSummary','payroll','payrollItems','payslips'])
   data[key]={status:mapping[key]?'OK':'NOT_FOUND',table_id:mapping[key]||null,count:(records[key]||[]).length,records:(records[key]||[]).map(normalizeRecord)};
  res.json({ok:true,syncedAt:new Date().toISOString(),mapping,data});
 }catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.get('/api/audit',async(_req,res)=>{
 try{res.json({ok:true,report:buildAudit(await loadBase())});}
 catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.get('/api/schema-audit',async(_req,res)=>{
 try{res.json({ok:true,report:buildSchemaAudit(await loadBase())});}
 catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.get('/api/payroll-audit',(_req,res)=>{
 try{res.json({ok:true,report:buildPayrollAudit()});}
 catch(e){res.status(500).json({ok:false,error:e.message});}
});

app.listen(config.port,()=>console.log(`Payroll backend listening on ${config.port}`));
