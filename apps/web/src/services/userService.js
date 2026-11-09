
import api from "./api";

// Consultar usuarios registrados.
export const getUsers = async () => {
  const response = await api.get("/auth/users");
  return response.data.users;
};

// Crear un usuario.
export const createUser = async (userData) => {
  const response = await api.post("/auth/users", userData);
  return response.data.user;
};

// Modificar email y CUIT.
export const updateUser = async (id, userData) => {
  const response = await api.patch(`/auth/users/${id}`, userData);
  return response.data.user;
};

// Eliminar un usuario.
export const deleteUser = async (id) => {
  const response = await api.delete(`/auth/users/${id}`);
  return response.data;
};

// Aprobar o rechazar una solicitud mayorista.
export const updateWholesaleStatus = async (id, estado) => {
  const response = await api.patch(
    `/auth/users/${id}/approve-wholesale`,
    { estado }
  );

  return response.data.user;
};
