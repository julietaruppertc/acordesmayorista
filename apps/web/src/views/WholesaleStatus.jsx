
import { Link } from "react-router-dom";
import {
  Clock,
  XCircle,
  Music2,
  ShieldCheck,
  ArrowLeft,
  Mail,
} from "lucide-react";
import { useAuthContext } from "../context/AuthContext";
import BrandLogo from "../components/BrandLogo";

function WholesaleStatus() {
  const { user } = useAuthContext();

  const isPending = user?.estado_mayorista === "PENDIENTE";

  return (
    <main className="min-h-screen bg-[#F4F0E8] px-5 py-10 flex flex-col">

      {/* Encabezado */}
      <header className="max-w-6xl w-full mx-auto">
        <Link to="/" className="inline-flex">
          <BrandLogo />
        </Link>
      </header>

      {/* Contenido */}
      <div className="flex-1 flex items-center justify-center py-12">
        <section className="bg-white max-w-lg w-full rounded-3xl border border-[#E8E3DA] shadow-sm p-8 md:p-10 text-center">

          {/* Identidad de marca */}
          <div className="w-16 h-16 rounded-2xl bg-[#183B4E] flex items-center justify-center mx-auto">
            <Music2 size={32} className="text-[#20B8A5]" />
          </div>

          {isPending ? (
            <>
              {/* Solicitud pendiente */}
              <div className="w-24 h-24 rounded-full bg-orange-50 flex items-center justify-center mx-auto mt-8">
                <Clock size={52} className="text-[#F07858]" />
              </div>

              <p className="text-[#F07858] font-extrabold uppercase tracking-[0.2em] text-xs mt-7">
                En revisión
              </p>

              <h1 className="text-2xl md:text-3xl font-extrabold text-[#183B4E] mt-3">
                Solicitud pendiente de aprobación
              </h1>

              <p className="text-slate-500 mt-5 leading-relaxed">
                Recibimos tu solicitud para acceder a una cuenta mayorista.
                Nuestro equipo está revisando tus datos.
              </p>

              <div className="bg-[#FFF5EF] border border-orange-100 rounded-2xl p-5 mt-7 text-left">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    size={22}
                    className="text-[#F07858] shrink-0"
                  />

                  <div>
                    <p className="font-bold text-[#183B4E] text-sm">
                      ¿Qué sucede ahora?
                    </p>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Una vez aprobada tu solicitud, vas a poder acceder
                      a los beneficios y funcionalidades de mayorista.
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Solicitud rechazada */}
              <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center mx-auto mt-8">
                <XCircle size={52} className="text-red-500" />
              </div>

              <p className="text-red-500 font-extrabold uppercase tracking-[0.2em] text-xs mt-7">
                Solicitud rechazada
              </p>

              <h1 className="text-2xl md:text-3xl font-extrabold text-[#183B4E] mt-3">
                Solicitud no aprobada
              </h1>

              <p className="text-slate-500 mt-5 leading-relaxed">
                Por el momento, tu solicitud de cuenta mayorista no fue
                aprobada.
              </p>

              <div className="bg-[#FAF9F6] border border-[#E8E3DA] rounded-2xl p-5 mt-7 text-left">
                <div className="flex items-start gap-3">
                  <Mail
                    size={22}
                    className="text-[#20B8A5] shrink-0"
                  />

                  <div>
                    <p className="font-bold text-[#183B4E] text-sm">
                      ¿Necesitás más información?
                    </p>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                      Podés comunicarte con nuestro equipo para consultar
                      sobre el estado de tu solicitud.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          <Link
            to="/"
            className="w-full inline-flex items-center justify-center gap-2 mt-8 bg-[#183B4E] text-white px-7 py-4 rounded-xl font-bold hover:bg-[#24566D] transition"
          >
            <ArrowLeft size={18} />
            Volver al inicio
          </Link>

          <p className="text-xs text-slate-400 mt-6">
            Acordes Mayorista · Instrumentos musicales
          </p>
        </section>
      </div>
    </main>
  );
}

export default WholesaleStatus;

