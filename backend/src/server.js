import express from 'express';
import cors from 'cors';
import {config} from './config.js';
import {listTables,getTableFields,listRecords,resolveTables,normalizeRecord} from './feishu.js';

const app = express();
app.use(cors({origin:config.frontendOrigin}));
app.use(express.json());

app.get('/api/health',(_req,res)=>res.json({ok:true,service:'mac-feishu-payroll',timestamp:new Date().toISOString()}));

app.get('/api/feishu/tables',async(_req,res)=>{
  try { res.json({ok:true,tables:(await listTables()).map(t=>({name:t.name,table_id:t.table_id}))}); }
  catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.get('/api/feishu/schema',async(_req,res)=>{
  try {
    const mapping=await resolveTables(), schema={};
    for(const [key,tableId] of Object.entries(mapping)){
      if(key==='discoveredTables'||!tableId) continue;
      schema[key]={table_id:tableId,fields:await getTableFields(tableId)};
    }
    res.json({ok:true,mapping,schema});
  } catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.get('/api/sync',async(_req,res)=>{
  try {
    const mapping=await resolveTables(), data={};
    for(const key of ['companies','departments','positions','employees','attendanceSummary','payroll','payrollItems','payslips']){
      const tableId=mapping[key];
      if(!tableId){data[key]={status:'NOT_FOUND',count:0,records:[]};continue;}
      const records=(await listRecords(tableId)).map(normalizeRecord);
      data[key]={status:'OK',table_id:tableId,count:records.length,records};
    }
    res.json({ok:true,syncedAt:new Date().toISOString(),mapping,data});
  } catch(e){res.status(502).json({ok:false,error:e.message});}
});

app.listen(config.port,()=>console.log(`Payroll backend listening on ${config.port}`));
