
import { useState } from "react";
import {
  loginUser,
  logoutUser,
  registerUser,
} from "../services/authService";

import {
  mockLoginUser,
  mockLogoutUser,
  mockRegisterUser,
} from "../services/mockAuthService";

import { useAuthContext } from "../context/AuthContext";

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { updateUser, clearUser } = useAuthContext();

  const login = async (credentials) => {
    try {
      setLoading(true);
      setError("");

      const user = DEMO_MODE
        ? await mockLoginUser(credentials)
        : await loginUser(credentials);

      updateUser(user);

      return user;
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.message ||
        "No se pudo iniciar sesión.";

      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError("");

      const response = DEMO_MODE
        ? await mockRegisterUser(userData)
        : await registerUser(userData);

      return response;
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.message ||
        "No se pudo crear la cuenta.";

      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    if (DEMO_MODE) {
      mockLogoutUser();
    } else {
      logoutUser();
    }

    clearUser();
    setError("");
  };

  return {
    login,
    register,
    logout,
    loading,
    error,
  };
}
