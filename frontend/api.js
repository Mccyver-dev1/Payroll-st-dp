const PAYROLL_API = String(window.PAYROLL_CONFIG?.API_BASE_URL || '').replace(/\/$/,'');

function requireBackend(){
  if(!PAYROLL_API){
    throw new Error('Backend API URL is not configured. Set frontend/config.js API_BASE_URL to the deployed Payroll backend URL.');
  }
}

export async function apiFetch(path, options={}){
  requireBackend();
  const response = await fetch(PAYROLL_API + path,{
    credentials:'include',
    ...options,
    headers:{...(options.headers||{})}
  });
  if(response.status===401){
    if(!location.pathname.endsWith('/login.html') && !location.pathname.endsWith('login.html')){
      location.href='login.html';
    }
  }
  return response;
}

export {PAYROLL_API};
