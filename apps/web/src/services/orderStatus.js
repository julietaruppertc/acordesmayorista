export const orderLabels = {
  PENDING_PAYMENT: 'Pendiente de confirmación',
  PAID: 'Confirmado (pago simulado)',
  PAYMENT_FAILED: 'Rechazado',
  EXPIRED: 'Vencido',
  CANCELLED: 'Cancelado',
};
export const formatDate = value => new Date(value).toLocaleString('es-AR');
export const formatTotal = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
