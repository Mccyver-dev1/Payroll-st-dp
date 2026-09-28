import crypto from 'node:crypto';
import {resolveTables,getTableFields,listRecords} from './feishu.js';
import {createRecord,updateRecord} from './feishu-write.js';

const RUN_FIELDS = {
  id:['PayrollRunID','RunID'],
  month:['PayrollMonth','Month'],
  status:['Status','RunStatus'],
  hash:['PreparedHash','Hash'],
  rowCount:['RowCount','PayrollRowCount'],
  newCount:['NewRecordCount','NewRecords'],
  duplicateCount:['DuplicateCount','Duplicates'],
  preparedBy:['PreparedBy'],
  validatedAt:['ValidatedAt','ValidationAt'],
  approvedBy:['ApprovedBy'],
  approvedAt:['ApprovedAt'],
  lockedBy:['LockedBy'],
  lockedAt:['LockedAt'],
  committedAt:['CommittedAt'],
  updatedAt:['UpdatedAt']
};

const AUDIT_FIELDS = {
  eventId:['EventID','AuditEventID'],
  runId:['PayrollRunID','RunID'],
  month:['PayrollMonth','Month'],
  action:['Action','Event'],
  user:['User','Username','Actor'],
  at:['EventAt','Timestamp'],
  details:['Details','Payload']
};

function fieldMap(fields, spec){
  const out={};
  for(const [key,aliases] of Object.entries(spec)){
    const f=(fields||[]).find(x=>aliases.includes(x.field_name));
    if(f) out[key]=f.field_name;
  }
  return out;
}
function required(map, keys, label){
  const missing=keys.filter(k=>!map[k]);
  if(missing.length) throw new Error(`${label} table is missing required fields: ${missing.join(', ')}`);
}
function valueText(v){
  if(Array.isArray(v)) return v.map(x=>x?.text||x?.name||x?.id||'').join(', ');
  if(v&&typeof v==='object') return v.text||v.name||v.id||'';
  return v??'';
}
function recordValue(record,field){return field?valueText(record.fields?.[field]):'';}
function now(){return new Date().toISOString();}
function runId(month){return `PAYROLL-${month}`;}

async function tableIdFor(kind){
  const mapping=await resolveTables();
  if(kind==='runs') return process.env.FEISHU_TABLE_PAYROLL_RUNS || mapping.payrollRuns || '';
  if(kind==='audit') return process.env.FEISHU_TABLE_PAYROLL_AUDIT || mapping.payrollAudit || '';
  return '';
}

export async function validatePersistentRunSchema(){
  const tableId=await tableIdFor('runs');
  if(!tableId) return {ready:false,tableId:null,missing:['FEISHU_TABLE_PAYROLL_RUNS'],message:'Persistent Payroll Runs table is not configured.'};
  const fields=await getTableFields(tableId);
  const map=fieldMap(fields,RUN_FIELDS);
  required(map,['id','month','status'],'Payroll Runs');
  return {ready:true,tableId,fields:fields.map(f=>({field_id:f.field_id,field_name:f.field_name,type:f.type})),mapping:map};
}

export async function validatePersistentAuditSchema(){
  const tableId=await tableIdFor('audit');
  if(!tableId) return {ready:false,tableId:null,missing:['FEISHU_TABLE_PAYROLL_AUDIT'],message:'Persistent Payroll Audit table is not configured.'};
  const fields=await getTableFields(tableId);
  const map=fieldMap(fields,AUDIT_FIELDS);
  required(map,['eventId','month','action','at'],'Payroll Audit');
  return {ready:true,tableId,fields:fields.map(f=>({field_id:f.field_id,field_name:f.field_name,type:f.type})),mapping:map};
}

export async function getPersistentRun(month){
  const schema=await validatePersistentRunSchema();
  if(!schema.ready) throw new Error(schema.message);
  const rows=await listRecords(schema.tableId);
  const found=rows.find(r=>String(recordValue(r,schema.mapping.month)).slice(0,7)===String(month).slice(0,7));
  if(!found) return null;
  return {recordId:found.record_id,fields:found.fields,month:String(recordValue(found,schema.mapping.month)).slice(0,7),status:String(recordValue(found,schema.mapping.status)||'DRAFT'),preparedHash:String(recordValue(found,schema.mapping.hash)||'')};
}

function set(out,map,key,value){
  const field=map[key];
  if(field!==undefined && value!==undefined && value!==null) out[field]=value;
}

export async function upsertPersistentRun(data){
  const schema=await validatePersistentRunSchema();
  if(!schema.ready) throw new Error(schema.message);
  const existing=await getPersistentRun(data.month);
  const fields={};
  set(fields,schema.mapping,'id',data.runId||runId(data.month));
  set(fields,schema.mapping,'month',data.month);
  set(fields,schema.mapping,'status',data.status);
  set(fields,schema.mapping,'hash',data.preparedHash);
  set(fields,schema.mapping,'rowCount',data.rowCount);
  set(fields,schema.mapping,'newCount',data.newRecordCount);
  set(fields,schema.mapping,'duplicateCount',data.duplicateCount);
  set(fields,schema.mapping,'preparedBy',data.preparedBy);
  set(fields,schema.mapping,'validatedAt',data.validatedAt);
  set(fields,schema.mapping,'approvedBy',data.approvedBy);
  set(fields,schema.mapping,'approvedAt',data.approvedAt);
  set(fields,schema.mapping,'lockedBy',data.lockedBy);
  set(fields,schema.mapping,'lockedAt',data.lockedAt);
  set(fields,schema.mapping,'committedAt',data.committedAt);
  set(fields,schema.mapping,'updatedAt',data.updatedAt||now());
  if(existing) return {...(await updateRecord(schema.tableId,existing.recordId,fields)),operation:'UPDATE',recordId:existing.recordId};
  return {...(await createRecord(schema.tableId,fields)),operation:'CREATE'};
}

export async function appendPersistentAudit(event){
  const schema=await validatePersistentAuditSchema();
  if(!schema.ready) throw new Error(schema.message);
  const fields={};
  set(fields,schema.mapping,'eventId',event.eventId||crypto.randomUUID());
  set(fields,schema.mapping,'runId',event.runId||runId(event.month));
  set(fields,schema.mapping,'month',event.month);
  set(fields,schema.mapping,'action',event.action);
  set(fields,schema.mapping,'user',event.user||'unknown');
  set(fields,schema.mapping,'at',event.at||now());
  set(fields,schema.mapping,'details',JSON.stringify(event.details||{}));
  return createRecord(schema.tableId,fields);
}
