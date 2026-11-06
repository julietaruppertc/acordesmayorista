
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  ArrowRight,
  Music2,
  Eye,
  EyeOff,
  Guitar,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import BrandLogo from "../components/BrandLogo.jsx";

function Login() {
  const navigate = useNavigate();
  const { login, loading, error } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const user = await login({ email, password });

console.log("Usuario autenticado:", user);
console.log("Rol del usuario:", user?.rol);

navigate("/");
    } catch {
      // El error se muestra desde useAuth.
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F0E8] flex items-center justify-center p-4 md:p-8">

      <div className="w-full max-w-6xl min-h-[650px] bg-white rounded-[32px] shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">

        {/* PANEL IZQUIERDO */}
        <section className="relative bg-[#183B4E] p-9 md:p-14 flex flex-col justify-between overflow-hidden">

          <div className="absolute w-80 h-80 rounded-full bg-[#20B8A5]/10 -top-32 -right-32" />
          <div className="absolute w-72 h-72 rounded-full bg-[#F07858]/10 -bottom-32 -left-28" />

          <div className="relative z-10">
            <BrandLogo light />
          </div>

          <div className="relative z-10 my-12">
            <div className="inline-flex items-center gap-2 text-[#73E0CF] bg-[#20B8A5]/15 px-4 py-2 rounded-full text-xs font-bold tracking-wider">
              <Sparkles size={15} />
              BIENVENIDO A ACORDES
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-white mt-7 leading-tight">
              Tu pasión por
              <span className="block text-[#20B8A5]">
                la música
              </span>
              comienza acá.
            </h1>

            <p className="text-[#C4D8DE] mt-6 leading-relaxed max-w-md">
              Ingresá a tu cuenta y descubrí instrumentos, accesorios
              y oportunidades para llevar tu música más lejos.
            </p>

            <div className="mt-12 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#20B8A5]/15 flex items-center justify-center">
                <Guitar size={30} className="text-[#20B8A5]" />
              </div>

              <div>
                <p className="text-white font-bold">
                  Encontrá tu sonido
                </p>
                <p className="text-sm text-[#B9D0D6]">
                  Todo lo que necesitás en un solo lugar.
                </p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-xs text-[#9BB7C0]">
            © {new Date().getFullYear()} Acordes Mayorista
          </p>
        </section>

        {/* PANEL DERECHO */}
        <section className="p-8 md:p-14 flex flex-col justify-center">

          <div className="max-w-md w-full mx-auto">

            <div className="mb-10">
              <div className="w-12 h-12 bg-[#E8F7F3] rounded-2xl flex items-center justify-center mb-6">
                <Music2 size={25} className="text-[#20B8A5]" />
              </div>

              <p className="text-xs uppercase tracking-[0.2em] font-extrabold text-[#20B8A5]">
                Mi cuenta
              </p>

              <h2 className="text-3xl font-extrabold text-[#183B4E] mt-2">
                ¡Qué bueno verte!
              </h2>

              <p className="text-slate-500 mt-3">
                Ingresá tus datos para continuar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

              <div>
                <label className="block text-sm font-bold text-[#183B4E] mb-2">
                  Correo electrónico
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#20B8A5]"
                  />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl py-4 pl-12 pr-4 text-sm text-[#183B4E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#183B4E] mb-2">
                  Contraseña
                </label>

                <div className="relative">
                  <Lock
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#20B8A5]"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl py-4 pl-12 pr-12 text-sm text-[#183B4E]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#183B4E]"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#183B4E] text-white py-4 rounded-xl font-bold hover:bg-[#24566D] disabled:opacity-50 flex items-center justify-center gap-3 transition"
              >
                {loading ? "Ingresando..." : "Iniciar sesión"}
                {!loading && <ArrowRight size={19} />}
              </button>

            </form>

            <div className="mt-9 text-center">
              <p className="text-sm text-slate-500">
                ¿Todavía no tenés una cuenta?
              </p>

              <Link
                to="/registro"
                className="inline-block mt-2 text-[#168F80] font-extrabold hover:text-[#183B4E]"
              >
                Crear una cuenta
              </Link>
            </div>

            <Link
              to="/"
              className="block text-center text-sm text-slate-400 mt-8 hover:text-[#183B4E]"
            >
              Volver al inicio
            </Link>

          </div>
        </section>

      </div>
    </div>
  );
}

export default Login;
