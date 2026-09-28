import crypto from 'node:crypto';
import {config} from './config.js';
import {listRecords,getTableFields,resolveTables} from './feishu.js';
import {createRecord,updateRecord} from './feishu-write.js';
import {preparePayrollTransaction} from './payroll-transaction.js';

const memory = new Map();

function key(month){return String(month||'').trim();}
function hashRows(rows){return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');}

function allowedStatuses(){return ['DRAFT','VALIDATED','APPROVED','LOCKED','COMMITTED'];}

function findField(fields,names){
  const wanted=new Set(names);
  return (fields||[]).find(f=>wanted.has(f.field_name))?.field_name||null;
}
function valueText(v){
  if(Array.isArray(v)) return v.map(x=>x?.text||x?.name||x?.id||'').join(', ');
  if(v&&typeof v==='object') return v.text||v.name||v.id||'';
  return v??'';
}

async function controlTable(){
  const mapping=await resolveTables();
  const configured=process.env.FEISHU_TABLE_PAYROLL_RUNS||'';
  return configured || mapping.payrollRuns || null;
}

export async function getRun(month){
  const k=key(month);
  if(!k) throw new Error('Payroll month is required.');
  const tableId=await controlTable();
  if(tableId){
    const fields=await getTableFields(tableId);
    const rows=await listRecords(tableId);
    const mf=findField(fields,['PayrollMonth','Month']);
    if(mf){
      const row=rows.find(r=>String(valueText(r.fields?.[mf])).slice(0,7)===k);
      if(row){
        const sf=findField(fields,['Status','RunStatus']);
        const hf=findField(fields,['PreparedHash','Hash']);
        return {
          source:'FEISHU',
          tableId,
          recordId:row.record_id,
          month:k,
          status:String(valueText(row.fields?.[sf])||'DRAFT'),
          preparedHash:String(valueText(row.fields?.[hf])||''),
          fields:row.fields
        };
      }
    }
  }
  return memory.get(k)||{source:'SERVER','month':k,status:'DRAFT',preparedHash:'',createdAt:null};
}

export async function prepareRun(month,user){
  const k=key(month);
  const current=await getRun(k);
  if(['LOCKED','COMMITTED'].includes(current.status))
    throw new Error(`Payroll run ${k} is ${current.status} and cannot be prepared again.`);
  const tx=await preparePayrollTransaction(k);
  const preparedHash=hashRows(tx.rows);
  const next={...current,month:k,status:'VALIDATED',preparedHash,preparedBy:user?.sub||'unknown',validatedAt:new Date().toISOString(),rowCount:tx.rows.length,newRecordCount:tx.candidates.length,duplicateCount:tx.duplicates.length};
  memory.set(k,next);
  return {run:next,transaction:tx};
}

export async function approveRun(month,user){
  const current=await getRun(month);
  if(current.status!=='VALIDATED') throw new Error(`Run must be VALIDATED before approval. Current status: ${current.status}.`);
  const next={...current,status:'APPROVED',approvedBy:user?.sub||'unknown',approvedAt:new Date().toISOString()};
  memory.set(key(month),next);
  return next;
}

export async function lockRun(month,user){
  const current=await getRun(month);
  if(current.status!=='APPROVED') throw new Error(`Run must be APPROVED before locking. Current status: ${current.status}.`);
  const next={...current,status:'LOCKED',lockedBy:user?.sub||'unknown',lockedAt:new Date().toISOString()};
  memory.set(key(month),next);
  return next;
}

export async function commitGuard(month){
  const current=await getRun(month);
  if(current.status!=='LOCKED') throw new Error(`Payroll commit requires LOCKED run. Current status: ${current.status}.`);
  return current;
}

export function auditEvent({month,action,user,details={}}){
  return {eventId:crypto.randomUUID(),at:new Date().toISOString(),month:key(month),action,user:user?.sub||'unknown',details};
}

export {allowedStatuses};
