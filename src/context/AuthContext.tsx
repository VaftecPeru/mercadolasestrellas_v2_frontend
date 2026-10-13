import Cookies from "js-cookie";
import {
  createContext, ReactNode, useCallback, useContext, useEffect, useState,
} from "react";
import { manejarError, mostrarAlerta } from "../components/Alerts/Registrar";
import { AuthContextType } from "../interface/AuthContext/AuthContext";
import { Usuario } from "../interface/AuthContext/Usuario";
import apiClient from "../Utils/apliClient";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [autenticado, setAutenticado] = useState<boolean>(false);
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const login = (user: Usuario) => {
    localStorage.setItem("usuario", JSON.stringify(user));
    localStorage.setItem("autenticado", JSON.stringify(true));
    setUsuario(user);
    setAutenticado(true);
  };

  const limpiarSesion = useCallback(() => {
    Cookies.remove("token", { path: "/" });
    localStorage.removeItem("usuario");
    localStorage.removeItem("autenticado");
    setUsuario(null);
    setAutenticado(false);
  }, []);

  const logout = useCallback(async () => {
    const token = Cookies.get("token");

    try {
      if (token) {
        const response = await apiClient.post("/logout");
        mostrarAlerta(
          "Cierre de sesión",
          response.data.message || "Sesión cerrada correctamente",
          "info"
        );
      }
    } catch (error) {
      console.error("Error al cerrar sesión en el servidor:", error);
    } finally {
      limpiarSesion();
    }
  }, [limpiarSesion]);

  const getDataSesion = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) {
      limpiarSesion();
      return undefined;
    }

    try {
      const response = await apiClient.get("/validaciones");
      const user = response.data;
      setUsuario(user);
      setAutenticado(true);
      localStorage.setItem("usuario", JSON.stringify(user));
      localStorage.setItem("autenticado", JSON.stringify(true));
      return user;
    } catch (error: any) {
      const payload = error?.response?.data;
      if (payload) {
        manejarError(payload);
      }
      limpiarSesion();
      throw error;
    }
  }, [limpiarSesion]);

  useEffect(() => {
    // El almacenamiento local es solo una caché: validar el token con el backend
    // al cargar para no reactivar una cuenta bloqueada o una sesión revocada.
    getDataSesion().catch(() => {
      // El método ya gestiona la limpieza y notificación de errores.
    });
  }, [getDataSesion]);

  return (
    <AuthContext.Provider value={{ autenticado, usuario, login, logout, getDataSesion }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("Error: Debe iniciar sesión para navegar en la aplicación.");
  }
  return context;
};
