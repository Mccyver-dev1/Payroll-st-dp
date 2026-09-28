import crypto from 'node:crypto';

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 8*60*60*1000);
const COOKIE = process.env.SESSION_COOKIE_NAME || 'mac_payroll_session';

function b64url(v){return Buffer.from(v).toString('base64url');}
function fromB64(v){return Buffer.from(v,'base64url').toString('utf8');}

function secret(){
  const s=process.env.SESSION_SECRET||'';
  if(s.length<32) throw new Error('SESSION_SECRET must be at least 32 characters.');
  return s;
}

function sign(payload){
  const body=b64url(JSON.stringify(payload));
  const sig=crypto.createHmac('sha256',secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verify(token){
  if(!token) return null;
  const [body,sig]=token.split('.');
  if(!body||!sig) return null;
  const expected=crypto.createHmac('sha256',secret()).update(body).digest('base64url');
  const a=Buffer.from(sig),b=Buffer.from(expected);
  if(a.length!==b.length || !crypto.timingSafeEqual(a,b)) return null;
  let payload;
  try{payload=JSON.parse(fromB64(body));}catch{return null;}
  if(!payload.exp || Date.now()>payload.exp) return null;
  return payload;
}

function parseCookies(header=''){
  const out={};
  for(const part of header.split(';')){
    const i=part.indexOf('=');
    if(i<0)continue;
    out[part.slice(0,i).trim()]=decodeURIComponent(part.slice(i+1).trim());
  }
  return out;
}

export function hashPassword(password,salt=crypto.randomBytes(16).toString('hex')){
  const iterations=210000, keylen=32;
  const hash=crypto.pbkdf2Sync(password,salt,iterations,keylen,'sha256').toString('hex');
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

export function verifyPassword(password,stored){
  const [scheme,it,salt,expected]=String(stored||'').split('$');
  if(scheme!=='pbkdf2'||!it||!salt||!expected)return false;
  const actual=crypto.pbkdf2Sync(password,salt,Number(it),32,'sha256').toString('hex');
  const a=Buffer.from(actual),b=Buffer.from(expected);
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}

export function login(req,res){
  const username=process.env.PAYROLL_ADMIN_USERNAME||'';
  const stored=process.env.PAYROLL_ADMIN_PASSWORD_HASH||'';
  if(!username||!stored) throw new Error('Production login is not configured.');
  const body=req.body||{};
  if(body.username!==username || !verifyPassword(String(body.password||''),stored)){
    return res.status(401).json({ok:false,error:'Invalid credentials.'});
  }
  const now=Date.now();
  const token=sign({sub:username,role:'PAYROLL_ADMIN',iat:now,exp:now+SESSION_TTL_MS});
  const secure=process.env.NODE_ENV==='production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',`${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS/1000)}${secure}`);
  return res.json({ok:true,user:{username,role:'PAYROLL_ADMIN'},expiresAt:now+SESSION_TTL_MS});
}

export function requireSession(req,res,next){
  const token=parseCookies(req.headers.cookie||'')[COOKIE];
  const session=verify(token);
  if(!session) return res.status(401).json({ok:false,error:'Authentication required.'});
  req.user=session;
  next();
}

export function logout(_req,res){
  res.setHeader('Set-Cookie',`${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.json({ok:true});
}

export function authStatus(req,res){
  const token=parseCookies(req.headers.cookie||'')[COOKIE];
  const session=verify(token);
  res.json({authenticated:!!session,user:session?{username:session.sub,role:session.role}:null,expiresAt:session?.exp||null});
}
