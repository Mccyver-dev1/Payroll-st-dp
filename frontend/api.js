const PAYROLL_API = String(window.PAYROLL_CONFIG?.API_BASE_URL || '').replace(/\/$/,'');

export async function apiFetch(path, options={}){
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
