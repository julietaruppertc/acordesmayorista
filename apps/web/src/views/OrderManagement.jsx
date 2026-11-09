import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { getOrders, getOrder, resolveOrder } from '../services/orderService';
import { orderLabels, formatDate, formatTotal } from '../services/orderStatus';

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let timer;
    async function refresh() {
      try {
        const data = await getOrders();
        if (alive) { setOrders(data); setError(''); }
      } catch (err) {
        if (alive) setError(err.response?.data?.message || 'No se pudieron consultar los pedidos.');
      } finally {
        if (alive) { setLoading(false); timer = setTimeout(refresh, 5000); }
      }
    }
    refresh();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  async function decide(order, decision) {
    if (busy) return;
    setBusy(order.id); setError(''); setMessage('');
    try {
      const updated = await resolveOrder(order.id, decision);
      setOrders(current => current.map(item => item.id === updated.id ? updated : item));
      setMessage(`Pedido ${updated.id}: ${orderLabels[updated.status] || updated.status}.`);
      setDetail(current => current?.id === updated.id ? updated : current);
    } catch (err) {
      setError(err.response?.data?.message || 'No se pudo comprobar el resultado. Actualice antes de reintentar.');
    } finally { setBusy(null); }
  }

  async function inspect(id) {
    try { setDetail(await getOrder(id)); }
    catch (err) { setError(err.response?.data?.message || 'No se pudo consultar el detalle.'); }
  }

  return <main className="min-h-screen bg-[#F4F0E8] p-6 text-[#183B4E]">
    <div className="max-w-7xl mx-auto">
      <header className="flex justify-between items-center gap-4 flex-wrap mb-8">
        <BrandLogo /><Link className="underline" to="/">Volver al inicio</Link>
      </header>
      <h1 className="text-3xl font-extrabold">Gestión de pedidos</h1>
      <p className="my-4">Confirmar representa un pago aprobado simulado: no se realizan cobros. Las reservas vencen a los 5 minutos y se revisan cada 30 segundos. La tabla se actualiza cada 5 segundos.</p>
      {error && <p role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl my-4">{error}</p>}
      {message && <p role="status" className="bg-[#E8F7F3] p-4 rounded-xl my-4">{message}</p>}
      {loading ? <p>Cargando pedidos...</p> : <div className="overflow-x-auto bg-white rounded-2xl border border-[#E8E3DA]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#E8F7F3]"><tr>{['Pedido', 'Cliente (ID)', 'Fecha', 'Total', 'Vencimiento', 'Estado', 'Acciones'].map(label => <th key={label} className="p-4">{label}</th>)}</tr></thead>
          <tbody>{orders.map(order => {
            const actionable = order.status === 'PENDING_PAYMENT' && new Date(order.expiresAt).getTime() > Date.now();
            return <tr key={order.id} className="border-t align-top">
              <td className="p-4 break-all">{order.id}</td><td className="p-4 break-all">{order.userId}</td>
              <td className="p-4">{formatDate(order.createdAt)}</td><td className="p-4 whitespace-nowrap">{formatTotal(order.total)}</td>
              <td className="p-4">{formatDate(order.expiresAt)}</td>
              <td className="p-4">{order.status === 'PENDING_PAYMENT' && !actionable ? 'Plazo vencido; esperando liberación' : orderLabels[order.status] || order.status}</td>
              <td className="p-4"><div className="flex flex-col gap-2 min-w-36">
                <button className="underline" onClick={() => inspect(order.id)}>Ver productos</button>
                {order.status === 'PENDING_PAYMENT' && <>
                  <button className="rounded-lg bg-[#183B4E] text-white p-2 disabled:opacity-40" disabled={!actionable || !!busy} onClick={() => decide(order, 'APPROVED')}>Confirmar pedido</button>
                  <button className="rounded-lg bg-red-50 text-red-700 p-2 disabled:opacity-40" disabled={!actionable || !!busy} onClick={() => decide(order, 'REJECTED')}>Rechazar pedido</button>
                </>}
              </div></td>
            </tr>;
          })}</tbody>
        </table>
        {!orders.length && <p className="p-6">No hay pedidos registrados.</p>}
      </div>}
      {detail && <section className="bg-white border rounded-2xl p-6 mt-6" aria-label="Detalle del pedido">
        <h2 className="font-bold mb-4">Productos del pedido {detail.id}</h2>
        <ul>{detail.items?.map(item => <li key={item.productId}>{item.productName}: {item.quantity} × {formatTotal(item.unitPrice)}</li>)}</ul>
        <button className="underline mt-4" onClick={() => setDetail(null)}>Cerrar detalle</button>
      </section>}
    </div>
  </main>;
}
