import {tenantAccessToken} from './feishu.js';
import {config} from './config.js';

const BASE='https://open.feishu.cn/open-apis';

async function request(path, options={}){
  const token=await tenantAccessToken();
  const r=await fetch(BASE+path,{
    ...options,
    headers:{
      Authorization:`Bearer ${token}`,
      'Content-Type':'application/json',
      ...(options.headers||{})
    }
  });
  const raw=await r.text();
  let body={};
  try{body=JSON.parse(raw)}catch{body={raw}};
  if(!r.ok || (body.code!==undefined && body.code!==0))
    throw new Error(`Feishu API ${r.status}: ${body.msg||raw}`);
  return body;
}

export async function createRecord(tableId,fields){
  return request(`/bitable/v1/apps/${config.appToken}/tables/${tableId}/records`,{
    method:'POST',
    body:JSON.stringify({fields})
  });
}

export async function updateRecord(tableId,recordId,fields){
  return request(`/bitable/v1/apps/${config.appToken}/tables/${tableId}/records/${recordId}`,{
    method:'PUT',
    body:JSON.stringify({fields})
  });
}

export async function batchCreateRecords(tableId,records){
  if(!records.length)return {data:{records:[]}};
  return request(`/bitable/v1/apps/${config.appToken}/tables/${tableId}/records/batch_create`,{
    method:'POST',
    body:JSON.stringify({records:records.map(fields=>({fields}))})
  });
}
