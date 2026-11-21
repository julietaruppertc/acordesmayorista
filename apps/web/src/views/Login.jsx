
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  FileText,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Music2,
  Guitar,
  Sparkles,
  UserRound,
  Store,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import BrandLogo from "../components/BrandLogo.jsx";

function Login() {
  const navigate = useNavigate();
  const { login, register, loading, error } = useAuth();

  const [mode, setMode] = useState("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isWholesale, setIsWholesale] = useState(false);
  const [cuit, setCuit] = useState("");

  const [success, setSuccess] = useState("");
  const [validationError, setValidationError] = useState("");

  const isRegister = mode === "register";

  const changeMode = (newMode) => {
    setMode(newMode);
    setSuccess("");
    setValidationError("");
    setPassword("");
    setShowPassword(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");
    setSuccess("");

    // =========================
    // INICIAR SESIÓN
    // =========================
    if (!isRegister) {
      try {
        const user = await login({
          email: email.trim(),
          password,
        });

        console.log("Usuario autenticado:", user);
        console.log("Rol del usuario:", user?.rol);

        navigate("/");
      } catch {
        // El error se muestra desde useAuth.
      }

      return;
    }

    // =========================
    // VALIDACIONES REGISTRO
    // =========================

    if (isWholesale && !/^\d{11}$/.test(cuit)) {
      setValidationError("El CUIT debe tener exactamente 11 dígitos.");
      return;
    }

    if (password.length < 8) {
      setValidationError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    // =========================
    // CREAR CUENTA
    // =========================

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

      setTimeout(() => {
        setMode("login");
        setSuccess("");
        setPassword("");
      }, 3500);
    } catch {
      // El error se muestra desde useAuth.
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F0E8] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-6xl min-h-[650px] md:h-[650px] bg-white rounded-[32px] shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">

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
              {isRegister
                ? "Creá tu cuenta y descubrí instrumentos, accesorios y oportunidades para llevar tu música más lejos."
                : "Ingresá a tu cuenta y descubrí instrumentos, accesorios y oportunidades para llevar tu música más lejos."}
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
        <section className="p-8 md:p-10 flex flex-col justify-center overflow-y-auto min-h-0">

          <div className="w-full max-w-md mx-auto">

            {/* ENCABEZADO */}
            <div className="mb-7">
              <div className="w-12 h-12 bg-[#E8F7F3] rounded-2xl flex items-center justify-center mb-6">
                <Music2 size={25} className="text-[#20B8A5]" />
              </div>

              <p className="text-xs uppercase tracking-[0.2em] font-extrabold text-[#20B8A5]">
                {isRegister
                  ? "Unite a nuestra comunidad"
                  : "Mi cuenta"}
              </p>

              <h2 className="text-3xl font-extrabold text-[#183B4E] mt-2">
                {isRegister
                  ? "Crear una cuenta"
                  : "¡Qué bueno verte!"}
              </h2>

              <p className="text-slate-500 mt-3">
                {isRegister
                  ? "Completá tus datos para comenzar."
                  : "Ingresá tus datos para continuar."}
              </p>
            </div>

            {/* FORMULARIO */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* TIPO DE CUENTA (SOLO REGISTRO) */}
              {isRegister && (
                <div>
                  <label className="block text-sm font-bold text-[#183B4E] mb-2">
                    Tipo de cuenta
                  </label>

                  <div className="grid grid-cols-2 gap-3">

                    {/* PARTICULAR */}
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

                    {/* MAYORISTA */}
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
              )}

              {/* EMAIL */}
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
                    className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl py-4 pl-12 pr-4 text-sm text-[#183B4E] outline-none focus:border-[#20B8A5] focus:ring-4 focus:ring-[#20B8A5]/10 transition"
                  />
                </div>
              </div>

              {/* CUIT (SOLO MAYORISTA) */}
              {isRegister && isWholesale && (
                <div>
                  <label className="block text-sm font-bold text-[#183B4E] mb-2">
                    CUIT
                  </label>

                  <div className="relative">
                    <FileText
                      size={19}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#20B8A5]"
                    />

                    <input
                      type="text"
                      required
                      maxLength={11}
                      inputMode="numeric"
                      value={cuit}
                      onChange={(e) =>
                        setCuit(
                          e.target.value.replace(/\D/g, "").slice(0, 11)
                        )
                      }
                      placeholder="Ej: 20381234564"
                      className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl py-4 pl-12 pr-4 text-sm text-[#183B4E] outline-none focus:border-[#20B8A5] focus:ring-4 focus:ring-[#20B8A5]/10 transition"
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

              {/* CONTRASEÑA */}
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
                    minLength={isRegister ? 8 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      isRegister
                        ? "Mínimo 8 caracteres"
                        : "Tu contraseña"
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl py-4 pl-12 pr-12 text-sm text-[#183B4E] outline-none focus:border-[#20B8A5] focus:ring-4 focus:ring-[#20B8A5]/10 transition"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#183B4E]"
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {showPassword
                      ? <EyeOff size={19} />
                      : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {/* ERRORES */}
              {(validationError || (error && !success)) && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm">
                  {validationError || error}
                </div>
              )}

              {/* MENSAJE DE ÉXITO */}
              {success && (
                <div className="bg-[#E8F7F3] border border-[#BCE8DF] text-[#168F80] p-4 rounded-xl text-sm">
                  <div className="flex items-center gap-2 font-bold mb-2">
                    <CheckCircle2 size={19} />
                    Registro exitoso
                  </div>

                  {success}

                  <p className="mt-2 text-xs">
                    Volverás al inicio de sesión en unos segundos.
                  </p>
                </div>
              )}

              {/* BOTÓN PRINCIPAL */}
              <button
                type="submit"
                disabled={loading || !!success}
                className="w-full bg-[#183B4E] text-white py-4 rounded-xl font-bold hover:bg-[#24566D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition"
              >
                {loading
                  ? isRegister
                    ? "Creando cuenta..."
                    : "Ingresando..."
                  : isRegister
                    ? "Crear cuenta"
                    : "Iniciar sesión"}

                {!loading && <ArrowRight size={19} />}
              </button>

            </form>

            {/* CAMBIAR MODO */}
            <div className="mt-9 text-center">
              <p className="text-sm text-slate-500">
                {isRegister
                  ? "¿Ya tenés una cuenta?"
                  : "¿Todavía no tenés una cuenta?"}
              </p>

              <button
                type="button"
                onClick={() =>
                  changeMode(isRegister ? "login" : "register")
                }
                className="inline-block mt-2 text-[#168F80] font-extrabold hover:text-[#183B4E] transition"
              >
                {isRegister
                  ? "Iniciá sesión"
                  : "Crear una cuenta"}
              </button>
            </div>

            {/* VOLVER AL INICIO */}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="block w-full text-center text-sm text-slate-400 mt-8 hover:text-[#183B4E] transition"
            >
              Volver al inicio
            </button>

          </div>
        </section>
      </div>
    </div>
  );
}

export default Login;
