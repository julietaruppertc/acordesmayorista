
import { Routes, Route, Link, Navigate, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  UserRound,
  LogOut,
  ArrowRight,
  Music2,
  Guitar,
  Sparkles,
  Headphones,
} from "lucide-react";

import Login from "./views/Login.jsx";
import Register from "./views/Register.jsx";
import Catalog from "./views/Catalog.jsx";
import Cart from "./views/Cart.jsx";
import Checkout from "./views/Checkout.jsx";
import Payment from "./views/Payment.jsx";
import OperatorStock from "./views/OperatorStock.jsx";
import WholesaleManagement from "./views/WholesaleManagement.jsx";
import WholesaleStatus from "./views/WholesaleStatus.jsx";

import BrandLogo from "./components/BrandLogo.jsx";
import { useAuthContext } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./hooks/useAuth";

function Home() {
  const { user } = useAuthContext();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-[#F4F0E8]">

      {/* ENCABEZADO */}
      <header className="bg-white border-b border-[#E8E3DA] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-4">

          <Link to="/">
            <BrandLogo />
          </Link>

          <nav className="flex items-center gap-6 flex-wrap text-sm font-semibold text-[#183B4E]">
            <Link to="/" className="hover:text-[#20B8A5]">
              Inicio
            </Link>

            <a href="#catalogo" className="hover:text-[#20B8A5]">
              Catálogo
            </a>

            {user ? (
              <>
                <span className="text-xs text-[#64808C]">
                  {user.email}
                </span>

                {user.rol === "operador" && (
                  <>
                    <Link to="/operador/stock" className="hover:text-[#20B8A5]">
                      Gestión de stock
                    </Link>

                    <Link to="/operador/usuarios" className="hover:text-[#20B8A5]">
                      Gestión de usuarios
                    </Link>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 hover:text-[#F07858]"
                >
                  <LogOut size={17} />
                  Salir
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="hover:text-[#20B8A5]"
              >
                Mi cuenta
              </Link>
            )}
          </nav>

          <Link
            to="/carrito"
            className="relative p-3 bg-[#E8F7F3] rounded-xl text-[#183B4E] hover:bg-[#D5F1EA]"
          >
            <ShoppingCart size={22} />
          </Link>
        </div>
      </header>

      {/* PORTADA */}
      <main className="max-w-7xl mx-auto px-6 py-10">

        <section className="relative overflow-hidden rounded-[32px] bg-[#183B4E] min-h-[480px] flex items-center">

          <div className="absolute w-96 h-96 bg-[#20B8A5] opacity-20 rounded-full -right-20 -top-24" />
          <div className="absolute w-72 h-72 bg-[#F07858] opacity-20 rounded-full right-40 -bottom-40" />

          <div className="relative z-10 max-w-2xl p-10 md:p-16">

            <div className="inline-flex items-center gap-2 bg-[#20B8A5]/20 text-[#73E0CF] px-4 py-2 rounded-full text-xs font-bold tracking-widest mb-8">
              <Sparkles size={15} />
              TU MUNDO MUSICAL
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight">
              La música
              <span className="block text-[#20B8A5]">
                empieza acá.
              </span>
            </h1>

            <p className="text-[#D8E6E9] text-lg mt-6 leading-relaxed max-w-lg">
              Encontrá instrumentos, accesorios y equipamiento musical
              para llevar tu pasión al siguiente nivel.
            </p>

            <div className="flex flex-wrap gap-4 mt-9">
              <a
                href="#catalogo"
                className="inline-flex items-center gap-3 bg-[#20B8A5] text-[#183B4E] px-7 py-4 rounded-xl font-extrabold hover:bg-[#48D2C0] transition"
              >
                Explorar catálogo
                <ArrowRight size={19} />
              </a>

              <Link
                to="/registro"
                className="inline-flex items-center px-7 py-4 rounded-xl border border-white/30 text-white font-bold hover:bg-white/10 transition"
              >
                Crear cuenta
              </Link>
            </div>
          </div>

          <div className="hidden lg:flex absolute right-20 top-1/2 -translate-y-1/2 items-center justify-center">
            <div className="w-64 h-64 rounded-full border border-[#20B8A5]/40 flex items-center justify-center">
              <div className="w-48 h-48 rounded-full bg-[#20B8A5]/10 flex items-center justify-center">
                <Music2 size={120} strokeWidth={1} className="text-[#20B8A5]" />
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORÍAS DESTACADAS */}
        <section className="mt-16">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-[#20B8A5] font-extrabold text-xs tracking-widest uppercase">
                Explorá nuestra tienda
              </p>
              <h2 className="text-3xl font-extrabold text-[#183B4E] mt-2">
                Encontrá tu sonido
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">

            <div className="bg-white rounded-2xl p-7 border border-[#E8E3DA] hover:border-[#20B8A5] transition">
              <Guitar size={32} className="text-[#20B8A5]" />
              <h3 className="font-extrabold text-xl text-[#183B4E] mt-5">
                Instrumentos
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Guitarras, bajos y mucho más.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-7 border border-[#E8E3DA] hover:border-[#20B8A5] transition">
              <Music2 size={32} className="text-[#F07858]" />
              <h3 className="font-extrabold text-xl text-[#183B4E] mt-5">
                Teclados y percusión
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Ritmo y melodía para todos.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-7 border border-[#E8E3DA] hover:border-[#20B8A5] transition">
              <Headphones size={32} className="text-[#20B8A5]" />
              <h3 className="font-extrabold text-xl text-[#183B4E] mt-5">
                Audio y accesorios
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                Todo para completar tu equipo.
              </p>
            </div>

          </div>
        </section>

        {/* CATÁLOGO */}
        <section id="catalogo" className="mt-20 scroll-mt-28">
          <div className="mb-8">
            <p className="text-[#20B8A5] font-extrabold text-xs tracking-widest uppercase">
              Nuestros productos
            </p>
            <h2 className="text-3xl font-extrabold text-[#183B4E] mt-2">
              Catálogo musical
            </h2>
            <p className="text-slate-500 mt-2">
              Descubrí todos nuestros instrumentos y productos.
            </p>
          </div>

          <Catalog />
        </section>

        {/* PIE DE PÁGINA */}
        <footer className="mt-20 bg-[#183B4E] rounded-3xl p-8 md:p-10 text-white">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div>
              <BrandLogo light />
              <p className="text-[#B9D0D6] text-sm mt-5 max-w-sm">
                Conectamos personas con su pasión por la música.
                Encontrá todo lo que necesitás en un solo lugar.
              </p>
            </div>

            <div className="text-sm text-[#B9D0D6]">
              <p className="font-bold text-white mb-3">ACORDES MAYORISTA</p>
              <p>Instrumentos musicales</p>
              <p className="mt-2">Tu música, tu identidad.</p>
            </div>
          </div>

          <div className="border-t border-white/15 mt-8 pt-6 text-xs text-[#B9D0D6]">
            © {new Date().getFullYear()} Acordes Mayorista. Todos los derechos reservados.
          </div>
        </footer>
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/carrito" element={<Cart />} />
        <Route path="/solicitud-pendiente" element={<WholesaleStatus />} />
        <Route path="/solicitud-rechazada" element={<WholesaleStatus />} />
      </Route>

      <Route element={<ProtectedRoute requireApprovedWholesale />}>
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/pago" element={<Payment />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={["operador"]} />}>
        <Route path="/operador/stock" element={<OperatorStock />} />
        <Route path="/operador/usuarios" element={<WholesaleManagement />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
