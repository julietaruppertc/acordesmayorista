
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  Users,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
  Mail,
  AlertCircle,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  UserPlus,
} from "lucide-react";

import {
  mockGetUsers,
  mockCreateUser,
  mockUpdateUser,
  mockDeleteUser,
  mockUpdateWholesaleStatus,
} from "../services/mockAuthService";

import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  updateWholesaleStatus,
} from "../services/userService";

import BrandLogo from "../components/BrandLogo";

// Selección del servicio según el modo de ejecución.
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

const userService = DEMO_MODE
  ? {
      getUsers: mockGetUsers,
      createUser: mockCreateUser,
      updateUser: mockUpdateUser,
      deleteUser: mockDeleteUser,
      updateWholesaleStatus: mockUpdateWholesaleStatus,
    }
  : {
      getUsers,
      createUser,
      updateUser,
      deleteUser,
      updateWholesaleStatus,
    };

function WholesaleManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("TODOS");
  const [statusFilter, setStatusFilter] = useState("TODOS");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    email: "",
    password: "",
    cuit: "",
  });

  const getErrorMessage = (err, fallback) => {
    return (
      err.response?.data?.error ||
      err.message ||
      fallback
    );
  };

  // Consultar usuarios.
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await userService.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        getErrorMessage(err, "No se pudieron cargar los usuarios.")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Indicadores.
  const pendingCount = users.filter(
    (user) => user.estado_mayorista === "PENDIENTE"
  ).length;

  const approvedCount = users.filter(
    (user) => user.estado_mayorista === "APROBADO"
  ).length;

  const rejectedCount = users.filter(
    (user) => user.estado_mayorista === "RECHAZADO"
  ).length;

  const retailerCount = users.filter(
    (user) => !user.cuit
  ).length;

  const wholesaleCount = users.filter(
    (user) => Boolean(user.cuit)
  ).length;

  // Búsqueda y filtros.
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const searchValue = search.trim().toLowerCase();

      const matchesSearch =
        (user.email || "").toLowerCase().includes(searchValue) ||
        (user.cuit || "").includes(searchValue);

      const matchesType =
        typeFilter === "TODOS" ||
        (typeFilter === "MINORISTA" && !user.cuit) ||
        (typeFilter === "MAYORISTA" && Boolean(user.cuit));

      const matchesStatus =
        statusFilter === "TODOS" ||
        (statusFilter === "PENDIENTE" &&
          user.estado_mayorista === "PENDIENTE") ||
        (statusFilter === "APROBADO" &&
          user.estado_mayorista === "APROBADO") ||
        (statusFilter === "RECHAZADO" &&
          user.estado_mayorista === "RECHAZADO") ||
        (statusFilter === "ACTIVO" && !user.cuit);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [users, search, typeFilter, statusFilter]);

  const getStatusStyle = (estado) => {
    switch (estado) {
      case "APROBADO":
        return "bg-[#E8F7F3] text-[#187968]";
      case "RECHAZADO":
        return "bg-red-50 text-red-600";
      case "PENDIENTE":
        return "bg-orange-50 text-orange-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  // Abrir modal para crear.
  const openCreateModal = () => {
    setEditingUser(null);
    setForm({ email: "", password: "", cuit: "" });
    setError("");
    setModalOpen(true);
  };

  // Abrir modal para editar.
  const openEditModal = (user) => {
    setEditingUser(user);
    setForm({
      email: user.email,
      password: "",
      cuit: user.cuit || "",
    });
    setError("");
    setModalOpen(true);
  };

  // Cerrar modal.
  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setForm({ email: "", password: "", cuit: "" });
  };

  // Crear o modificar usuario.
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (editingUser) {
        await userService.updateUser(editingUser.id, {
          email: form.email.trim(),
          cuit: form.cuit.trim(),
        });

        setSuccess("Usuario actualizado correctamente.");
      } else {
        await userService.createUser({
          email: form.email.trim(),
          password: form.password,
          cuit: form.cuit.trim(),
        });

        setSuccess(
          form.cuit.trim()
            ? "Usuario creado. Su solicitud mayorista quedó pendiente."
            : "Usuario minorista creado correctamente."
        );
      }

      closeModal();
      await loadUsers();
    } catch (err) {
      setError(
        getErrorMessage(err, "No se pudo guardar el usuario.")
      );
    } finally {
      setSaving(false);
    }
  };

  // Eliminar usuario.
  const handleDelete = async (user) => {
    const confirmed = window.confirm(
      `¿Estás segura de que querés eliminar la cuenta ${user.email}? Esta acción no se puede deshacer.`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await userService.deleteUser(user.id);
      await loadUsers();

      setSuccess("Usuario eliminado correctamente.");
    } catch (err) {
      setError(
        getErrorMessage(err, "No se pudo eliminar el usuario.")
      );
    }
  };

  // Aprobar o rechazar solicitud mayorista.
  const handleStatusChange = async (userId, estado) => {
    try {
      setUpdatingId(userId);
      setError("");
      setSuccess("");

      await userService.updateWholesaleStatus(userId, estado);
      await loadUsers();

      setSuccess(
        estado === "APROBADO"
          ? "Solicitud mayorista aprobada correctamente."
          : "Solicitud mayorista rechazada."
      );
    } catch (err) {
      setError(
        getErrorMessage(err, "No se pudo actualizar la solicitud.")
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#F4F0E8] px-5 py-8 md:px-8 md:py-12">
      <div className="max-w-7xl mx-auto">

        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-10">
          <Link to="/">
            <BrandLogo />
          </Link>

          <div className="flex items-center gap-2 text-sm font-semibold text-[#183B4E]">
            <ShieldCheck size={19} className="text-[#20B8A5]" />
            Panel administrativo
          </div>
        </header>

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
            Gestión de usuarios
          </h1>

          <p className="text-slate-500 mt-3 max-w-2xl">
            Administrá las cuentas minoristas y mayoristas de Acordes Mayorista.
            Revisá solicitudes, creá usuarios y modificá sus datos.
          </p>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 font-medium">Total de usuarios</p>
              <Users size={22} className="text-[#20B8A5]" />
            </div>
            <p className="text-3xl font-extrabold text-[#183B4E] mt-3">
              {users.length}
            </p>
            <p className="text-xs text-slate-400 mt-1">Cuentas registradas</p>
          </div>

          <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 font-medium">Minoristas</p>
              <Users size={22} className="text-[#183B4E]" />
            </div>
            <p className="text-3xl font-extrabold text-[#183B4E] mt-3">
              {retailerCount}
            </p>
            <p className="text-xs text-slate-400 mt-1">Cuentas particulares</p>
          </div>

          <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 font-medium">Mayoristas</p>
              <UserCheck size={22} className="text-[#20B8A5]" />
            </div>
            <p className="text-3xl font-extrabold text-[#183B4E] mt-3">
              {wholesaleCount}
            </p>
            <p className="text-xs text-slate-400 mt-1">Con CUIT registrado</p>
          </div>

          <div className="bg-white border border-[#E8E3DA] rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 font-medium">Pendientes</p>
              <Clock size={22} className="text-[#F07858]" />
            </div>
            <p className="text-3xl font-extrabold text-[#183B4E] mt-3">
              {pendingCount}
            </p>
            <p className="text-xs text-slate-400 mt-1">Solicitudes por revisar</p>
          </div>
        </div>

        {/* Mensajes */}
        {error && (
          <div className="mb-5 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-700 flex items-start gap-3">
            <AlertCircle size={21} className="shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 rounded-2xl bg-[#E8F7F3] border border-[#CDECE4] text-[#187968] flex items-start gap-3">
            <CheckCircle size={21} className="shrink-0" />
            <p className="text-sm font-medium">{success}</p>
            <button
              onClick={() => setSuccess("")}
              className="ml-auto"
              aria-label="Cerrar mensaje"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Tabla de usuarios */}
        <section className="bg-white rounded-3xl border border-[#E8E3DA] overflow-hidden shadow-sm">

          <div className="p-6 md:p-7 border-b border-[#E8E3DA] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#E8F7F3] flex items-center justify-center">
                <Users size={25} className="text-[#20B8A5]" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-[#183B4E]">
                  Usuarios registrados
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Alta, baja, modificación y consulta de cuentas.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={loadUsers}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-[#E8F7F3] text-[#183B4E] px-4 py-3 rounded-xl font-bold text-sm hover:bg-[#D7F1EA] transition disabled:opacity-50"
              >
                <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
                Actualizar
              </button>

              <button
                onClick={openCreateModal}
                className="flex items-center justify-center gap-2 bg-[#183B4E] text-white px-4 py-3 rounded-xl font-bold text-sm hover:bg-[#24536A] transition"
              >
                <Plus size={18} />
                Nuevo usuario
              </button>
            </div>
          </div>

          {/* Búsqueda y filtros */}
          <div className="p-5 md:p-6 bg-[#FAF9F6] border-b border-[#E8E3DA] grid grid-cols-1 md:grid-cols-3 gap-3">

            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por correo o CUIT..."
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E8E3DA] outline-none focus:ring-2 focus:ring-[#20B8A5] text-sm"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E8E3DA] outline-none focus:ring-2 focus:ring-[#20B8A5] text-sm bg-white"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="MINORISTA">Minoristas</option>
              <option value="MAYORISTA">Mayoristas</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#E8E3DA] outline-none focus:ring-2 focus:ring-[#20B8A5] text-sm bg-white"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Minoristas activos</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="APROBADO">Mayoristas aprobados</option>
              <option value="RECHAZADO">Mayoristas rechazados</option>
            </select>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-9 h-9 border-4 border-[#20B8A5] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 mt-4 font-medium">
                Cargando usuarios...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <Users size={35} className="text-[#183B4E] mx-auto" />
              <h3 className="font-bold text-[#183B4E] mt-5">
                No se encontraron usuarios
              </h3>
              <p className="text-slate-500 text-sm mt-2">
                Probá cambiar los filtros o crear una nueva cuenta.
              </p>
            </div>
          ) : (
            <>
              {/* Escritorio */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#FAF9F6] text-slate-500 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-5">Correo electrónico</th>
                      <th className="px-6 py-5">CUIT</th>
                      <th className="px-6 py-5">Tipo</th>
                      <th className="px-6 py-5">Estado</th>
                      <th className="px-6 py-5">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#F0ECE5]">
                    {filteredUsers.map((user) => {
                      const isWholesale = Boolean(user.cuit);

                      return (
                        <tr key={user.id} className="hover:bg-[#FAF9F6] transition">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-[#E8F7F3] flex items-center justify-center">
                                <Mail size={18} className="text-[#20B8A5]" />
                              </div>
                              <span className="font-semibold text-[#183B4E]">
                                {user.email}
                              </span>
                            </div>
                          </td>

                          <td className="px-6 py-5 text-slate-600 font-medium">
                            {user.cuit || "—"}
                          </td>

                          <td className="px-6 py-5">
                            <span className="text-sm font-semibold text-[#183B4E]">
                              {isWholesale ? "Mayorista" : "Minorista"}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <span className={`inline-flex px-3 py-1.5 rounded-full text-xs font-bold ${getStatusStyle(user.estado_mayorista)}`}>
                              {user.estado_mayorista || "ACTIVO"}
                            </span>
                          </td>

                          <td className="px-6 py-5">
                            <div className="flex flex-wrap gap-2">
                              {user.estado_mayorista === "PENDIENTE" && (
                                <>
                                  <button
                                    onClick={() => handleStatusChange(user.id, "APROBADO")}
                                    disabled={updatingId === user.id}
                                    title="Aprobar solicitud"
                                    className="p-2 rounded-lg bg-[#E8F7F3] text-[#187968] hover:bg-[#D5F1EA] disabled:opacity-50"
                                  >
                                    <UserCheck size={18} />
                                  </button>

                                  <button
                                    onClick={() => handleStatusChange(user.id, "RECHAZADO")}
                                    disabled={updatingId === user.id}
                                    title="Rechazar solicitud"
                                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                                  >
                                    <UserX size={18} />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => openEditModal(user)}
                                title="Editar usuario"
                                className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                              >
                                <Pencil size={18} />
                              </button>

                              <button
                                onClick={() => handleDelete(user)}
                                title="Eliminar usuario"
                                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Celulares */}
              <div className="md:hidden divide-y divide-[#F0ECE5]">
                {filteredUsers.map((user) => {
                  const isWholesale = Boolean(user.cuit);

                  return (
                    <div key={user.id} className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-[#E8F7F3] flex items-center justify-center shrink-0">
                            <Mail size={18} className="text-[#20B8A5]" />
                          </div>

                          <div className="min-w-0">
                            <p className="font-bold text-[#183B4E] break-all">
                              {user.email}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              CUIT: {user.cuit || "No corresponde"}
                            </p>
                            <p className="text-sm text-slate-500 mt-1">
                              {isWholesale ? "Mayorista" : "Minorista"}
                            </p>
                          </div>
                        </div>

                        <span className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${getStatusStyle(user.estado_mayorista)}`}>
                          {user.estado_mayorista || "ACTIVO"}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-5">
                        {user.estado_mayorista === "PENDIENTE" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(user.id, "APROBADO")}
                              disabled={updatingId === user.id}
                              className="flex items-center gap-2 px-3 py-2 bg-[#E8F7F3] text-[#187968] rounded-xl text-sm font-bold disabled:opacity-50"
                            >
                              <UserCheck size={16} />
                              Aprobar
                            </button>

                            <button
                              onClick={() => handleStatusChange(user.id, "RECHAZADO")}
                              disabled={updatingId === user.id}
                              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold disabled:opacity-50"
                            >
                              <UserX size={16} />
                              Rechazar
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => openEditModal(user)}
                          className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold"
                        >
                          <Pencil size={16} />
                          Editar
                        </button>

                        <button
                          onClick={() => handleDelete(user)}
                          className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold"
                        >
                          <Trash2 size={16} />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="px-6 py-4 border-t border-[#E8E3DA] text-sm text-slate-500">
            Mostrando {filteredUsers.length} de {users.length} usuarios.
          </div>
        </section>

        {/* Resumen de solicitudes */}
        <section className="mt-6 bg-white border border-[#E8E3DA] rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <Clock size={22} className="text-[#F07858}" />
            <h2 className="text-lg font-extrabold text-[#183B4E]">
              Estado de solicitudes mayoristas
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-sm text-orange-600 font-semibold">Pendientes</p>
              <p className="text-2xl font-extrabold text-[#183B4E] mt-1">{pendingCount}</p>
            </div>

            <div className="bg-[#E8F7F3] rounded-xl p-4">
              <p className="text-sm text-[#187968] font-semibold">Aprobadas</p>
              <p className="text-2xl font-extrabold text-[#183B4E] mt-1">{approvedCount}</p>
            </div>

            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-sm text-red-600 font-semibold">Rechazadas</p>
              <p className="text-2xl font-extrabold text-[#183B4E] mt-1">{rejectedCount}</p>
            </div>
          </div>
        </section>

        {/* Modal de alta y edición */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-[#183B4E]/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl overflow-hidden">
              <div className="p-6 border-b border-[#E8E3DA] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#E8F7F3] flex items-center justify-center">
                    {editingUser ? (
                      <Pencil size={21} className="text-[#20B8A5]" />
                    ) : (
                      <UserPlus size={21} className="text-[#20B8A5]" />
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl font-extrabold text-[#183B4E]">
                      {editingUser ? "Editar usuario" : "Nuevo usuario"}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {editingUser
                        ? "Modificá los datos de la cuenta."
                        : "Registrá una nueva cuenta."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  className="p-2 rounded-lg hover:bg-slate-100"
                >
                  <X size={21} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-[#183B4E] mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="usuario@ejemplo.com"
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E3DA] outline-none focus:ring-2 focus:ring-[#20B8A5]"
                  />
                </div>

                {!editingUser && (
                  <div>
                    <label className="block text-sm font-bold text-[#183B4E] mb-2">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-4 py-3 rounded-xl border border-[#E8E3DA] outline-none focus:ring-2 focus:ring-[#20B8A5]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-bold text-[#183B4E] mb-2">
                    CUIT (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.cuit}
                    onChange={(e) =>
                      setForm({ ...form, cuit: e.target.value })
                    }
                    placeholder="Ej. 20123456789"
                    maxLength={13}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E3DA] outline-none focus:ring-2 focus:ring-[#20B8A5]"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Si ingresás un CUIT, la cuenta será mayorista. Si es nueva,
                    quedará pendiente de aprobación.
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm">
                    {error}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="flex-1 px-4 py-3 rounded-xl border border-[#E8E3DA] text-slate-600 font-bold hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#183B4E] text-white font-bold hover:bg-[#24536A] disabled:opacity-50"
                  >
                    <Save size={17} />
                    {saving
                      ? "Guardando..."
                      : editingUser
                        ? "Guardar cambios"
                        : "Crear usuario"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="mt-6 bg-[#E8F7F3] border border-[#CDECE4] rounded-2xl p-5 flex items-start gap-3">
          <ShieldCheck size={22} className="text-[#20B8A5] shrink-0" />
          <div>
            <p className="font-bold text-[#183B4E] text-sm">
              Administración de cuentas
            </p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              Las solicitudes mayoristas deben ser aprobadas por un administrador.
              Las cuentas minoristas se encuentran habilitadas para operar.
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
