const roles = ['cliente', 'operador', 'admin'];

function routePolicy(method, pathname) {
  if (method === 'GET' && pathname === '/health') {
    return { service: 'gateway', access: 'public' };
  }

  if (method === 'GET' && pathname === '/auth/public-key') {
    return { service: 'auth', access: 'public' };
  }

  if (method === 'POST' && ['/auth/register', '/auth/login'].includes(pathname)) {
    return { service: 'auth', access: 'public' };
  }

  if (method === 'PATCH' && /^\/auth\/users\/[^/]+\/approve-wholesale$/.test(pathname)) {
    return { service: 'auth', access: 'roles', roles: ['admin'] };
  }

  if (method === 'GET' && /^\/api\/products(?:\/[^/]+)?\/?$/.test(pathname)) {
    return { service: 'core', access: 'public' };
  }

  if (method === 'POST' && pathname === '/api/orders/checkout') {
    return { service: 'core', access: 'roles', roles: ['cliente'] };
  }

  if (method === 'GET' && /^\/api\/orders(?:\/[^/]+)?\/?$/.test(pathname)) {
    return { service: 'core', access: 'roles', roles };
  }

  if (method === 'PATCH' && /^\/api\/operator\/products\/[^/]+\/stock$/.test(pathname)) {
    return { service: 'core', access: 'roles', roles: ['operador', 'admin'] };
  }

  if (method === 'POST' && pathname === '/api/payments/webhook') {
    return { service: 'core', access: 'webhook' };
  }

  return null;
}

module.exports = routePolicy;
