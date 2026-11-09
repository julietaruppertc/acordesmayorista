import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { getOrder } from '../services/orderService';
import { orderLabels, formatDate, formatTotal } from '../services/orderStatus';

export default function Payment() {
  const [orderId] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('pendingOrder') || 'null')?.id; }
    catch { return null; }
  });
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!orderId) return;
    let alive = true;
    let timer;
    async function refresh() {
      try {
        const data = await getOrder(orderId);
        if (!alive) return;
        setOrder(data); setError('');
        if (data.status !== 'PENDING_PAYMENT') {
          sessionStorage.setItem('lastOrder', JSON.stringify(data));
          return;
        }
      } catch (err) {
        if (alive) setError(err.response?.data?.message || 'No se pudo consultar el estado del pedido.');
      }
      if (alive) timer = setTimeout(refresh, 5000);
    }
    refresh();
    return () => { alive = false; clearTimeout(timer); };
  }, [orderId]);
  return <main className="min-h-screen bg-[#F4F0E8] flex items-center justify-center p-6 text-[#183B4E]">
    <section className="bg-white border border-[#E8E3DA] rounded-3xl p-8 max-w-xl w-full">
      <BrandLogo />
      <h1 className="text-2xl font-extrabold mt-6">{!orderId ? 'No hay un pedido pendiente' : order ? orderLabels[order.status] || order.status : 'Consultando pedido...'}</h1>
      {error && <p role="alert" className="text-red-700 my-4">{error}</p>}
      {order && <>
        <p className="my-4 break-all">Pedido: {order.id}</p>
        <p>Total: {formatTotal(order.total)}</p>
        {order.status === 'PENDING_PAYMENT' && <p className="my-4">Tu pedido espera la resolución del administrador. La reserva dura 5 minutos, hasta {formatDate(order.expiresAt)}. El estado se actualiza automáticamente.</p>}
        {order.status === 'PAID' && <p className="my-4">El administrador confirmó el pedido mediante un pago simulado. No se realizó ningún cobro real.</p>}
        {['PAYMENT_FAILED', 'EXPIRED'].includes(order.status) && <p className="my-4">La reserva de este pedido fue liberada. Podés volver al catálogo para realizar otro pedido.</p>}
        <ul className="my-4">{order.items?.map(item => <li key={item.productId}>{item.productName} × {item.quantity}</li>)}</ul>
      </>}
      <Link to="/" className="inline-block underline mt-5">Volver al inicio</Link>
    </section>
  </main>;
}
