
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  CreditCard,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ShieldCheck,
  Wallet,
  PackageCheck,
  Music2,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import BrandLogo from "../components/BrandLogo";

function Payment() {
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const [paymentStatus, setPaymentStatus] = useState("pending");
  const [paymentMethod, setPaymentMethod] = useState("card");

  const pendingOrder = JSON.parse(
    sessionStorage.getItem("pendingOrder") || "null"
  );

  const simulatePayment = (result) => {
    if (paymentStatus === "processing") return;

    setPaymentStatus("processing");

    setTimeout(() => {
      if (result === "success") {
        sessionStorage.setItem(
          "lastOrder",
          JSON.stringify({
            ...pendingOrder,
            status: "approved",
            paymentMethod,
            date: new Date().toISOString(),
          })
        );

        clearCart();
        setPaymentStatus("success");
      } else {
        setPaymentStatus("rejected");
      }
    }, 1200);
  };

  // No existe un pedido pendiente.
  if (!pendingOrder) {
    return (
      <main className="min-h-screen bg-[#F4F0E8] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-[#E8E3DA] p-10 text-center max-w-md shadow-sm">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto">
            <XCircle size={42} className="text-red-500" />
          </div>

          <h1 className="text-2xl font-extrabold text-[#183B4E] mt-6">
            No hay un pedido pendiente
          </h1>

          <p className="text-slate-500 mt-3 leading-relaxed">
            Primero necesitás completar el proceso de compra para acceder
            a la pantalla de pago.
          </p>

          <Link
            to="/#catalogo"
            className="inline-flex items-center justify-center mt-7 bg-[#183B4E] text-white px-7 py-3 rounded-xl font-bold hover:bg-[#24566D] transition"
          >
            Volver al catálogo
          </Link>
        </div>
      </main>
    );
  }

  // Pago aprobado.
  if (paymentStatus === "success") {
    return (
      <main className="min-h-screen bg-[#F4F0E8] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-[#E8E3DA] p-9 md:p-12 text-center max-w-lg w-full shadow-sm">
          <div className="w-24 h-24 rounded-full bg-[#E8F7F3] flex items-center justify-center mx-auto">
            <CheckCircle size={55} className="text-[#20B8A5]" />
          </div>

          <p className="text-[#20B8A5] font-extrabold uppercase tracking-[0.2em] text-xs mt-7">
            Compra confirmada
          </p>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[#183B4E] mt-3">
            ¡Pago aprobado!
          </h1>

          <p className="text-slate-500 mt-4 leading-relaxed">
            Tu pago fue procesado correctamente. Muchas gracias por
            elegir Acordes Mayorista.
          </p>

          <div className="bg-[#F4F0E8] rounded-2xl p-6 mt-8">
            <p className="text-sm text-slate-500">
              Total de tu compra
            </p>

            <p className="text-3xl font-extrabold text-[#183B4E] mt-2">
              ${Number(pendingOrder.total).toLocaleString("es-AR")}
            </p>

            <div className="flex items-center justify-center gap-2 text-sm text-[#20B8A5] font-semibold mt-4">
              <PackageCheck size={18} />
              Pedido confirmado
            </div>
          </div>

          <button
            onClick={() => {
              sessionStorage.removeItem("pendingOrder");
              navigate("/");
            }}
            className="w-full mt-7 bg-[#183B4E] text-white py-4 rounded-xl font-bold hover:bg-[#24566D] transition"
          >
            Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F0E8] px-5 py-8 md:py-12">
      <div className="max-w-5xl mx-auto">

        {/* Encabezado */}
        <header className="flex items-center justify-between mb-10">
          <Link to="/">
            <BrandLogo />
          </Link>

          <div className="hidden sm:flex items-center gap-2 text-sm text-[#183B4E] font-semibold">
            <ShieldCheck size={19} className="text-[#20B8A5]" />
            Pago de demostración
          </div>
        </header>

        {/* Título */}
        <div className="mb-9">
          <p className="text-[#20B8A5] font-extrabold uppercase tracking-[0.2em] text-xs">
            Último paso
          </p>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[#183B4E] mt-2">
            Simulación de pago
          </h1>

          <p className="text-slate-500 mt-3">
            Elegí cómo querés pagar y realizá una prueba de compra.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-7">

          {/* Métodos de pago */}
          <section className="lg:col-span-3 bg-white rounded-3xl border border-[#E8E3DA] p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-11 h-11 bg-[#E8F7F3] rounded-xl flex items-center justify-center">
                <Wallet size={22} className="text-[#20B8A5]" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#183B4E]">
                  Método de pago
                </h2>
                <p className="text-sm text-slate-500">
                  Seleccioná una opción.
                </p>
              </div>
            </div>

            <div className="space-y-4">

              {/* Tarjeta */}
              <label
                className={`flex items-center gap-4 border-2 rounded-2xl p-5 cursor-pointer transition ${
                  paymentMethod === "card"
                    ? "border-[#20B8A5] bg-[#E8F7F3]"
                    : "border-[#E8E3DA] hover:border-[#B8DCD5]"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === "card"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="accent-[#20B8A5] w-4 h-4"
                />

                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <CreditCard size={25} className="text-[#183B4E]" />
                </div>

                <div className="flex-1">
                  <p className="font-bold text-[#183B4E]">
                    Tarjeta de crédito / débito
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Simulación de pago con tarjeta.
                  </p>
                </div>
              </label>

              {/* Transferencia */}
              <label
                className={`flex items-center gap-4 border-2 rounded-2xl p-5 cursor-pointer transition ${
                  paymentMethod === "transfer"
                    ? "border-[#20B8A5] bg-[#E8F7F3]"
                    : "border-[#E8E3DA] hover:border-[#B8DCD5]"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="transfer"
                  checked={paymentMethod === "transfer"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="accent-[#20B8A5] w-4 h-4"
                />

                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <ShieldCheck size={25} className="text-[#183B4E]" />
                </div>

                <div className="flex-1">
                  <p className="font-bold text-[#183B4E]">
                    Transferencia bancaria
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Simulación de transferencia.
                  </p>
                </div>
              </label>
            </div>

            {/* Resultado rechazado */}
            {paymentStatus === "rejected" && (
              <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl p-4 mt-6 flex items-start gap-3">
                <XCircle size={21} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Pago rechazado</p>
                  <p className="text-sm mt-1">
                    No se pudo completar el pago. Podés intentar nuevamente.
                  </p>
                </div>
              </div>
            )}

            {/* Procesando */}
            {paymentStatus === "processing" && (
              <div className="bg-[#E8F7F3] rounded-xl p-4 mt-6 flex items-center justify-center gap-3 text-[#183B4E]">
                <div className="w-5 h-5 border-2 border-[#20B8A5] border-t-transparent rounded-full animate-spin" />
                <p className="font-semibold">
                  Procesando pago...
                </p>
              </div>
            )}

            {/* Botones de simulación */}
            <div className="mt-8 space-y-3">
              <button
                onClick={() => simulatePayment("success")}
                disabled={paymentStatus === "processing"}
                className="w-full bg-[#20B8A5] text-[#183B4E] py-4 rounded-xl font-extrabold hover:bg-[#19A994] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simular pago aprobado
              </button>

              <button
                onClick={() => simulatePayment("rejected")}
                disabled={paymentStatus === "processing"}
                className="w-full bg-white border-2 border-[#F07858] text-[#D65F43] py-4 rounded-xl font-bold hover:bg-[#FFF2ED] transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simular pago rechazado
              </button>
            </div>

            <Link
              to="/checkout"
              className="flex items-center justify-center gap-2 text-slate-500 mt-7 hover:text-[#183B4E] font-semibold transition"
            >
              <ArrowLeft size={17} />
              Volver al checkout
            </Link>
          </section>

          {/* Resumen del pedido */}
          <aside className="lg:col-span-2">
            <div className="bg-[#183B4E] rounded-3xl p-7 text-white sticky top-8">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                  <Music2 size={23} className="text-[#20B8A5]" />
                </div>

                <div>
                  <h2 className="font-extrabold text-lg">
                    Tu pedido
                  </h2>
                  <p className="text-white/60 text-sm">
                    Resumen de compra
                  </p>
                </div>
              </div>

              <div className="border-t border-white/15 pt-5">
                <p className="text-white/60 text-sm">
                  Número de pedido
                </p>

                <p className="font-bold mt-1 break-all">
                  {pendingOrder.id || "Pedido de demostración"}
                </p>
              </div>

              <div className="border-t border-white/15 mt-5 pt-5">
                <p className="text-white/60 text-sm">
                  Método seleccionado
                </p>

                <p className="font-semibold mt-1">
                  {paymentMethod === "card"
                    ? "Tarjeta de crédito / débito"
                    : "Transferencia bancaria"}
                </p>
              </div>

              <div className="border-t border-white/15 mt-5 pt-5">
                <p className="text-white/60 text-sm">
                  Total a pagar
                </p>

                <p className="text-3xl font-extrabold text-[#20B8A5] mt-2">
                  ${Number(pendingOrder.total).toLocaleString("es-AR")}
                </p>
              </div>

              <div className="bg-white/10 rounded-xl p-4 mt-7 flex items-start gap-3">
                <ShieldCheck size={21} className="text-[#20B8A5] shrink-0" />
                <p className="text-xs text-white/75 leading-relaxed">
                  Esta pantalla utiliza un simulador de pagos. No se
                  realizan cobros reales ni se solicitan datos bancarios.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <footer className="text-center text-sm text-slate-400 mt-10">
          © Acordes Mayorista · Todos los derechos reservados
        </footer>
      </div>
    </main>
  );
}

export default Payment;
