import crypto from 'node:crypto';

const events=[];

export function appendAudit(event){
  const normalized={eventId:event.eventId||crypto.randomUUID(),at:event.at||new Date().toISOString(),...event};
  events.push(normalized);
  if(events.length>5000) events.shift();
  return normalized;
}

export function listAudit(month=''){
  const m=String(month||'').trim();
  return events.filter(e=>!m||e.month===m);
}
