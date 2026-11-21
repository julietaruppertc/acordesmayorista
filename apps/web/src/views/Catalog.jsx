
import { useMemo, useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  Package,
  SlidersHorizontal,
  CheckCircle,
  AlertCircle,
  X,
  ArrowDownWideNarrow,
} from "lucide-react";

import { useProducts } from "../hooks/useProducts";
import { useCart } from "../context/CartContext";

const categoryCards = [
  {
    name: "Guitarras",
    image:
      "https://images.unsplash.com/photo-1510915361894-db8b60106cb1?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Teclados",
    image:
      "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Percusión",
    image:
      "https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Cuerdas",
    image:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Vientos",
    image:
      "https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=900&q=85",
  },
  {
    name: "Audio",
    label: "Audio y accesorios",
    image:
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=85",
  },
];

function Catalog() {
  const { products, loading, error } = useProducts();
  const { addToCart } = useCart();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todas");
  const [availability, setAvailability] = useState("Todos");
  const [sortPrice, setSortPrice] = useState("default");
  const [notification, setNotification] = useState(null);

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesSearch =
        product.name?.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === "Todas" || product.category === category;

      const stock = Number(
        product.stock ?? product.availableStock ?? 0
      );

      const matchesAvailability =
        availability === "Todos" ||
        (availability === "Disponible" && stock > 0) ||
        (availability === "Sin stock" && stock <= 0);

      return matchesSearch && matchesCategory && matchesAvailability;
    });

    if (sortPrice === "menor") {
      result = [...result].sort(
        (a, b) => Number(a.price) - Number(b.price)
      );
    }

    if (sortPrice === "mayor") {
      result = [...result].sort(
        (a, b) => Number(b.price) - Number(a.price)
      );
    }

    return result;
  }, [products, search, category, availability, sortPrice]);

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [notification]);

  const formatPrice = (price) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(price) || 0);

  const handleAddToCart = (product) => {
    const stock = Number(
      product.stock ?? product.availableStock ?? 0
    );

    if (stock <= 0) return;

    addToCart(product);

    setNotification({
      id: Date.now(),
      name: product.name,
    });
  };

  const handleCategory = (selectedCategory) => {
    setCategory(selectedCategory);

    setTimeout(() => {
      document.getElementById("productos")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("Todas");
    setAvailability("Todos");
    setSortPrice("default");
  };

  const hasFilters =
    search !== "" ||
    category !== "Todas" ||
    availability !== "Todos" ||
    sortPrice !== "default";

  return (
    <>
      <section>

        {/* ENCABEZADO DEL CATÁLOGO */}
        <div className="mb-9">
          

          <h1 className="text-3xl md:text-4xl font-extrabold text-[#183B4E] mt-2">
            Instrumentos musicales
          </h1>

          <p className="text-slate-500 mt-3 max-w-2xl">
            Descubrí nuestra selección de instrumentos, accesorios
            y equipamiento musical para encontrar tu próximo sonido.
          </p>
        </div>

        {/* CATEGORÍAS VISUALES */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold text-[#183B4E]">
                Explorá por categoría
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Elegí lo que estás buscando.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {categoryCards.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => handleCategory(item.name)}
                aria-pressed={category === item.name}
                className={`group relative h-40 sm:h-48 md:h-56 overflow-hidden rounded-2xl text-left border-2 transition-all duration-300 ${
                  category === item.name
                    ? "border-[#20B8A5] ring-2 ring-[#20B8A5]/20"
                    : "border-transparent hover:border-[#20B8A5]"
                }`}
              >
                <img
                  src={item.image}
                  alt={item.label || item.name}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-[#102D3B]/90 via-[#183B4E]/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <h3 className="text-white text-lg md:text-xl font-extrabold">
                    {item.label || item.name}
                  </h3>

                  <span className="inline-flex items-center gap-2 text-[#73E0CF] text-xs md:text-sm font-bold mt-2">
                    Ver productos
                    <span className="transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* BUSCADOR Y FILTROS */}
        <div className="bg-white rounded-3xl border border-[#E8E3DA] p-5 md:p-7 mb-8 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <SlidersHorizontal
              size={19}
              className="text-[#20B8A5]"
            />

            <h3 className="font-bold text-[#183B4E]">
              
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            <div className="relative">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar instrumentos..."
                className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl pl-11 pr-4 py-3 text-sm text-[#183B4E] outline-none focus:border-[#20B8A5]"
              />
            </div>

            <select
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
              className="bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl px-4 py-3 text-sm text-[#183B4E] outline-none focus:border-[#20B8A5]"
            >
              <option value="Todos">Todos los productos</option>
              <option value="Disponible">Disponibles</option>
              <option value="Sin stock">Sin stock</option>
            </select>

            <div className="relative">
              <ArrowDownWideNarrow
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />

              <select
                value={sortPrice}
                onChange={(event) => setSortPrice(event.target.value)}
                className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl pl-11 pr-4 py-3 text-sm text-[#183B4E] outline-none focus:border-[#20B8A5]"
              >
                <option value="default">Ordenar por precio</option>
                <option value="menor">Menor a mayor</option>
                <option value="mayor">Mayor a menor</option>
              </select>
            </div>

          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm font-bold text-[#F07858] hover:underline mt-4"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* RESULTADOS */}
        <div
          id="productos"
          className="scroll-mt-28 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6"
        >
          <div>
            <p className="text-[#20B8A5] font-extrabold text-xs tracking-widest uppercase">
              Nuestra selección
            </p>

            <h2 className="text-2xl md:text-3xl font-extrabold text-[#183B4E] mt-1">
              {category === "Todas" ? "Todos los productos" : category}
            </h2>
          </div>

          <p className="text-sm text-slate-500">
            {loading
              ? "Cargando productos..."
              : `${filteredProducts.length} productos encontrados`}
          </p>
        </div>

        {error && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3 text-amber-800 text-sm">
            <AlertCircle size={19} className="shrink-0" />
            No se pudo conectar con el servidor. Estamos mostrando
            los productos de demostración.
          </div>
        )}

        {/* PRODUCTOS */}
        {loading && products.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            Cargando catálogo...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#E8E3DA]">
            <Package
              size={42}
              className="mx-auto text-[#20B8A5]"
            />

            <h3 className="font-bold text-xl text-[#183B4E] mt-4">
              No encontramos productos
            </h3>

            <p className="text-slate-500 mt-2">
              Probá modificando tu búsqueda o los filtros.
            </p>

            {category !== "Todas" && (
              <button
                type="button"
                onClick={() => setCategory("Todas")}
                className="mt-5 bg-[#20B8A5] text-[#183B4E] px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#48D2C0]"
              >
                Ver todos los productos
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const stock = Number(
                product.stock ?? product.availableStock ?? 0
              );

              const isAvailable = stock > 0;

              return (
                <article
                  key={product.id}
                  className="product-card overflow-hidden flex flex-col"
                >
                  <div className="h-48 bg-[#F4F0E8] flex items-center justify-center relative overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <Package
                        size={65}
                        strokeWidth={1}
                        className="text-[#20B8A5]"
                      />
                    )}

                    <span className="absolute top-4 left-4 bg-white px-3 py-1 rounded-full text-xs font-bold text-[#183B4E]">
                      {product.category || "Instrumentos"}
                    </span>

                    <span
                      className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold ${
                        isAvailable
                          ? "bg-[#D8F5EF] text-[#137B6C]"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {isAvailable ? "Disponible" : "Sin stock"}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-lg font-extrabold text-[#183B4E] leading-snug">
                      {product.name}
                    </h3>

                    <p className="text-sm text-slate-500 mt-2 leading-relaxed flex-1">
                      {product.description}
                    </p>

                    <div className="mt-5 pt-4 border-t border-[#E8E3DA]">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        Precio
                      </p>

                      <p className="text-2xl font-extrabold text-[#183B4E] mt-1">
                        {formatPrice(product.price)}
                      </p>

                      <p className="text-xs text-slate-400 mt-2">
                        {isAvailable
                          ? `${stock} unidades disponibles`
                          : "Consultar disponibilidad"}
                      </p>

                      <button
                        onClick={() => handleAddToCart(product)}
                        disabled={!isAvailable}
                        className={`w-full mt-4 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition ${
                          isAvailable
                            ? "bg-[#20B8A5] text-[#183B4E] hover:bg-[#48D2C0]"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                        }`}
                      >
                        {isAvailable ? (
                          <>
                            <ShoppingCart size={17} />
                            Agregar al carrito
                          </>
                        ) : (
                          <>
                            <CheckCircle size={17} />
                            No disponible
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* NOTIFICACIÓN FLOTANTE */}
      {notification && (
        <div
          key={notification.id}
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[9999] w-[calc(100%-3rem)] max-w-sm rounded-2xl border border-[#B8E9DD] bg-white p-4 shadow-2xl flex items-start gap-3"
        >
          <div className="w-11 h-11 rounded-full bg-[#D8F5EF] flex items-center justify-center shrink-0">
            <CheckCircle
              size={25}
              className="text-[#137B6C]"
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-extrabold text-[#137B6C]">
              ¡Agregado!
            </p>

            <p className="text-sm text-slate-600 mt-1 break-words">
              {notification.name} se agregó al carrito correctamente.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setNotification(null)}
            aria-label="Cerrar notificación"
            className="text-slate-400 hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}

export default Catalog;
