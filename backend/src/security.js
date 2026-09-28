const attempts=new Map();

export function originGuard(req,res,next){
  if(!['POST','PUT','PATCH','DELETE'].includes(req.method)) return next();
  const configured=(process.env.FRONTEND_ORIGIN||'').trim();
  const origin=req.headers.origin||'';
  if(configured && configured!=='*' && origin && origin!==configured)
    return res.status(403).json({ok:false,error:'Origin not allowed.'});
  next();
}

export function rateLimitLogin(req,res,next){
  const ip=req.ip||req.socket.remoteAddress||'unknown';
  const now=Date.now();
  const windowMs=15*60*1000;
  const max=10;
  const item=attempts.get(ip);
  if(!item || now-item.startedAt>windowMs){
    attempts.set(ip,{startedAt:now,count:1});
    return next();
  }
  item.count++;
  if(item.count>max) return res.status(429).json({ok:false,error:'Too many login attempts. Try again later.'});
  next();
}
