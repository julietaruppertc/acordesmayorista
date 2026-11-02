
import axios from "axios";

// URL del API Gateway.
// Se configura mediante el archivo .env del frontend.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor: agrega el token automáticamente.
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor: centraliza el manejo de errores.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("La sesión no es válida o expiró.");
    }

    if (error.response?.status === 409) {
      console.warn("Conflicto de operación:", error.response.data);
    }

    return Promise.reject(error);
  }
);

export default api;
