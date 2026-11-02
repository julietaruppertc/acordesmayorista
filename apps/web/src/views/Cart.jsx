
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Music2,
  ArrowLeft,
  Package,
  ArrowRight,
} from "lucide-react";

import { useCart } from "../context/CartContext";
import BrandLogo from "../components/BrandLogo";

function Cart() {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    totalItems,
    totalPrice,
  } = useCart();

  return (
    <main className="min-h-screen bg-[#F4F0E8] px-4 sm:px-6 py-10">

      <div className="max-w-5xl mx-auto">

        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-9">

          <div>
            <Link to="/" className="inline-block mb-5">
              <BrandLogo />
            </Link>

            <p className="text-[#168F80] font-bold uppercase tracking-[0.2em] text-xs">
              Tu selección musical
            </p>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#183B4E] mt-2">
              Mi carrito
            </h1>

            <p className="text-[#71818A] mt-2">
              Revisá tus productos antes de continuar con tu compra.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-[#E8E3DA] shadow-sm">
            <div className="w-11 h-11 rounded-xl bg-[#E8F7F3] flex items-center justify-center">
              <ShoppingCart size={22} className="text-[#168F80]" />
            </div>

            <div>
              <p className="text-xs text-[#91A0A7] font-medium">
                Productos
              </p>
              <p className="text-lg font-extrabold text-[#183B4E]">
                {totalItems} unidades
              </p>
            </div>
          </div>

        </div>

        {/* Carrito vacío */}
        {cart.length === 0 ? (
          <div className="bg-white rounded-[28px] border border-[#E8E3DA] p-10 sm:p-16 text-center shadow-sm">

            <div className="w-24 h-24 rounded-full bg-[#E8F7F3] flex items-center justify-center mx-auto">
              <ShoppingBag size={43} className="text-[#20B8A5]" />
            </div>

            <h2 className="text-2xl font-extrabold text-[#183B4E] mt-7">
              Tu carrito está vacío
            </h2>

            <p className="text-[#71818A] mt-3 max-w-sm mx-auto">
              Todavía no agregaste ningún instrumento. Explorá nuestro
              catálogo y encontrá lo que estás buscando.
            </p>

            <Link
              to="/#catalogo"
              className="inline-flex items-center justify-center gap-2 mt-8 bg-[#183B4E] text-white px-7 py-3.5 rounded-xl font-bold hover:bg-[#24566D] transition"
            >
              <ShoppingBag size={19} />
              Explorar catálogo
              <ArrowRight size={18} />
            </Link>

          </div>
        ) : (

          <>
            {/* Lista de productos */}
            <div className="space-y-4">

              {cart.map((product) => (
                <article
                  key={product.id}
                  className="bg-white rounded-[24px] border border-[#E8E3DA] p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-5 shadow-sm hover:shadow-md transition-shadow"
                >

                  {/* Imagen / ícono */}
                  <div className="w-full md:w-28 h-28 bg-[#E8F7F3] rounded-2xl flex items-center justify-center shrink-0">
                    <Music2 size={43} className="text-[#183B4E]" />
                  </div>

                  {/* Información */}
                  <div className="flex-1 min-w-0">

                    <p className="text-xs uppercase tracking-wider text-[#168F80] font-bold">
                      {product.category}
                    </p>

                    <h2 className="text-lg font-extrabold text-[#183B4E] mt-1">
                      {product.name}
                    </h2>

                    <p className="text-[#71818A] text-sm mt-2">
                      ${Number(product.price).toLocaleString("es-AR")} por unidad
                    </p>

                    <button
                      onClick={() => removeFromCart(product.id)}
                      className="text-[#E0644B] text-sm font-semibold flex items-center gap-1.5 mt-3 hover:text-[#B84330] transition"
                    >
                      <Trash2 size={16} />
                      Eliminar producto
                    </button>

                  </div>

                  {/* Cantidad */}
                  <div className="flex items-center gap-3">

                    <button
                      onClick={() =>
                        updateQuantity(product.id, product.quantity - 1)
                      }
                      disabled={product.quantity <= 1}
                      className="w-9 h-9 border border-[#E8E3DA] rounded-xl flex items-center justify-center text-[#183B4E] hover:bg-[#E8F7F3] hover:border-[#20B8A5] disabled:opacity-30 transition"
                    >
                      <Minus size={17} />
                    </button>

                    <span className="font-extrabold text-[#183B4E] w-7 text-center">
                      {product.quantity}
                    </span>

                    <button
                      onClick={() =>
                        updateQuantity(product.id, product.quantity + 1)
                      }
                      disabled={product.quantity >= Number(product.stock)}
                      className="w-9 h-9 border border-[#E8E3DA] rounded-xl flex items-center justify-center text-[#183B4E] hover:bg-[#E8F7F3] hover:border-[#20B8A5] disabled:opacity-30 transition"
                    >
                      <Plus size={17} />
                    </button>

                  </div>

                  {/* Subtotal */}
                  <div className="md:text-right md:min-w-[130px] border-t md:border-t-0 pt-4 md:pt-0 border-[#F0EDE7]">

                    <p className="text-sm text-[#91A0A7]">
                      Subtotal
                    </p>

                    <p className="text-xl font-extrabold text-[#183B4E]">
                      ${(Number(product.price) * product.quantity).toLocaleString("es-AR")}
                    </p>

                  </div>

                </article>
              ))}

            </div>

            {/* Resumen de compra */}
            <div className="bg-white rounded-[28px] border border-[#E8E3DA] p-6 sm:p-8 mt-8 shadow-sm">

              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-[#E8F7F3] flex items-center justify-center">
                  <Package size={22} className="text-[#168F80]" />
                </div>

                <div>
                  <h2 className="text-lg font-extrabold text-[#183B4E]">
                    Resumen de compra
                  </h2>
                  <p className="text-xs text-[#91A0A7]">
                    Detalle de tu pedido
                  </p>
                </div>
              </div>

              <div className="flex justify-between text-[#71818A] py-3">
                <span>Unidades totales</span>
                <span className="font-semibold text-[#183B4E]">
                  {totalItems}
                </span>
              </div>

              <div className="flex justify-between items-center mt-3 pt-5 border-t border-[#E8E3DA]">

                <span className="text-lg font-extrabold text-[#183B4E]">
                  Total de la compra
                </span>

                <span className="text-2xl sm:text-3xl font-extrabold text-[#168F80]">
                  ${totalPrice.toLocaleString("es-AR")}
                </span>

              </div>

              {/* Acciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-7">

                <Link
                  to="/#catalogo"
                  className="flex items-center justify-center gap-2 border-2 border-[#183B4E] text-[#183B4E] py-3.5 rounded-xl font-bold hover:bg-[#E8F7F3] transition"
                >
                  <ArrowLeft size={18} />
                  Seguir comprando
                </Link>

                <Link
                  to="/checkout"
                  className="flex items-center justify-center gap-2 bg-[#183B4E] text-white py-3.5 rounded-xl font-bold hover:bg-[#24566D] transition shadow-md shadow-[#183B4E]/10"
                >
                  Continuar con la compra
                  <ArrowRight size={18} />
                </Link>

              </div>

              <p className="text-center text-xs text-[#91A0A7] mt-5">
                Gracias por elegir Acordes Mayorista.
              </p>

            </div>

          </>
        )}

      </div>

    </main>
  );
}

export default Cart;
