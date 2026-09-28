import crypto from 'node:crypto';
import {preparePayrollTransaction} from './payroll-transaction.js';
import {getPersistentRun,upsertPersistentRun,validatePersistentRunSchema,validatePersistentAuditSchema,appendPersistentAudit} from './payroll-run-persistence.js';

function key(month){return String(month||'').trim();}
function hashRows(rows){return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');}

export async function getRun(month){
  const k=key(month);
  if(!k) throw new Error('Payroll month is required.');
  const run=await getPersistentRun(k);
  if(run) return {...run,source:'FEISHU'};
  return {source:'FEISHU',month:k,status:'DRAFT',preparedHash:'',createdAt:null};
}

async function persist(run){return upsertPersistentRun({...run,updatedAt:new Date().toISOString()});}

export async function prepareRun(month,user){
  const k=key(month),current=await getRun(k);
  if(['LOCKED','COMMITTED'].includes(current.status)) throw new Error(`Payroll run ${k} is ${current.status} and cannot be prepared again.`);
  const tx=await preparePayrollTransaction(k);
  const preparedHash=hashRows(tx.rows);
  const next={...current,runId:`PAYROLL-${k}`,month:k,status:'VALIDATED',preparedHash,preparedBy:user?.sub||'unknown',validatedAt:new Date().toISOString(),rowCount:tx.rows.length,newRecordCount:tx.candidates.length,duplicateCount:tx.duplicates.length};
  await persist(next);
  return {run:next,transaction:tx};
}

export async function approveRun(month,user){
  const current=await getRun(month);
  if(current.status!=='VALIDATED') throw new Error(`Run must be VALIDATED before approval. Current status: ${current.status}.`);
  const next={...current,status:'APPROVED',approvedBy:user?.sub||'unknown',approvedAt:new Date().toISOString()};
  await persist(next); return next;
}

export async function lockRun(month,user){
  const current=await getRun(month);
  if(current.status!=='APPROVED') throw new Error(`Run must be APPROVED before locking. Current status: ${current.status}.`);
  const next={...current,status:'LOCKED',lockedBy:user?.sub||'unknown',lockedAt:new Date().toISOString()};
  await persist(next); return next;
}

export async function commitGuard(month){
  const current=await getRun(month);
  if(current.status!=='LOCKED') throw new Error(`Payroll commit requires LOCKED run. Current status: ${current.status}.`);
  return current;
}

export async function markCommitted(month,user){
  const current=await getRun(month);
  if(current.status!=='LOCKED') throw new Error(`Only LOCKED payroll runs can be marked COMMITTED. Current status: ${current.status}.`);
  const next={...current,status:'COMMITTED',committedAt:new Date().toISOString(),committedBy:user?.sub||'unknown'};
  await persist(next); return next;
}

export function auditEvent({month,action,user,details={}}){
  return {eventId:crypto.randomUUID(),at:new Date().toISOString(),month:key(month),runId:`PAYROLL-${key(month)}`,action,user:user?.sub||'unknown',details};
}

export async function auditPersistenceReadiness(){
  const [runs,audit]=await Promise.all([validatePersistentRunSchema(),validatePersistentAuditSchema()]);
  return {ready:runs.ready&&audit.ready,runs,audit};
}

export {appendPersistentAudit};
