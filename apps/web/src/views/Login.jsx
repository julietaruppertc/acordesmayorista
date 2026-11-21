
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
  Upload,
  X,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "../hooks/useAuth";
import BrandLogo from "../components/BrandLogo.jsx";

const MAX_FILE_SIZE = 6 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      resolve(result.split(",")[1]);
    };

    reader.onerror = () => {
      reject(new Error("No se pudo leer el archivo seleccionado."));
    };

    reader.readAsDataURL(file);
  });
};

function Login() {
  const navigate = useNavigate();
  const { login, register, loading, error } = useAuth();

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isWholesale, setIsWholesale] = useState(false);
  const [cuit, setCuit] = useState("");
  const [constancia, setConstancia] = useState(null);

  const [success, setSuccess] = useState("");
  const [validationError, setValidationError] = useState("");
  const [auditResult, setAuditResult] = useState(null);

  const isRegister = mode === "register";

  const changeMode = (newMode) => {
    setMode(newMode);
    setSuccess("");
    setValidationError("");
    setPassword("");
    setShowPassword(false);
    setConstancia(null);
    setAuditResult(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    setValidationError("");
    setConstancia(null);

    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setValidationError(
        "Formato no válido. Adjuntá un PDF, JPG, PNG o WEBP."
      );
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setValidationError("El archivo no puede superar los 6 MB.");
      e.target.value = "";
      return;
    }

    setConstancia(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError("");
    setSuccess("");
    setAuditResult(null);

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

    if (isWholesale && !/^\d{11}$/.test(cuit)) {
      setValidationError(
        "El CUIT debe tener exactamente 11 dígitos."
      );
      return;
    }

    if (password.length < 8) {
      setValidationError(
        "La contraseña debe tener al menos 8 caracteres."
      );
      return;
    }

    try {
      const userData = {
        email: email.trim(),
        password,
        rol: "cliente",
        ...(isWholesale ? { cuit } : {}),
      };

      if (isWholesale && constancia) {
        const constanciaBase64 = await fileToBase64(constancia);

        userData.constanciaBase64 = constanciaBase64;
        userData.constanciaMimeType = constancia.type;
      }

      const response = await register(userData);
      const auditoria = response?.user?.auditoria_ia;

      if (isWholesale && auditoria) {
        setAuditResult(auditoria);
      }

      setSuccess(
        isWholesale
          ? "¡Solicitud enviada! Tu cuenta mayorista quedó pendiente de aprobación."
          : "¡Tu cuenta particular fue creada exitosamente!"
      );

      setTimeout(() => {
        setMode("login");
        setSuccess("");
        setPassword("");
        setConstancia(null);
        setAuditResult(null);
      }, 7000);
    } catch {
      // El error se muestra desde useAuth.
    }
  };

  const getAuditStyle = (suggestion) => {
    switch (suggestion) {
      case "APROBAR":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "RECHAZAR":
        return "bg-red-100 text-red-800 border-red-200";
      case "REVISION_MANUAL":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getAuditLabel = (suggestion) => {
    switch (suggestion) {
      case "APROBAR":
        return "APROBAR";
      case "RECHAZAR":
        return "RECHAZAR";
      case "REVISION_MANUAL":
        return "REVISAR";
      default:
        return "PENDIENTE DE REVISIÓN";
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F0E8] flex items-center justify-center p-3 md:p-4">
      <div className="w-full max-w-5xl min-h-[600px] md:h-[min(760px,calc(100dvh-32px))] bg-white rounded-[26px] shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2">

        {/* PANEL IZQUIERDO */}
        <section className="hidden md:flex relative bg-[#183B4E] p-8 lg:p-10 flex-col justify-between overflow-hidden">
          <div className="absolute w-80 h-80 rounded-full bg-[#20B8A5]/10 -top-32 -right-32" />
          <div className="absolute w-72 h-72 rounded-full bg-[#F07858]/10 -bottom-32 -left-28" />

          <div className="relative z-10">
            <BrandLogo light />
          </div>

          <div className="relative z-10 my-5">
            <div className="inline-flex items-center gap-2 text-[#73E0CF] bg-[#20B8A5]/15 px-3 py-2 rounded-full text-[11px] font-bold tracking-wider">
              <Sparkles size={14} />
              BIENVENIDO A ACORDES
            </div>

            <h1 className="text-3xl lg:text-4xl font-extrabold text-white mt-5 leading-tight">
              Tu pasión por
              <span className="block text-[#20B8A5]">
                la música
              </span>
              comienza acá.
            </h1>

            <p className="text-[#C4D8DE] text-sm mt-4 leading-relaxed max-w-sm">
              {isRegister
                ? "Creá tu cuenta y descubrí instrumentos, accesorios y oportunidades para llevar tu música más lejos."
                : "Ingresá a tu cuenta y descubrí instrumentos, accesorios y oportunidades para llevar tu música más lejos."}
            </p>

            <div className="mt-7 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#20B8A5]/15 flex items-center justify-center">
                <Guitar size={26} className="text-[#20B8A5]" />
              </div>

              <div>
                <p className="text-white text-sm font-bold">
                  Encontrá tu sonido
                </p>
                <p className="text-xs text-[#B9D0D6]">
                  Todo lo que necesitás en un solo lugar.
                </p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-[11px] text-[#9BB7C0]">
            © {new Date().getFullYear()} Acordes Mayorista
          </p>
        </section>

        {/* PANEL DERECHO */}
        <section className="p-5 sm:p-7 flex flex-col justify-center min-h-0 overflow-y-auto">
          <div className="w-full max-w-md mx-auto">

            {/* ENCABEZADO */}
            <div className="mb-4">
              <div className="w-10 h-10 bg-[#E8F7F3] rounded-xl flex items-center justify-center mb-3">
                <Music2 size={22} className="text-[#20B8A5]" />
              </div>

              <p className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-[#20B8A5]">
                {isRegister ? "Unite a nuestra comunidad" : "Mi cuenta"}
              </p>

              <h2 className="text-2xl font-extrabold text-[#183B4E] mt-1">
                {isRegister ? "Crear una cuenta" : "¡Qué bueno verte!"}
              </h2>

              <p className="text-slate-500 text-xs mt-1">
                {isRegister
                  ? "Completá tus datos para comenzar."
                  : "Ingresá tus datos para continuar."}
              </p>
            </div>

            {/* FORMULARIO */}
            <form onSubmit={handleSubmit} className="space-y-2.5">

              {/* TIPO DE CUENTA */}
              {isRegister && (
                <div>
                  <label className="block text-xs font-bold text-[#183B4E] mb-1.5">
                    Tipo de cuenta
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsWholesale(false);
                        setCuit("");
                        setConstancia(null);
                        setAuditResult(null);
                        setSuccess("");
                        setValidationError("");
                      }}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 font-semibold text-xs transition ${
                        !isWholesale
                          ? "border-[#20B8A5] bg-[#E8F7F3] text-[#183B4E]"
                          : "border-[#E8E3DA] text-[#71818A] hover:border-[#20B8A5]"
                      }`}
                    >
                      <UserRound size={16} />
                      Particular
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsWholesale(true);
                        setCuit("");
                        setConstancia(null);
                        setAuditResult(null);
                        setSuccess("");
                        setValidationError("");
                      }}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 font-semibold text-xs transition ${
                        isWholesale
                          ? "border-[#20B8A5] bg-[#E8F7F3] text-[#183B4E]"
                          : "border-[#E8E3DA] text-[#71818A] hover:border-[#20B8A5]"
                      }`}
                    >
                      <Store size={16} />
                      Mayorista
                    </button>
                  </div>
                </div>
              )}

              {/* EMAIL */}
              <div>
                <label className="block text-xs font-bold text-[#183B4E] mb-1.5">
                  Correo electrónico
                </label>

                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#20B8A5]"
                  />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl py-3 pl-10 pr-3 text-xs text-[#183B4E] outline-none focus:border-[#20B8A5] focus:ring-4 focus:ring-[#20B8A5]/10 transition"
                  />
                </div>
              </div>

              {/* CUIT */}
              {isRegister && isWholesale && (
                <div>
                  <label className="block text-xs font-bold text-[#183B4E] mb-1.5">
                    CUIT
                  </label>

                  <div className="relative">
                    <FileText
                      size={17}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#20B8A5]"
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
                      className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl py-3 pl-10 pr-3 text-xs text-[#183B4E] outline-none focus:border-[#20B8A5] focus:ring-4 focus:ring-[#20B8A5]/10 transition"
                    />
                  </div>

                  <p className="text-[10px] text-[#91A0A7] mt-1">
                    Ingresá los 11 dígitos, sin guiones.
                  </p>
                </div>
              )}

              {/* CONSTANCIA */}
              {isRegister && isWholesale && (
                <div>
                  <label className="block text-xs font-bold text-[#183B4E] mb-1.5">
                    Constancia de inscripción{" "}
                    <span className="font-normal text-slate-400">
                      (opcional)
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 border-2 border-dashed border-[#BCE8DF] bg-[#F7FCFA] rounded-xl cursor-pointer hover:border-[#20B8A5] hover:bg-[#E8F7F3] transition">
                    <div className="w-9 h-9 rounded-lg bg-[#E8F7F3] flex items-center justify-center shrink-0">
                      <Upload size={19} className="text-[#20B8A5]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#183B4E]">
                        Seleccionar constancia
                      </p>
                      <p className="text-[10px] text-slate-400">
                        PDF, JPG, PNG o WEBP · Máximo 6 MB
                      </p>
                    </div>

                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  {constancia && (
                    <div className="flex items-center justify-between gap-2 mt-2 p-2 bg-[#E8F7F3] border border-[#BCE8DF] rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText
                          size={17}
                          className="text-[#168F80] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#183B4E] truncate">
                            {constancia.name}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {(constancia.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setConstancia(null)}
                        aria-label="Quitar constancia"
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X size={17} />
                      </button>
                    </div>
                  )}

                  <p className="text-[10px] text-[#91A0A7] mt-1">
                    El archivo se utiliza para analizar automáticamente tus datos fiscales.
                  </p>
                </div>
              )}

              {/* AVISO MAYORISTA */}
              {isRegister && isWholesale && (
                <div className="bg-[#FFF4E8] border border-[#F5D9B7] text-[#94602B] p-2.5 rounded-xl text-[11px]">
                  <div className="font-bold mb-0.5 flex items-center gap-1.5">
                    <Store size={14} />
                    Solicitud mayorista
                  </div>
                  Tu solicitud será revisada por un administrador antes de habilitar los beneficios mayoristas.
                </div>
              )}

              {/* CONTRASEÑA */}
              <div>
                <label className="block text-xs font-bold text-[#183B4E] mb-1.5">
                  Contraseña
                </label>

                <div className="relative">
                  <Lock
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#20B8A5]"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={isRegister ? 8 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      isRegister ? "Mínimo 8 caracteres" : "Tu contraseña"
                    }
                    className="w-full bg-[#FAF9F6] border border-[#E8E3DA] rounded-xl py-3 pl-10 pr-10 text-xs text-[#183B4E] outline-none focus:border-[#20B8A5] focus:ring-4 focus:ring-[#20B8A5]/10 transition"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#183B4E]"
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {/* ERRORES */}
              {(validationError || (error && !success)) && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-2.5 rounded-xl text-xs">
                  {validationError || error}
                </div>
              )}

              {/* ÉXITO Y AUDITORÍA */}
              {success && (
                <div className="bg-[#E8F7F3] border border-[#BCE8DF] text-[#168F80] p-3 rounded-xl text-xs">
                  <div className="flex items-center gap-2 font-bold mb-2">
                    <CheckCircle2 size={17} />
                    Registro exitoso
                  </div>

                  {success}

                  {auditResult && (
                    <div className="mt-3 pt-3 border-t border-[#BCE8DF]">
                      <div className="flex items-center gap-2 font-bold text-[#183B4E] mb-2">
                        <ShieldCheck size={17} />
                        Resultado de auditoría IA
                      </div>

                      {auditResult.procesado ? (
                        <>
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-extrabold ${getAuditStyle(
                              auditResult.sugerencia
                            )}`}
                          >
                            {getAuditLabel(auditResult.sugerencia)}
                          </span>

                          <p className="text-[#183B4E] mt-2">
                            {auditResult.justificacion}
                          </p>

                          {auditResult.score_confianza != null && (
                            <p className="text-[10px] text-slate-500 mt-1">
                              Confianza del análisis:{" "}
                              {auditResult.score_confianza}%
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[#183B4E]">
                          La auditoría automática no pudo completarse.
                          Tu solicitud queda pendiente de revisión manual.
                          {auditResult.justificacion && (
                            <span className="block mt-1 text-[10px] text-slate-600">
                              {auditResult.justificacion}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  <p className="mt-2 text-[10px]">
                    Volverás al inicio de sesión en unos segundos.
                  </p>
                </div>
              )}

              {/* BOTÓN PRINCIPAL */}
              <button
                type="submit"
                disabled={loading || !!success}
                className="w-full bg-[#183B4E] text-white py-3 rounded-xl text-sm font-bold hover:bg-[#24566D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
              >
                {loading
                  ? isRegister
                    ? "Creando cuenta..."
                    : "Ingresando..."
                  : isRegister
                    ? "Crear cuenta"
                    : "Iniciar sesión"}

                {!loading && <ArrowRight size={17} />}
              </button>
            </form>

            {/* CAMBIAR MODO */}
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500">
                {isRegister
                  ? "¿Ya tenés una cuenta?"
                  : "¿Todavía no tenés una cuenta?"}
              </p>

              <button
                type="button"
                onClick={() =>
                  changeMode(isRegister ? "login" : "register")
                }
                className="inline-block mt-1 text-xs text-[#168F80] font-extrabold hover:text-[#183B4E] transition"
              >
                {isRegister ? "Iniciá sesión" : "Crear una cuenta"}
              </button>
            </div>

            {/* VOLVER AL INICIO */}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="block w-full text-center text-xs text-slate-400 mt-3 hover:text-[#183B4E] transition"
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
