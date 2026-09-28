import { config } from './config.js';

const BASE='https://open.feishu.cn/open-apis';
let cached={token:null,expiresAt:0};

async function jsonFetch(url,options={}){
  const r=await fetch(url,options);
  const text=await r.text();
  let body={}; try{body=JSON.parse(text)}catch{body={raw:text}};
  if(!r.ok || body.code && body.code!==0) throw new Error(`Feishu API ${r.status}: ${body.msg||text}`);
  return body;
}

export async function tenantAccessToken(){
  if(cached.token && Date.now()<cached.expiresAt) return cached.token;
  const body=await jsonFetch(`${BASE}/auth/v3/tenant_access_token/internal`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({app_id:config.appId,app_secret:config.appSecret})
  });
  cached={token:body.tenant_access_token,expiresAt:Date.now()+(Number(body.expire||7200)-120)*1000};
  return cached.token;
}

async function call(path,options={}){
  const token=await tenantAccessToken();
  return jsonFetch(BASE+path,{...options,headers:{'Authorization':`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})}});
}

export async function listTables(){
  const out=await call(`/bitable/v1/apps/${config.appToken}/tables?page_size=100`);
  return out.data?.items||[];
}

export async function listRecords(tableId){
  let pageToken='',all=[];
  do{
    const qs=new URLSearchParams({page_size:'500'}); if(pageToken)qs.set('page_token',pageToken);
    const out=await call(`/bitable/v1/apps/${config.appToken}/tables/${tableId}/records?${qs}`);
    all.push(...(out.data?.items||[])); pageToken=out.data?.page_token||'';
  }while(pageToken);
  return all;
}

export async function resolveTables(){
  const tables=await listTables();
  const byName=new Map(tables.map(t=>[t.name,t.table_id]));
  const find=(env,name)=>env||byName.get(name)||null;
  return {
    companies:find(config.tables.companies,'Companies'),
    departments:find(config.tables.departments,'Departments & Positions'),
    employees:find(config.tables.employees,'Employees'),
    attendance:find(config.tables.attendance,'AttendanceSummary'),
    payroll:find(config.tables.payroll,'Payroll'),
    payrollItems:find(config.tables.payrollItems,'PayrollItems'),
    payslips:find(config.tables.payslips,'Payslips')
  };
}

export async function sendTextMessage(receiveId,text){
  return call('/im/v1/messages?receive_id_type=open_id',{method:'POST',body:JSON.stringify({receive_id:receiveId,msg_type:'text',content:JSON.stringify({text})})});
}
