
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  FileText,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Music2,
  UserRound,
  Store,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import BrandLogo from "../components/BrandLogo";

function Register() {
  const navigate = useNavigate();
  const { register, loading, error } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isWholesale, setIsWholesale] = useState(false);
  const [cuit, setCuit] = useState("");
  const [success, setSuccess] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");

    if (isWholesale && !/^\d{11}$/.test(cuit)) {
      setValidationError("El CUIT debe tener exactamente 11 dígitos.");
      return;
    }

    if (password.length < 8) {
      setValidationError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    const userData = {
      email: email.trim(),
      password,
      rol: "cliente",
      ...(isWholesale ? { cuit } : {}),
    };

    try {
      await register(userData);

      setSuccess(
        isWholesale
          ? "¡Solicitud enviada! Tu cuenta mayorista quedó pendiente de aprobación. Te avisaremos cuando sea revisada."
          : "¡Tu cuenta particular fue creada exitosamente!"
      );

      setTimeout(() => navigate("/login"), 3500);
    } catch {
      // El error se muestra desde useAuth.
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F0E8] flex items-center justify-center p-4 md:p-8">

      {/* MISMO CONTENEDOR EXTERIOR QUE LOGIN */}
      <div className="w-full max-w-6xl min-h-[650px] md:h-[650px] bg-white rounded-[32px] shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">

        {/* PANEL IZQUIERDO */}
        <section className="relative bg-[#183B4E] p-9 md:p-14 flex flex-col justify-between overflow-hidden">

          <div className="absolute w-80 h-80 rounded-full bg-[#20B8A5]/10 -top-32 -right-32" />
          <div className="absolute w-72 h-72 rounded-full bg-[#F07858]/10 -bottom-32 -left-28" />

          <div className="relative z-10">
            <BrandLogo light />
          </div>

          <div className="relative z-10 my-12">
            <div className="w-16 h-16 rounded-2xl bg-[#20B8A5] flex items-center justify-center mb-8">
              <Music2 size={34} className="text-[#183B4E]" />
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
              Encontrá tu ritmo.
              <span className="block text-[#20B8A5]">
                Nosotros ponemos los acordes.
              </span>
            </h1>

            <p className="text-base text-[#D8F5EF] leading-relaxed max-w-md">
              Creá tu cuenta y descubrí todo lo que Acordes Mayorista tiene
              preparado para vos.
            </p>
          </div>

          <p className="relative z-10 text-xs text-[#9BB7C0]">
            © {new Date().getFullYear()} Acordes Mayorista
          </p>
        </section>

        {/* PANEL DERECHO */}
        <section className="p-8 md:p-10 flex flex-col justify-center overflow-y-auto min-h-0">

          <div className="w-full max-w-md mx-auto">

            <div className="mb-7">
              <div className="w-12 h-12 bg-[#E8F7F3] rounded-2xl flex items-center justify-center mb-6">
                <Music2 size={25} className="text-[#20B8A5]" />
              </div>

              <p className="text-xs uppercase tracking-[0.2em] font-extrabold text-[#20B8A5]">
                Unite a nuestra comunidad
              </p>

              <h2 className="text-3xl font-extrabold text-[#183B4E] mt-2">
                Crear una cuenta
              </h2>

              <p className="text-[#71818A] mt-3">
                Completá tus datos para comenzar.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* TIPO DE CUENTA */}
              <div>
                <label className="block text-sm font-bold text-[#183B4E] mb-2">
                  Tipo de cuenta
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWholesale(false);
                      setCuit("");
                      setSuccess("");
                      setValidationError("");
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-semibold text-sm transition ${
                      !isWholesale
                        ? "border-[#20B8A5] bg-[#E8F7F3] text-[#183B4E]"
                        : "border-[#E8E3DA] text-[#71818A] hover:border-[#20B8A5]"
                    }`}
                  >
                    <UserRound size={18} />
                    Particular
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsWholesale(true);
                      setCuit("");
                      setSuccess("");
                      setValidationError("");
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-semibold text-sm transition ${
                      isWholesale
                        ? "border-[#20B8A5] bg-[#E8F7F3] text-[#183B4E]"
                        : "border-[#E8E3DA] text-[#71818A] hover:border-[#20B8A5]"
                    }`}
                  >
                    <Store size={18} />
                    Mayorista
                  </button>
                </div>
              </div>

              {/* CORREO ELECTRÓNICO */}
              <div>
                <label className="block text-sm font-bold text-[#183B4E] mb-2">
                  Correo electrónico
                </label>

                <div className="relative">
                  <Mail
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#20B8A5]"
                    size={19}
                  />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full border border-[#E8E3DA] rounded-xl py-4 pl-12 pr-4 text-sm text-[#183B4E] bg-[#FAF9F6] outline-none focus:border-[#20B8A5] focus:ring-4 focus:ring-[#20B8A5]/10 transition"
                  />
                </div>
              </div>

              {/* CONTRASEÑA */}
              <div>
                <label className="block text-sm font-bold text-[#183B4E] mb-2">
                  Contraseña
                </label>

                <div className="relative">
                  <Lock
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#20B8A5]"
                    size={19}
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full border border-[#E8E3DA] rounded-xl py-4 pl-12 pr-12 text-sm text-[#183B4E] bg-[#FAF9F6] outline-none focus:border-[#20B8A5] focus:ring-4 focus:ring-[#20B8A5]/10 transition"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#91A0A7] hover:text-[#183B4E]"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {/* CUIT MAYORISTA */}
              {isWholesale && (
                <div>
                  <label className="block text-sm font-bold text-[#183B4E] mb-2">
                    CUIT
                  </label>

                  <div className="relative">
                    <FileText
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#20B8A5]"
                      size={19}
                    />

                    <input
                      type="text"
                      required
                      maxLength={11}
                      inputMode="numeric"
                      value={cuit}
                      onChange={(e) =>
                        setCuit(e.target.value.replace(/\D/g, "").slice(0, 11))
                      }
                      placeholder="Ej: 20381234564"
                      className="w-full border border-[#E8E3DA] rounded-xl py-4 pl-12 pr-4 text-sm text-[#183B4E] bg-[#FAF9F6] outline-none focus:border-[#20B8A5] focus:ring-4 focus:ring-[#20B8A5]/10 transition"
                    />
                  </div>

                  <p className="text-xs text-[#91A0A7] mt-2">
                    Ingresá los 11 dígitos de tu CUIT, sin guiones.
                  </p>

                  <div className="bg-[#FFF4E8] border border-[#F5D9B7] text-[#94602B] p-4 rounded-xl text-sm mt-4">
                    <div className="font-bold mb-1 flex items-center gap-2">
                      <Store size={17} />
                      Solicitud mayorista
                    </div>

                    Tu solicitud será revisada por un administrador antes
                    de habilitar los beneficios mayoristas.
                  </div>
                </div>
              )}

              {/* MENSAJES */}
              {(error || validationError) && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm">
                  {validationError || error}
                </div>
              )}

              {success && (
                <div className="bg-[#E8F7F3] border border-[#BCE8DF] text-[#168F80] p-4 rounded-xl text-sm">
                  <div className="flex items-center gap-2 font-bold mb-2">
                    <CheckCircle2 size={19} />
                    Registro exitoso
                  </div>

                  {success}

                  <p className="mt-2 text-xs">
                    Serás redirigido al inicio de sesión.
                  </p>
                </div>
              )}

              {/* BOTÓN */}
              <button
                type="submit"
                disabled={loading || !!success}
                className="w-full bg-[#183B4E] hover:bg-[#24566D] text-white py-4 rounded-xl font-bold transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-[#183B4E]/15"
              >
                {loading ? "Creando cuenta..." : "Crear cuenta"}
                {!loading && <ArrowRight size={19} />}
              </button>

            </form>

            <div className="mt-9 text-center">
              <p className="text-sm text-slate-500">
                ¿Ya tenés una cuenta?
              </p>

              <Link
                to="/login"
                className="inline-block mt-2 text-[#168F80] font-extrabold hover:text-[#183B4E]"
              >
                Iniciá sesión
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

export default Register;
