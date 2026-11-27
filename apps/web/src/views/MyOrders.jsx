
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Package,
  ShoppingBag,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import {
  getOrders,
  getOrder,
  getBlockchainProof,
} from "../services/orderService";

import {
  orderLabels,
  formatDate,
  formatTotal,
} from "../services/orderStatus";

function getBlockchainStatus(proof) {
  if (proof.required === false || proof.status === "NOT_REQUIRED") {
    return {
      label: "No requiere certificación",
      style: "bg-slate-100 text-slate-600",
      description: "Este pedido no necesita certificación blockchain.",
    };
  }

  if (proof.status === "PENDING") {
    return {
      label: "Certificación pendiente",
      style: "bg-amber-100 text-amber-800",
      description:
        proof.verificationStatus === "NOT_AVAILABLE"
          ? "Todavía no hay evidencia disponible para verificar. La certificación sigue pendiente."
          : "La certificación está pendiente de confirmación.",
    };
  }

  if (proof.status === "CONFIRMED" && proof.verified === false) {
    return {
      label: "Evidencia no validada",
      style: "bg-red-100 text-red-700",
      description: "La evidencia todavía no pudo validarse correctamente.",
    };
  }

  if (proof.status === "CONFIRMED") {
    return {
      label: "Certificación confirmada",
      style: "bg-emerald-100 text-emerald-800",
      description: "La certificación del pedido fue confirmada.",
    };
  }

  if (proof.status === "FAILED") {
    return {
      label: "Certificación fallida",
      style: "bg-red-100 text-red-700",
      description: "No se pudo completar la certificación del pedido.",
    };
  }

  return {
    label: proof.status || "Estado no disponible",
    style: "bg-slate-100 text-slate-600",
    description: "No hay información adicional sobre la certificación.",
  };
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [blockchainProof, setBlockchainProof] = useState(null);
  const [blockchainLoading, setBlockchainLoading] = useState(false);
  const [blockchainError, setBlockchainError] = useState("");

  const requestSequence = useRef(0);

  async function loadOrders() {
    setLoading(true);
    setError("");

    try {
      const data = await getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudieron consultar tus pedidos."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function inspectOrder(orderId) {
    if (selectedOrderId === orderId) {
      requestSequence.current += 1;
      setSelectedOrderId(null);
      setDetail(null);
      setBlockchainProof(null);
      setDetailError("");
      setBlockchainError("");
      return;
    }

    const requestId = ++requestSequence.current;

    setSelectedOrderId(orderId);
    setDetail(null);
    setBlockchainProof(null);
    setDetailError("");
    setBlockchainError("");
    setDetailLoading(true);
    setBlockchainLoading(true);

    const [detailResult, proofResult] = await Promise.allSettled([
      getOrder(orderId),
      getBlockchainProof(orderId),
    ]);

    if (requestId !== requestSequence.current) return;

    if (detailResult.status === "fulfilled") {
      setDetail(detailResult.value);
    } else {
      setDetailError(
        detailResult.reason?.response?.data?.message ||
          "No se pudo consultar el detalle del pedido."
      );
    }

    if (proofResult.status === "fulfilled") {
      setBlockchainProof(proofResult.value);
    } else {
      setBlockchainError(
        proofResult.reason?.response?.data?.message ||
          "No se pudo consultar la certificación blockchain."
      );
    }

    setDetailLoading(false);
    setBlockchainLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#F4F0E8] px-4 py-8 md:px-6 md:py-10 text-[#183B4E]">
      <div className="max-w-5xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#183B4E] transition mb-6"
        >
          <ArrowLeft size={17} />
          Volver al inicio
        </Link>

        <div className="mb-8">
          <p className="text-[#20B8A5] font-extrabold uppercase tracking-[0.2em] text-xs">
            Mi cuenta
          </p>

          <h1 className="text-3xl md:text-4xl font-extrabold mt-2 flex items-center gap-3">
            <ShoppingBag size={32} />
            Mis pedidos
          </h1>

          <p className="text-slate-500 mt-3">
            Consultá tus compras, revisá sus detalles y verificá sus
            certificaciones blockchain.
          </p>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={loadOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#20B8A5] px-4 py-2 text-sm font-semibold hover:bg-[#E8F7F3] disabled:opacity-50 transition"
          >
            <RefreshCw size={16} />
            Actualizar pedidos
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl mb-5"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-[#E8E3DA]">
            <RefreshCw className="animate-spin mx-auto mb-3" size={26} />
            <p className="text-slate-500">Cargando tus pedidos...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8E3DA] p-10 text-center">
            <Package size={42} className="mx-auto text-[#20B8A5] mb-4" />

            <h2 className="text-xl font-bold mb-2">
              Todavía no tenés pedidos
            </h2>

            <p className="text-slate-500 mb-6">
              Cuando realices una compra, vas a poder consultarla desde acá.
            </p>

            <Link
              to="/"
              className="inline-flex rounded-xl bg-[#183B4E] text-white px-6 py-3 font-semibold hover:bg-[#24566D] transition"
            >
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const isSelected = selectedOrderId === order.id;

              return (
                <article
                  key={order.id}
                  className="bg-white rounded-2xl border border-[#E8E3DA] shadow-sm overflow-hidden"
                >
                  <div className="p-5 md:p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Pedido
                        </p>

                        <h2 className="font-extrabold text-lg break-all mt-1">
                          #{order.id}
                        </h2>

                        <p className="text-sm text-slate-500 mt-2">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>

                      <div className="flex flex-col md:items-end gap-2">
                        <span className="text-xs font-semibold text-slate-500">
                          Total de la compra
                        </span>

                        <span className="text-xl font-extrabold">
                          {formatTotal(order.total)}
                        </span>

                        <span className="inline-flex rounded-full bg-[#E8F7F3] text-[#168F82] px-3 py-1 text-xs font-bold">
                          {orderLabels[order.status] || order.status}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-[#E8E3DA] mt-5 pt-4 flex justify-end">
                      <button
                        onClick={() => inspectOrder(order.id)}
                        className="inline-flex items-center gap-2 text-sm font-bold text-[#168F82] hover:text-[#183B4E] transition"
                      >
                        {isSelected ? "Cerrar detalle" : "Ver detalle y certificación"}

                        {isSelected ? (
                          <ChevronUp size={18} />
                        ) : (
                          <ChevronDown size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="bg-[#FAFAF7] border-t border-[#E8E3DA] p-5 md:p-6 space-y-6">
                      <section>
                        <h3 className="font-extrabold text-lg mb-4 flex items-center gap-2">
                          <Package size={20} />
                          Productos del pedido
                        </h3>

                        {detailLoading ? (
                          <p className="text-sm text-slate-500">
                            Cargando detalle...
                          </p>
                        ) : detailError ? (
                          <p role="alert" className="text-sm text-red-700">
                            {detailError}
                          </p>
                        ) : detail ? (
                          <>
                            <div className="space-y-3">
                              {detail.items?.map((item) => (
                                <div
                                  key={item.productId}
                                  className="bg-white rounded-xl border border-[#E8E3DA] p-4 flex flex-col sm:flex-row sm:justify-between gap-2"
                                >
                                  <div>
                                    <p className="font-bold">
                                      {item.productName}
                                    </p>
                                    <p className="text-sm text-slate-500 mt-1">
                                      Cantidad: {item.quantity}
                                    </p>
                                  </div>

                                  <div className="sm:text-right">
                                    <p className="text-xs text-slate-500">
                                      Precio unitario
                                    </p>
                                    <p className="font-semibold">
                                      {formatTotal(item.unitPrice)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex justify-between items-center border-t border-[#E8E3DA] pt-4 mt-4">
                              <span className="font-bold">Total del pedido</span>
                              <span className="font-extrabold text-lg">
                                {formatTotal(detail.total)}
                              </span>
                            </div>
                          </>
                        ) : null}
                      </section>

                      <section className="bg-white border border-[#E8E3DA] rounded-2xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="bg-[#E8F7F3] p-2 rounded-xl">
                            <ShieldCheck size={23} className="text-[#168F82]" />
                          </div>

                          <div>
                            <h3 className="font-extrabold">
                              Certificación blockchain
                            </h3>
                            <p className="text-xs text-slate-500">
                              Verificación de la compra
                            </p>
                          </div>
                        </div>

                        {blockchainLoading ? (
                          <p className="text-sm text-slate-500">
                            Consultando certificación...
                          </p>
                        ) : blockchainError ? (
                          <p role="alert" className="text-sm text-red-700">
                            {blockchainError}
                          </p>
                        ) : blockchainProof ? (
                          <div className="space-y-4">
                            {(() => {
                              const status = getBlockchainStatus(blockchainProof);

                              return (
                                <div className="space-y-2">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-2 text-sm font-bold ${status.style}`}
                                  >
                                    {status.label}
                                  </span>

                                  <p className="text-sm text-slate-600">
                                    {status.description}
                                  </p>
                                </div>
                              );
                            })()}

                            {blockchainProof.network && (
                              <p className="text-sm">
                                <strong>Red:</strong>{" "}
                                {blockchainProof.network}
                              </p>
                            )}

                            {blockchainProof.attestedAt && (
                              <p className="text-sm">
                                <strong>Fecha de certificación:</strong>{" "}
                                {formatDate(blockchainProof.attestedAt)}
                              </p>
                            )}

                            {blockchainProof.transactionHash && (
                              <div>
                                <p className="text-sm font-bold mb-1">
                                  Hash de transacción
                                </p>
                                <p className="text-xs text-slate-500 break-all">
                                  {blockchainProof.transactionHash}
                                </p>
                              </div>
                            )}

                            {blockchainProof.evidenceHash && (
                              <div>
                                <p className="text-sm font-bold mb-1">
                                  Hash de evidencia
                                </p>
                                <p className="text-xs text-slate-500 break-all">
                                  {blockchainProof.evidenceHash}
                                </p>
                              </div>
                            )}

                            {blockchainProof.contractAddress && (
                              <div>
                                <p className="text-sm font-bold mb-1">
                                  Contrato
                                </p>
                                <p className="text-xs text-slate-500 break-all">
                                  {blockchainProof.contractAddress}
                                </p>
                              </div>
                            )}

                            {blockchainProof.explorerUrl && (
                              <a
                                href={blockchainProof.explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 font-bold text-[#168F82] hover:underline text-sm"
                              >
                                Ver en Etherscan
                                <ExternalLink size={16} />
                              </a>
                            )}

                            {blockchainProof.verificationStatus && (
                              <p className="text-xs text-slate-500">
                                Estado de verificación:{" "}
                                {blockchainProof.verificationStatus}
                              </p>
                            )}
                          </div>
                        ) : null}
                      </section>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
