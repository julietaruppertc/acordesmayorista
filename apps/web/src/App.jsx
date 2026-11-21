
import { useState } from "react";
import {
  Routes,
  Route,
  Link,
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
} from "react-router-dom";

import {
  ShoppingCart,
  LogOut,
  Menu,
  X,
  UserRound,
  Package,
  Users,
  ClipboardList,
  Home as HomeIcon,
} from "lucide-react";

import Login from "./views/Login.jsx";

import Catalog from "./views/Catalog.jsx";
import Cart from "./views/Cart.jsx";
import Checkout from "./views/Checkout.jsx";
import OrderManagement from "./views/OrderManagement.jsx";
import Payment from "./views/Payment.jsx";
import OperatorStock from "./views/OperatorStock.jsx";
import WholesaleManagement from "./views/WholesaleManagement.jsx";
import WholesaleStatus from "./views/WholesaleStatus.jsx";

import { useCart } from "./context/CartContext";
import BrandLogo from "./components/BrandLogo.jsx";
import { useAuthContext } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./hooks/useAuth";

/* MENÚ DE NAVEGACIÓN COMPARTIDO */
function Navbar() {
  const { user } = useAuthContext();
  const { logout } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  // Ocultar enlaces de autenticación en Login/Registro
  const isAuthPage = location.pathname === "/login";

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="bg-white border-b border-[#E8E3DA] sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between gap-4">

          {/* LOGO */}
          <Link to="/" onClick={closeMenu} className="shrink-0">
            <BrandLogo />
          </Link>

          {/* MENÚ ESCRITORIO */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold text-[#183B4E]">

            <Link to="/" className="hover:text-[#20B8A5] transition">
              Inicio
            </Link>

            <Link to="/#catalogo" className="hover:text-[#20B8A5] transition">
              Catálogo
            </Link>

            {user ? (
              <>
                {user.rol === "operador" && (
                  <Link
                    to="/operador/stock"
                    className="hover:text-[#20B8A5] transition"
                  >
                    Gestión de stock
                  </Link>
                )}

                {user.rol === "admin" && (
                  <>
                    <Link
                      to="/operador/stock"
                      className="hover:text-[#20B8A5] transition"
                    >
                      Gestión de stock
                    </Link>

                    <Link
                      to="/operador/usuarios"
                      className="hover:text-[#20B8A5] transition"
                    >
                      Gestión de usuarios
                    </Link>

                    <Link
                      to="/admin/pedidos"
                      className="hover:text-[#20B8A5] transition"
                    >
                      Gestión de pedidos
                    </Link>
                  </>
                )}

                <span className="text-xs text-[#64808C] max-w-[150px] truncate">
                  {user.email}
                </span>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 hover:text-[#F07858] transition"
                >
                  <LogOut size={17} />
                  Salir
                </button>
              </>
            ) : (
              !isAuthPage && (
                <>
                  <Link
                    to="/login"
                    className="hover:text-[#20B8A5] transition"
                  >
                    Iniciar sesión
                  </Link>

                  <Link
                    to="/login"
                    className="hover:text-[#20B8A5] transition"
                  >
                    Registrarse
                  </Link>
                </>
              )
            )}
          </nav>

          {/* ACCIONES */}
          <div className="flex items-center gap-3">

            <Link
              to="/carrito"
              onClick={closeMenu}
              aria-label="Ir al carrito"
              className="relative p-3 bg-[#E8F7F3] rounded-xl text-[#183B4E] hover:bg-[#D5F1EA] transition"
            >
              <ShoppingCart size={22} />

              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-5 h-5 px-1 bg-[#F07858] text-white text-xs font-extrabold rounded-full">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* BOTÓN MENÚ CELULAR */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-3 rounded-xl bg-[#183B4E] text-white hover:bg-[#24566D] transition"
              aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* MENÚ CELULAR */}
        {menuOpen && (
          <nav className="lg:hidden mt-4 pt-4 border-t border-[#E8E3DA] flex flex-col gap-1 text-sm font-semibold text-[#183B4E]">

            <Link
              to="/"
              onClick={closeMenu}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#E8F7F3]"
            >
              <HomeIcon size={18} />
              Inicio
            </Link>

            <Link
              to="/#catalogo"
              onClick={closeMenu}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#E8F7F3]"
            >
              <Package size={18} />
              Catálogo
            </Link>

            {user ? (
              <>
                <div className="px-3 py-2 text-xs text-[#64808C] break-all">
                  {user.email}
                </div>

                {user.rol === "operador" && (
                  <Link
                    to="/operador/stock"
                    onClick={closeMenu}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#E8F7F3]"
                  >
                    <Package size={18} />
                    Gestión de stock
                  </Link>
                )}

                {user.rol === "admin" && (
                  <>
                    <Link
                      to="/operador/stock"
                      onClick={closeMenu}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#E8F7F3]"
                    >
                      <Package size={18} />
                      Gestión de stock
                    </Link>

                    <Link
                      to="/operador/usuarios"
                      onClick={closeMenu}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#E8F7F3]"
                    >
                      <Users size={18} />
                      Gestión de usuarios
                    </Link>

                    <Link
                      to="/admin/pedidos"
                      onClick={closeMenu}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#E8F7F3]"
                    >
                      <ClipboardList size={18} />
                      Gestión de pedidos
                    </Link>
                  </>
                )}

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 p-3 rounded-xl text-[#F07858] hover:bg-red-50 text-left"
                >
                  <LogOut size={18} />
                  Cerrar sesión
                </button>
              </>
            ) : (
              !isAuthPage && (
                <>
                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#E8F7F3]"
                  >
                    <UserRound size={18} />
                    Iniciar sesión
                  </Link>

                  <Link
                    to="/login"
                    onClick={closeMenu}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#E8F7F3]"
                  >
                    <UserRound size={18} />
                    Registrarse
                  </Link>
                </>
              )
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

/* DISEÑO GENERAL PARA TODAS LAS PÁGINAS */
function Layout() {
  return (
    <div className="min-h-screen bg-[#F4F0E8]">
      <Navbar />
      <Outlet />
    </div>
  );
}

/* PÁGINA PRINCIPAL */
function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 py-10">
      <section id="catalogo" className="scroll-mt-28">
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
            <p className="font-bold text-white mb-3">
              ACORDES MAYORISTA
            </p>

            <p>Instrumentos musicales</p>
            <p className="mt-2">Tu música, tu identidad.</p>
          </div>
        </div>

        <div className="border-t border-white/15 mt-8 pt-6 text-xs text-[#B9D0D6]">
          © {new Date().getFullYear()} Acordes Mayorista. Todos los derechos reservados.
        </div>
      </footer>
    </main>
  );
}

/* RUTAS */
function App() {
  return (
    <Routes>
      {/* TODAS LAS PÁGINAS COMPARTEN EL MENÚ */}
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/carrito" element={<Cart />} />
          <Route path="/solicitud-pendiente" element={<WholesaleStatus />} />
          <Route path="/solicitud-rechazada" element={<WholesaleStatus />} />
        </Route>

        <Route element={<ProtectedRoute requireApprovedWholesale />}>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pago" element={<Payment />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["operador", "admin"]} />}>
          <Route path="/operador/stock" element={<OperatorStock />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/operador/usuarios" element={<WholesaleManagement />} />
          <Route path="/admin/pedidos" element={<OrderManagement />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
