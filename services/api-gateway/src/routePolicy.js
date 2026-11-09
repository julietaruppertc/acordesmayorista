
const roles = ['cliente', 'operador', 'admin'];

function routePolicy(method, pathname) {
  // Health check
  if (method === 'GET' && pathname === '/health') {
    return { service: 'gateway', access: 'public' };
  }

  // Clave pública
  if (method === 'GET' && pathname === '/auth/public-key') {
    return { service: 'auth', access: 'public' };
  }

  // Registro y login
  if (
    method === 'POST' &&
    ['/auth/register', '/auth/login'].includes(pathname)
  ) {
    return { service: 'auth', access: 'public' };
  }

  // Gestión administrativa de usuarios
  if (
    method === 'GET' &&
    pathname === '/auth/users'
  ) {
    return { service: 'auth', access: 'roles', roles: ['admin'] };
  }

  if (
    method === 'POST' &&
    pathname === '/auth/users'
  ) {
    return { service: 'auth', access: 'roles', roles: ['admin'] };
  }

  if (
    method === 'PATCH' &&
    /^\/auth\/users\/[^/]+$/.test(pathname)
  ) {
    return { service: 'auth', access: 'roles', roles: ['admin'] };
  }

  if (
    method === 'DELETE' &&
    /^\/auth\/users\/[^/]+$/.test(pathname)
  ) {
    return { service: 'auth', access: 'roles', roles: ['admin'] };
  }

  // Aprobar o rechazar mayoristas
  if (
    method === 'PATCH' &&
    /^\/auth\/users\/[^/]+\/approve-wholesale$/.test(pathname)
  ) {
    return { service: 'auth', access: 'roles', roles: ['admin'] };
  }

  // Catálogo
  if (
    method === 'GET' &&
    /^\/api\/products(?:\/[^/]+)?\/?$/.test(pathname)
  ) {
    return { service: 'core', access: 'public' };
  }

  // Checkout
  if (
    method === 'POST' &&
    pathname === '/api/orders/checkout'
  ) {
    return { service: 'core', access: 'roles', roles: ['cliente'] };
  }

  // Pedidos
  if (
    method === 'GET' &&
    /^\/api\/orders(?:\/[^/]+)?\/?$/.test(pathname)
  ) {
    return { service: 'core', access: 'roles', roles };
  }

  // Gestión de stock
  if (
    method === 'PATCH' &&
    /^\/api\/operator\/products\/[^/]+\/stock$/.test(pathname)
  ) {
    return {
      service: 'core',
      access: 'roles',
      roles: ['operador', 'admin'],
    };
  }

  // Webhook de pagos
  if (
    method === 'POST' &&
    pathname === '/api/payments/webhook'
  ) {
    return { service: 'core', access: 'webhook' };
  }

  return null;
}

module.exports = routePolicy;
