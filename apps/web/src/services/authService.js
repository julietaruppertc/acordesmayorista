
import api from "./api";

// Registrar un usuario particular o mayorista.
export const registerUser = async (userData) => {
  const response = await api.post("/auth/register", userData);
  return response.data;
};

// Iniciar sesión.
export const loginUser = async (credentials) => {
  const response = await api.post("/auth/login", credentials);

  const { token, user } = response.data;

  // Guardamos la sesión.
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("user", JSON.stringify(user));

  return user;
};

// Cerrar sesión.
export const logoutUser = () => {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
};

// Obtener el usuario de la sesión.
export const getCurrentUser = () => {
  const user = sessionStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};
