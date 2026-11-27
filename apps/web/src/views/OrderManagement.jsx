
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, ExternalLink } from 'lucide-react';

import {
  getOrders,
  getOrder,
  resolveOrder,
  getBlockchainProof,
} from '../services/orderService';

import {
  orderLabels,
  formatDate,
  formatTotal,
} from '../services/orderStatus';

function blockchainStatus(proof) {
  if (!proof.required || proof.status === 'NOT_REQUIRED') {
    return {
      label: 'No requiere certificación',
      style: 'bg-slate-100 text-slate-600',
    };
  }

  if (proof.status === 'PENDING') {
    return {
      label: 'Certificación pendiente',
      style: 'bg-amber-100 text-amber-800',
    };
  }

  if (proof.status === 'FAILED') {
    return {
      label: 'Certificación fallida',
      style: 'bg-red-100 text-red-700',
    };
  }

  if (proof.status === 'CONFIRMED' && proof.verified === true) {
    return {
      label: 'Certificación verificada',
      style: 'bg-emerald-100 text-emerald-800',
    };
  }

  if (proof.verificationStatus === 'NETWORK_UNAVAILABLE') {
    return {
      label: 'No se pudo conectar para verificar',
      style: 'bg-amber-100 text-amber-800',
    };
  }

  if (proof.verificationStatus === 'BLOCKCHAIN_DISABLED') {
    return {
      label: 'Verificación deshabilitada',
      style: 'bg-amber-100 text-amber-800',
    };
  }

  if (proof.status === 'CONFIRMED' && proof.verified === false) {
    return {
      label: 'Evidencia no validada',
      style: 'bg-red-100 text-red-700',
    };
  }

  return {
    label: proof.status || 'Estado no disponible',
    style: 'bg-slate-100 text-slate-600',
  };
}

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  const [blockchainProof, setBlockchainProof] = useState(null);
  const [blockchainOrderId, setBlockchainOrderId] = useState(null);
  const [blockchainLoading, setBlockchainLoading] = useState(false);

  const blockchainSectionRef = useRef(null);

  useEffect(() => {
    let alive = true;
    let timer;

    async function refresh() {
      try {
        const data = await getOrders();

        if (alive) {
          setOrders(data);
          setError('');
        }
      } catch (err) {
        if (alive) {
          setError(
            err.response?.data?.message ||
            'No se pudieron consultar los pedidos.'
          );
        }
      } finally {
        if (alive) {
          setLoading(false);
          timer = setTimeout(refresh, 5000);
        }
      }
    }

    refresh();

    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!blockchainOrderId) return;

    blockchainSectionRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [blockchainOrderId]);

  async function decide(order, decision) {
    if (busy) return;

    setBusy(order.id);
    setError('');
    setMessage('');

    try {
      const updated = await resolveOrder(order.id, decision);

      setOrders((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item
        )
      );

      setMessage(
        `Pedido ${updated.id}: ${
          orderLabels[updated.status] || updated.status
        }.`
      );

      setDetail((current) =>
        current?.id === updated.id ? updated : current
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'No se pudo comprobar el resultado. Actualice antes de reintentar.'
      );
    } finally {
      setBusy(null);
    }
  }

  async function inspect(id) {
    setError('');
    setBlockchainProof(null);
    setBlockchainOrderId(null);

    try {
      setDetail(await getOrder(id));
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'No se pudo consultar el detalle.'
      );
    }
  }

  async function inspectBlockchain(id) {
    setBlockchainLoading(true);
    setBlockchainProof(null);
    setBlockchainOrderId(id);
    setError('');

    try {
      const proof = await getBlockchainProof(id);
      setBlockchainProof(proof);
    } catch (err) {
      setBlockchainOrderId(null);
      setError(
        err.response?.data?.message ||
        'No se pudo consultar la certificación blockchain.'
      );
    } finally {
      setBlockchainLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4F0E8] p-6 text-[#183B4E]">
      <div className="max-w-7xl mx-auto">

        <div className="mb-9">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#183B4E] transition mb-5"
          >
            <ArrowLeft size={17} />
            Volver al inicio
          </Link>

          <p className="text-[#20B8A5] font-extrabold uppercase tracking-[0.2em] text-xs">
            Administración
          </p>

          <h1 className="text-3xl md:text-4xl font-extrabold mt-2">
            Gestión de pedidos
          </h1>
        </div>

        <p className="my-4">
          Confirmar representa un pago aprobado simulado: no se realizan
          cobros. Las reservas vencen a los 5 minutos y se revisan cada
          30 segundos. La tabla se actualiza cada 5 segundos.
        </p>

        {error && (
          <p
            role="alert"
            className="bg-red-50 text-red-700 p-4 rounded-xl my-4"
          >
            {error}
          </p>
        )}

        {message && (
          <p
            role="status"
            className="bg-[#E8F7F3] p-4 rounded-xl my-4"
          >
            {message}
          </p>
        )}

        {loading ? (
          <p>Cargando pedidos...</p>
        ) : (
          <div className="overflow-x-auto bg-white rounded-2xl border border-[#E8E3DA]">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#E8F7F3]">
                <tr>
                  {[
                    'Pedido',
                    'Cliente (ID)',
                    'Fecha',
                    'Total',
                    'Vencimiento',
                    'Estado',
                    'Acciones',
                  ].map((label) => (
                    <th key={label} className="p-4">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const actionable =
                    order.status === 'PENDING_PAYMENT' &&
                    new Date(order.expiresAt).getTime() > Date.now();

                  return (
                    <tr key={order.id} className="border-t align-top">
                      <td className="p-4 break-all">{order.id}</td>

                      <td className="p-4 break-all">{order.userId}</td>

                      <td className="p-4">
                        {formatDate(order.createdAt)}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {formatTotal(order.total)}
                      </td>

                      <td className="p-4">
                        {formatDate(order.expiresAt)}
                      </td>

                      <td className="p-4">
                        {order.status === 'PENDING_PAYMENT' && !actionable
                          ? 'Plazo vencido; esperando liberación'
                          : orderLabels[order.status] || order.status}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col gap-2 min-w-40">
                          <button
                            className="underline text-left"
                            onClick={() => inspect(order.id)}
                          >
                            Ver productos
                          </button>

                          <button
                            className="rounded-lg border border-[#20B8A5] text-[#183B4E] p-2 hover:bg-[#E8F7F3] disabled:opacity-40"
                            disabled={blockchainLoading}
                            onClick={() => inspectBlockchain(order.id)}
                          >
                            <span className="inline-flex items-center gap-2">
                              <ShieldCheck size={16} />
                              Ver blockchain
                            </span>
                          </button>

                          {order.status === 'PENDING_PAYMENT' && (
                            <>
                              <button
                                className="rounded-lg bg-[#183B4E] text-white p-2 disabled:opacity-40"
                                disabled={!actionable || !!busy}
                                onClick={() => decide(order, 'APPROVED')}
                              >
                                Confirmar pedido
                              </button>

                              <button
                                className="rounded-lg bg-red-50 text-red-700 p-2 disabled:opacity-40"
                                disabled={!actionable || !!busy}
                                onClick={() => decide(order, 'REJECTED')}
                              >
                                Rechazar pedido
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!orders.length && (
              <p className="p-6">No hay pedidos registrados.</p>
            )}
          </div>
        )}

        {detail && (
          <section
            className="bg-white border border-[#E8E3DA] rounded-2xl p-6 mt-6"
            aria-label="Detalle del pedido"
          >
            <h2 className="font-bold mb-4">
              Productos del pedido {detail.id}
            </h2>

            <ul className="space-y-2">
              {detail.items?.map((item) => (
                <li key={item.productId}>
                  {item.productName}: {item.quantity} ×{' '}
                  {formatTotal(item.unitPrice)}
                </li>
              ))}
            </ul>

            <button
              className="underline mt-4"
              onClick={() => setDetail(null)}
            >
              Cerrar detalle
            </button>
          </section>
        )}

        {blockchainOrderId && (
          <section
            ref={blockchainSectionRef}
            className="bg-white border border-[#E8E3DA] rounded-2xl p-6 mt-6 scroll-mt-24"
            aria-label="Certificación blockchain"
          >
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={22} />
              <h2 className="font-bold text-lg">
                Certificación blockchain
              </h2>
            </div>

            <p className="text-sm text-slate-500 mb-4 break-all">
              Pedido: {blockchainOrderId}
            </p>

            {blockchainLoading ? (
              <p>Consultando certificación...</p>
            ) : blockchainProof ? (
              <div className="space-y-4">
                {(() => {
                  const status = blockchainStatus(blockchainProof);

                  return (
                    <span
                      className={`inline-flex rounded-full px-3 py-2 text-sm font-bold ${status.style}`}
                    >
                      {status.label}
                    </span>
                  );
                })()}

                {blockchainProof.network && (
                  <p>
                    <strong>Red:</strong>{' '}
                    {blockchainProof.network}
                  </p>
                )}

                {blockchainProof.attestedAt && (
                  <p>
                    <strong>Fecha de certificación:</strong>{' '}
                    {formatDate(blockchainProof.attestedAt)}
                  </p>
                )}

                {blockchainProof.transactionHash && (
                  <div>
                    <p className="font-semibold mb-1">
                      Hash de transacción
                    </p>
                    <p className="text-sm break-all text-slate-600">
                      {blockchainProof.transactionHash}
                    </p>
                  </div>
                )}

                {blockchainProof.evidenceHash && (
                  <div>
                    <p className="font-semibold mb-1">
                      Hash de evidencia
                    </p>
                    <p className="text-sm break-all text-slate-600">
                      {blockchainProof.evidenceHash}
                    </p>
                  </div>
                )}

                {blockchainProof.contractAddress && (
                  <div>
                    <p className="font-semibold mb-1">
                      Contrato
                    </p>
                    <p className="text-sm break-all text-slate-600">
                      {blockchainProof.contractAddress}
                    </p>
                  </div>
                )}

                {blockchainProof.explorerUrl && (
                  <a
                    href={blockchainProof.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-semibold text-[#168F82] hover:underline"
                  >
                    Ver transacción en Etherscan
                    <ExternalLink size={16} />
                  </a>
                )}

                {blockchainProof.verificationStatus && (
                  <p className="text-sm text-slate-500">
                    Estado de verificación: {blockchainProof.verificationStatus}
                  </p>
                )}
              </div>
            ) : null}

            <button
              className="underline mt-5"
              onClick={() => {
                setBlockchainProof(null);
                setBlockchainOrderId(null);
              }}
            >
              Cerrar certificación
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
