
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
  Music2,
  Mail,
  FileText,
  AlertCircle,
} from "lucide-react";

import {
  mockGetWholesaleRequests,
  mockUpdateWholesaleStatus,
} from "../services/mockAuthService";

import BrandLogo from "../components/BrandLogo";

function WholesaleManagement() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await mockGetWholesaleRequests();
      setRequests(data);
    } catch (err) {
      setError(
        err.message || "No se pudieron cargar las solicitudes."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleStatusChange = async (userId, estado) => {
    try {
      setUpdatingId(userId);
      setError("");

      await mockUpdateWholesaleStatus(userId, estado);
      await loadRequests();
    } catch (err) {
      setError(
        err.message || "No se pudo actualizar la solicitud."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = requests.filter(
    (request) => request.estado_mayorista === "PENDIENTE"
  ).length;

  const approvedCount = requests.filter(
    (request) => request.estado_mayorista === "APROBADO"
  ).length;

  const rejectedCount = requests.filter(
    (request) => request.estado_mayorista === "RECHAZADO"
  ).length;

  const getStatusStyle = (estado) => {
    switch (estado) {
      case "APROBADO":
        return "bg-[#E8F7F3] text-[#187968]";
      case "RECHAZADO":
        return "bg-red-50 text-red-600";
      default:
        return "bg-orange-50 text-orange-600";
    }
  };

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
            Gestión de usuarios mayoristas
          </h1>

          <p className="text-slate-500 mt-3 max-w-2xl">
            Revisá las solicitudes de acceso y administrá las cuentas
            mayoristas de Acordes.
          </p>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

          <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 font-medium">
                Pendientes
              </p>
              <Clock size={22} className="text-[#F07858]" />
            </div>
            <p className="text-3xl font-extrabold text-[#183B4E] mt-3">
              {pendingCount}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Solicitudes por revisar
            </p>
          </div>

          <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 font-medium">
                Aprobadas
              </p>
              <CheckCircle size={22} className="text-[#20B8A5]" />
            </div>
            <p className="text-3xl font-extrabold text-[#183B4E] mt-3">
              {approvedCount}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Cuentas habilitadas
            </p>
          </div>

          <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 font-medium">
                Rechazadas
              </p>
              <XCircle size={22} className="text-red-500" />
            </div>
            <p className="text-3xl font-extrabold text-[#183B4E] mt-3">
              {rejectedCount}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Solicitudes rechazadas
            </p>
          </div>
        </div>

        {/* Mensajes de error */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 flex items-start gap-3">
            <AlertCircle size={21} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Solicitudes */}
        <section className="bg-white rounded-3xl border border-[#E8E3DA] overflow-hidden shadow-sm">

          <div className="p-6 md:p-7 border-b border-[#E8E3DA] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#E8F7F3] flex items-center justify-center">
                <Users size={25} className="text-[#20B8A5]" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#183B4E]">
                  Solicitudes mayoristas
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Usuarios registrados en la plataforma.
                </p>
              </div>
            </div>

            <button
              onClick={loadRequests}
              disabled={loading || updatingId !== null}
              className="flex items-center justify-center gap-2 bg-[#E8F7F3] text-[#183B4E] px-4 py-3 rounded-xl font-bold text-sm hover:bg-[#D7F1EA] transition disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={loading ? "animate-spin" : ""}
              />
              Actualizar
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-9 h-9 border-4 border-[#20B8A5] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 mt-4 font-medium">
                Cargando solicitudes...
              </p>
            </div>
          ) : requests.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-[#F4F0E8] rounded-2xl flex items-center justify-center mx-auto">
                <Users size={30} className="text-[#183B4E]" />
              </div>

              <h3 className="font-bold text-[#183B4E] mt-5">
                No hay solicitudes todavía
              </h3>

              <p className="text-slate-500 text-sm mt-2">
                Cuando se registren nuevos mayoristas, aparecerán en esta sección.
              </p>
            </div>
          ) : (
            <>
              {/* Vista para escritorio */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#FAF9F6] text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-5">Correo electrónico</th>
                      <th className="px-6 py-5">CUIT</th>
                      <th className="px-6 py-5">Estado</th>
                      <th className="px-6 py-5">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#F0ECE5]">
                    {requests.map((request) => (
                      <tr
                        key={request.id}
                        className="hover:bg-[#FAF9F6] transition"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#E8F7F3] flex items-center justify-center">
                              <Mail size={18} className="text-[#20B8A5]" />
                            </div>
                            <span className="font-semibold text-[#183B4E]">
                              {request.email}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5 text-slate-600 font-medium">
                          {request.cuit}
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold ${getStatusStyle(
                              request.estado_mayorista
                            )}`}
                          >
                            {request.estado_mayorista}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          {request.estado_mayorista === "PENDIENTE" ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() =>
                                  handleStatusChange(request.id, "APROBADO")
                                }
                                disabled={updatingId === request.id}
                                className="flex items-center gap-2 px-3 py-2 bg-[#20B8A5] text-[#183B4E] rounded-xl text-sm font-bold hover:bg-[#19A994] disabled:opacity-50 transition"
                              >
                                <UserCheck size={16} />
                                Aprobar
                              </button>

                              <button
                                onClick={() =>
                                  handleStatusChange(request.id, "RECHAZADO")
                                }
                                disabled={updatingId === request.id}
                                className="flex items-center gap-2 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-bold hover:bg-red-50 disabled:opacity-50 transition"
                              >
                                <UserX size={16} />
                                Rechazar
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Sin acciones disponibles
                            </span>
                          )}

                          {updatingId === request.id && (
                            <p className="text-xs text-slate-400 mt-2">
                              Actualizando solicitud...
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista para celulares */}
              <div className="md:hidden divide-y divide-[#F0ECE5]">
                {requests.map((request) => (
                  <div key={request.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#E8F7F3] flex items-center justify-center shrink-0">
                          <Mail size={18} className="text-[#20B8A5]" />
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-[#183B4E] break-all">
                            {request.email}
                          </p>

                          <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                            <FileText size={15} />
                            CUIT: {request.cuit}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${getStatusStyle(
                          request.estado_mayorista
                        )}`}
                      >
                        {request.estado_mayorista}
                      </span>
                    </div>

                    {request.estado_mayorista === "PENDIENTE" ? (
                      <div className="grid grid-cols-2 gap-3 mt-5">
                        <button
                          onClick={() =>
                            handleStatusChange(request.id, "APROBADO")
                          }
                          disabled={updatingId === request.id}
                          className="flex items-center justify-center gap-2 px-3 py-3 bg-[#20B8A5] text-[#183B4E] rounded-xl text-sm font-bold disabled:opacity-50"
                        >
                          <UserCheck size={17} />
                          Aprobar
                        </button>

                        <button
                          onClick={() =>
                            handleStatusChange(request.id, "RECHAZADO")
                          }
                          disabled={updatingId === request.id}
                          className="flex items-center justify-center gap-2 px-3 py-3 bg-white border border-red-200 text-red-600 rounded-xl text-sm font-bold disabled:opacity-50"
                        >
                          <UserX size={17} />
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 mt-4">
                        Sin acciones disponibles
                      </p>
                    )}

                    {updatingId === request.id && (
                      <p className="text-xs text-slate-400 mt-3 text-center">
                        Actualizando solicitud...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Nota informativa */}
        <div className="mt-6 bg-[#E8F7F3] border border-[#CDECE4] rounded-2xl p-5 flex items-start gap-3">
          <ShieldCheck size={22} className="text-[#20B8A5] shrink-0" />
          <div>
            <p className="font-bold text-[#183B4E] text-sm">
              Administración de cuentas
            </p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Al aprobar una solicitud, el usuario obtiene acceso a las
              funcionalidades correspondientes a una cuenta mayorista.
            </p>
          </div>
        </div>

        <footer className="text-center text-sm text-slate-400 mt-10">
          © Acordes Mayorista · Panel de administración
        </footer>
      </div>
    </main>
  );
}

export default WholesaleManagement;
