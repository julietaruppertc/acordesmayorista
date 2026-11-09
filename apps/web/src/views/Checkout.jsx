
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ShoppingBag,
  User,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  MapPin,
  Mail,
  Phone,
  Package,
  CheckCircle,
  CreditCard,
  Truck,
  ShieldCheck,
} from "lucide-react";

import BrandLogo from "../components/BrandLogo";
import { useCart } from "../context/CartContext";
import { createOrder } from "../services/orderService";

function Checkout() {
  const navigate = useNavigate();
  const { cart, totalPrice, clearCart } = useCart();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const formatPrice = (price) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(price) || 0);

  const totalItems = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (cart.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }

    const invalidProduct = cart.find(
      (item) =>
        !item.id ||
        !Number.isInteger(Number(item.version))
    );

    if (invalidProduct) {
      setError(
        "No se puede realizar el pedido porque algún producto no tiene un identificador o versión válida. Actualizá el catálogo."
      );
      return;
    }

    try {
      setLoading(true);

      const response = await createOrder(cart);

      if (!response?.data?.id) {
        throw new Error(
          "El backend no devolvió el identificador del pedido."
        );
      }

      sessionStorage.setItem(
        "pendingOrder",
        JSON.stringify({
          ...response.data,
          customer: formData,
          products: cart,
          total: response.data.total,
        })
      );

      clearCart();
      navigate("/pago");
    } catch (err) {
      console.error("Error al crear el pedido:", err);

      const backendError = err.response?.data;

      if (err.response?.status === 409) {
        if (backendError?.error === "STOCK_VERSION_CONFLICT") {
          setError(
            "El stock de uno de los productos fue modificado. Actualizá el catálogo e intentá nuevamente."
          );
        } else if (backendError?.error === "INSUFFICIENT_STOCK") {
          setError(
            "No hay stock suficiente para completar el pedido."
          );
        } else {
          setError(
            backendError?.message ||
              "Se produjo un conflicto al crear el pedido."
          );
        }
      } else {
        setError(
          backendError?.message ||
            "No se pudo crear el pedido. Verificá la conexión e intentá nuevamente."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (cart.length === 0) {
    return (
      <main className="min-h-screen bg-[#F4F0E8] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-[#E8E3DA] p-10 text-center max-w-md shadow-sm">
          <div className="w-20 h-20 bg-[#E8F7F3] rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag size={38} className="text-[#20B8A5]" />
          </div>

          <h1 className="text-2xl font-extrabold text-[#183B4E] mt-6">
            Tu carrito está vacío
          </h1>

          <p className="text-slate-500 mt-3">
            Agregá instrumentos antes de continuar con tu compra.
          </p>

          <Link
            to="/#catalogo"
            className="inline-flex items-center justify-center gap-2 mt-7 bg-[#183B4E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#24566D] transition"
          >
            Explorar catálogo
            <ArrowRight size={18} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4F0E8]">
      {/* ENCABEZADO */}
      <header className="bg-white border-b border-[#E8E3DA]">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/">
            <BrandLogo />
          </Link>

          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck size={19} className="text-[#20B8A5]" />
            Compra segura
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-10 md:py-14">
        {/* TÍTULO */}
        <div className="max-w-3xl">
          <p className="text-[#20B8A5] font-extrabold uppercase tracking-[0.2em] text-xs">
            Tu compra
          </p>

          <h1 className="text-3xl md:text-4xl font-extrabold text-[#183B4E] mt-3">
            Finalizar compra
          </h1>

          <p className="text-slate-500 mt-3">
            Ya casi terminamos. Completá tus datos para continuar.
          </p>
        </div>

        {/* INDICADOR DE PASOS */}
        <div className="flex items-center max-w-2xl mt-9 mb-10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#20B8A5] text-[#183B4E] flex items-center justify-center">
              <CheckCircle size={19} />
            </div>
            <span className="text-sm font-bold text-[#183B4E]">
              Carrito
            </span>
          </div>

          <div className="flex-1 h-[2px] bg-[#20B8A5] mx-3" />

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#183B4E] text-white flex items-center justify-center font-bold text-sm">
              2
            </div>
            <span className="text-sm font-bold text-[#183B4E]">
              Datos
            </span>
          </div>

          <div className="flex-1 h-[2px] bg-[#D8D4CC] mx-3" />

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-[#E8E3DA] text-slate-500 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <span className="text-sm font-semibold text-slate-400">
              Pago
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* FORMULARIO */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-2 bg-white border border-[#E8E3DA] rounded-3xl p-6 md:p-9 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F7F3] flex items-center justify-center">
                <User size={23} className="text-[#20B8A5]" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#183B4E]">
                  Datos del cliente
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Información para gestionar tu pedido.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* NOMBRE */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-bold text-[#183B4E] mb-2"
                >
                  Nombre completo
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Tu nombre y apellido"
                    className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#183B4E]"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-bold text-[#183B4E] mb-2"
                >
                  Correo electrónico
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="correo@ejemplo.com"
                    className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#183B4E]"
                  />
                </div>
              </div>

              {/* TELÉFONO */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-bold text-[#183B4E] mb-2"
                >
                  Teléfono
                </label>

                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="phone"
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    placeholder="Tu número de teléfono"
                    className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#183B4E]"
                  />
                </div>
              </div>

              {/* DIRECCIÓN */}
              <div>
                <label
                  htmlFor="address"
                  className="block text-sm font-bold text-[#183B4E] mb-2"
                >
                  Dirección de entrega
                </label>

                <div className="relative">
                  <MapPin
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="address"
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleChange}
                    required
                    placeholder="Calle, número, localidad"
                    className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl pl-11 pr-4 py-3.5 text-sm text-[#183B4E]"
                  />
                </div>
              </div>
            </div>

            {/* INFORMACIÓN DE ENTREGA */}
            <div className="mt-8 bg-[#E8F7F3] rounded-2xl p-5 flex gap-3">
              <Truck
                size={23}
                className="text-[#137B6C] shrink-0"
              />

              <div>
                <p className="font-bold text-[#183B4E] text-sm">
                  Información de entrega
                </p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Los detalles y condiciones de entrega se confirmarán
                  durante la gestión de tu pedido.
                </p>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div
                role="alert"
                className="mt-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3 text-sm"
              >
                <AlertCircle size={20} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* BOTÓN */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 bg-[#20B8A5] text-[#183B4E] py-4 rounded-xl font-extrabold flex items-center justify-center gap-2 hover:bg-[#48D2C0] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                "Creando pedido..."
              ) : (
                <>
                  Enviar pedido
                  <ArrowRight size={19} />
                </>
              )}
            </button>

            <p className="text-xs text-slate-400 text-center mt-4">
              Revisá tus datos antes de enviar el pedido.
            </p>
          </form>

          {/* RESUMEN DEL PEDIDO */}
          <aside className="bg-white border border-[#E8E3DA] rounded-3xl p-6 shadow-sm lg:sticky lg:top-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-xl bg-[#E8F7F3] flex items-center justify-center">
                <ShoppingBag
                  size={21}
                  className="text-[#20B8A5]"
                />
              </div>

              <div>
                <h2 className="text-lg font-extrabold text-[#183B4E]">
                  Tu pedido
                </h2>
                <p className="text-xs text-slate-500">
                  {totalItems} unidades
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {cart.map((product) => (
                <div
                  key={product.id}
                  className="flex justify-between gap-3 pb-4 border-b border-[#E8E3DA]"
                >
                  <div className="flex gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-[#E8F7F3] flex items-center justify-center shrink-0">
                      <Package
                        size={21}
                        className="text-[#20B8A5]"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#183B4E]">
                        {product.name}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        Cantidad: {product.quantity}
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        {formatPrice(product.price)} c/u
                      </p>
                    </div>
                  </div>

                  <p className="font-extrabold text-sm text-[#183B4E] whitespace-nowrap">
                    {formatPrice(
                      Number(product.price) * product.quantity
                    )}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-3 mt-6">
              <div className="flex justify-between text-sm text-slate-500">
                <span>Productos</span>
                <span>{totalItems} unidades</span>
              </div>

              <div className="flex justify-between text-sm text-slate-500">
                <span>Subtotal</span>
                <span>{formatPrice(totalPrice)}</span>
              </div>

              <div className="border-t border-[#E8E3DA] pt-4 flex justify-between items-center">
                <span className="font-extrabold text-[#183B4E]">
                  Total estimado
                </span>

                <span className="text-2xl font-extrabold text-[#183B4E]">
                  {formatPrice(totalPrice)}
                </span>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-2 text-xs text-slate-400 leading-relaxed">
              <CreditCard size={17} className="shrink-0" />
              <p>
                El importe definitivo será informado por el backend
                al crear el pedido.
              </p>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#137B6C]">
              <ShieldCheck size={17} />
              Compra protegida
            </div>
          </aside>
        </div>

        {/* VOLVER */}
        <Link
          to="/carrito"
          className="inline-flex items-center gap-2 text-slate-500 mt-9 hover:text-[#183B4E] font-semibold text-sm transition"
        >
          <ArrowLeft size={17} />
          Volver al carrito
        </Link>
      </div>
    </main>
  );
}

export default Checkout;
