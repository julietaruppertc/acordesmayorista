
import { useEffect, useState } from "react";
import {
  Package,
  Plus,
  Minus,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Boxes,
  ArrowLeft,
  ShieldCheck,
  Music2,
} from "lucide-react";
import { Link } from "react-router-dom";

import { getProducts } from "../services/productService";
import { updateProductStock } from "../services/stockService";
import { mockProducts } from "../data/mockProducts";
import BrandLogo from "../components/BrandLogo";

function OperatorStock() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState(null);
  const [usingMocks, setUsingMocks] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await getProducts();
      const productsFromApi = response.data;

      if (!Array.isArray(productsFromApi)) {
        throw new Error("El catálogo no tiene el formato esperado.");
      }

      setProducts(
        productsFromApi.map((product) => ({
          ...product,
          stock: Number(
            product.availableStock ?? product.stock ?? 0
          ),
        }))
      );

      setUsingMocks(false);
    } catch (error) {
      console.warn("No se pudo cargar el inventario:", error);

      setProducts(
        mockProducts.map((product) => ({
          ...product,
          stock: Number(product.stock ?? 0),
          version: 1,
        }))
      );

      setUsingMocks(true);

      showMessage(
        "No se pudo conectar con el backend. Se muestra el inventario de prueba; las modificaciones están deshabilitadas.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const updateStock = async (product, amount) => {
    if (usingMocks) return;

    const currentStock = Number(
      product.availableStock ?? product.stock ?? 0
    );

    const newStock = currentStock + amount;

    if (newStock < 0) return;

    if (!product.id || !Number.isInteger(product.version)) {
      showMessage(
        "No se puede actualizar el producto porque falta su identificador o versión.",
        "error"
      );
      return;
    }

    try {
      setSavingProduct(product.id);
      setMessage("");

      await updateProductStock(
        product.id,
        newStock,
        product.version
      );

      await loadProducts();

      showMessage("Stock actualizado correctamente.", "success");
    } catch (error) {
      console.error("Error al actualizar el stock:", error);

      if (error.response?.status === 409) {
        const errorData = error.response.data;
        const currentVersion = errorData?.details?.currentVersion;

        await loadProducts();

        showMessage(
          `Conflicto 409: otro operador modificó el stock. Se actualizó la información.${
            currentVersion !== undefined
              ? ` Versión actual: ${currentVersion}.`
              : ""
          }`,
          "error"
        );
      } else {
        const errorMessage =
          error.response?.data?.message ||
          "No se pudo actualizar el stock. Intentá nuevamente.";

        showMessage(errorMessage, "error");
      }
    } finally {
      setSavingProduct(null);
    }
  };

  const totalProducts = products.length;

  const totalUnits = products.reduce(
    (total, product) =>
      total + Number(product.availableStock ?? product.stock ?? 0),
    0
  );

  const lowStockProducts = products.filter((product) => {
    const stock = Number(
      product.availableStock ?? product.stock ?? 0
    );
    return stock > 0 && stock <= 5;
  }).length;

  const outOfStockProducts = products.filter((product) => {
    const stock = Number(
      product.availableStock ?? product.stock ?? 0
    );
    return stock === 0;
  }).length;

  return (
    <main className="min-h-screen bg-[#F4F0E8] px-5 py-8 md:px-8 md:py-12">
      <div className="max-w-6xl mx-auto">

        {/* Encabezado */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-10">
          <Link to="/">
            <BrandLogo />
          </Link>

          <div className="flex items-center gap-2 text-sm font-semibold text-[#183B4E]">
            <ShieldCheck size={19} className="text-[#20B8A5]" />
            Panel de operador
          </div>
        </header>

        {/* Título */}
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

          <h1 className="text-3xl md:text-4xl font-extrabold text-[#183B4E] mt-2">
            Gestión de stock
          </h1>

          <p className="text-slate-500 mt-3">
            Administrá las existencias de los instrumentos musicales.
          </p>
        </div>

        {/* Mensajes */}
        {message && (
          <div
            className={`p-4 rounded-2xl mt-6 mb-6 flex items-start gap-3 border ${
              messageType === "success"
                ? "bg-[#E8F7F3] text-[#176B5F] border-[#BFE8DE]"
                : "bg-red-50 text-red-700 border-red-100"
            }`}
          >
            {messageType === "success" ? (
              <CheckCircle size={21} className="shrink-0" />
            ) : (
              <AlertCircle size={21} className="shrink-0" />
            )}

            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {usingMocks && (
          <div className="mt-5 mb-6 text-sm text-amber-800 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <p>
              <strong>Inventario de demostración.</strong> Se muestran
              productos de prueba y no se pueden guardar modificaciones reales.
            </p>
          </div>
        )}

        {/* Indicadores */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 font-medium">
                  Productos
                </p>
                <Package size={21} className="text-[#20B8A5]" />
              </div>
              <p className="text-3xl font-extrabold text-[#183B4E] mt-3">
                {totalProducts}
              </p>
            </div>

            <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 font-medium">
                  Unidades totales
                </p>
                <Boxes size={21} className="text-[#20B8A5]" />
              </div>
              <p className="text-3xl font-extrabold text-[#183B4E] mt-3">
                {totalUnits}
              </p>
            </div>

            <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 font-medium">
                  Stock bajo
                </p>
                <AlertCircle size={21} className="text-[#F07858]" />
              </div>
              <p className="text-3xl font-extrabold text-[#F07858] mt-3">
                {lowStockProducts}
              </p>
            </div>

            <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500 font-medium">
                  Sin stock
                </p>
                <Package size={21} className="text-red-500" />
              </div>
              <p className="text-3xl font-extrabold text-red-500 mt-3">
                {outOfStockProducts}
              </p>
            </div>
          </div>
        )}

        {/* Inventario */}
        <section className="bg-white rounded-3xl border border-[#E8E3DA] overflow-hidden shadow-sm">

          <div className="p-6 md:p-7 border-b border-[#E8E3DA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#E8F7F3] rounded-xl flex items-center justify-center">
                <Package size={25} className="text-[#20B8A5]" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#183B4E]">
                  Inventario de productos
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Controlá las unidades disponibles.
                </p>
              </div>
            </div>

            <button
              onClick={loadProducts}
              disabled={loading || savingProduct !== null}
              className="flex items-center justify-center gap-2 bg-[#E8F7F3] text-[#183B4E] px-4 py-3 rounded-xl font-bold text-sm hover:bg-[#D7F1EA] transition disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Actualizar inventario
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-9 h-9 border-4 border-[#20B8A5] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 mt-4 font-medium">
                Cargando inventario...
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={42} className="mx-auto text-slate-300" />
              <p className="text-slate-500 mt-4">
                No hay productos para mostrar.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0ECE5]">
              {products.map((product) => {
                const stock = Number(
                  product.availableStock ?? product.stock ?? 0
                );

                const saving = savingProduct === product.id;

                return (
                  <div
                    key={product.id}
                    className="p-5 md:px-7 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:bg-[#FAF9F6] transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#F4F0E8] flex items-center justify-center shrink-0">
                        <Music2 size={23} className="text-[#183B4E]" />
                      </div>

                      <div>
                        <p className="text-xs uppercase text-[#20B8A5] font-extrabold tracking-wider">
                          {product.category}
                        </p>

                        <h3 className="font-extrabold text-[#183B4E] mt-1">
                          {product.name}
                        </h3>

                        <p className="text-xs text-slate-400 mt-2">
                          Versión: {product.version ?? "No disponible"}
                        </p>

                        <span
                          className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                            stock === 0
                              ? "bg-red-50 text-red-600"
                              : stock <= 5
                              ? "bg-orange-50 text-orange-600"
                              : "bg-[#E8F7F3] text-[#187968]"
                          }`}
                        >
                          {stock === 0
                            ? "Sin stock"
                            : stock <= 5
                            ? "Stock bajo"
                            : "Disponible"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-5">
                      <button
                        onClick={() => updateStock(product, -1)}
                        disabled={
                          usingMocks ||
                          stock <= 0 ||
                          saving ||
                          loading
                        }
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-[#E8E3DA] text-[#183B4E] hover:bg-[#F4F0E8] disabled:opacity-30 disabled:cursor-not-allowed transition"
                        aria-label={`Disminuir stock de ${product.name}`}
                      >
                        <Minus size={18} />
                      </button>

                      <div className="text-center min-w-16">
                        <p className="text-3xl font-extrabold text-[#183B4E]">
                          {stock}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          Unidades
                        </p>
                      </div>

                      <button
                        onClick={() => updateStock(product, 1)}
                        disabled={
                          usingMocks ||
                          saving ||
                          loading
                        }
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#183B4E] text-white hover:bg-[#24566D] disabled:opacity-30 disabled:cursor-not-allowed transition"
                        aria-label={`Aumentar stock de ${product.name}`}
                      >
                        <Plus size={18} />
                      </button>

                      {saving && (
                        <span className="text-xs text-slate-500 font-semibold">
                          Guardando...
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <footer className="text-center text-sm text-slate-400 mt-10">
          © Acordes Mayorista · Panel de administración
        </footer>
      </div>
    </main>
  );
}

export default OperatorStock;
