import Cookies from "js-cookie";
import {
  createContext, ReactNode, useCallback, useContext, useEffect, useState,
} from "react";
import { manejarError, mostrarAlerta } from "../components/Alerts/Registrar";
import { AuthContextType } from "../interface/AuthContext/AuthContext";
import { Usuario } from "../interface/AuthContext/Usuario";
import apiClient from "../Utils/apliClient";

// Creamos el contexto de autenticación
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Creamos el proveedor de autenticación para envolver la aplicación
export const AuthProvider = ({ children }: { children: ReactNode }) => {

  const [autenticado, setAutenticado] = useState<boolean>(() => JSON.parse(localStorage.getItem("autenticado") || "false"));
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const usuarioGuardado = localStorage.getItem("usuario");
    return usuarioGuardado ? JSON.parse(usuarioGuardado) : null;
  });

  const login = (user: Usuario) => {
    localStorage.setItem("usuario", JSON.stringify(user));
    localStorage.setItem("autenticado", JSON.stringify(true));
    setUsuario(user);
    setAutenticado(true);
  };

  const logout = useCallback(async () => {
    const token = Cookies.get("token");
    const nombreUsu = usuario?.nombre_usuario;

    // Guardamos el nombre para el mensaje antes de limpiar el estado
    const usuarioNombre = usuario?.nombre_usuario || "Usuario";

    // Limpiamos la sesión local inmediatamente para evitar condiciones de carrera
    limpiarSesion();

    if (!token || !usuario) {
      // Si no hay sesión, igual navegamos o mostramos alerta si fuera necesario
      return;
    }

    // Intentamos notificar al servidor en segundo plano
    apiClient.post("/logout", { usuario: nombreUsu })
      .then((response) => {
        mostrarAlerta("Cierre de sesión", response.data.message || "Sesión cerrada correctamente", "info");
      })
      .catch((error) => {
        console.error("Error al cerrar sesión en el servidor:", error);
      });
  }, [usuario]);

  const getDataSesion = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) {
      return;
    }
    return apiClient.get(`/validaciones?token=${token}`)
      .then((response) => {
        const user = response.data;
        setUsuario(user);
        setAutenticado(true);
        localStorage.setItem("usuario", JSON.stringify(user));
        localStorage.setItem("autenticado", JSON.stringify(true));
        return user;
      })
      .catch((error) => {
        manejarError(error.response.data);
        throw error;
      });
  }, []);

  const limpiarSesion = () => {
    Cookies.remove("token", { path: "/" });
    localStorage.removeItem("usuario");
    localStorage.removeItem("autenticado");
    setUsuario(null);
    setAutenticado(false);
  };

  useEffect(() => {
    const cargarSesion = async () => {
      const usuarioGuardado = localStorage.getItem("usuario");
      const autenticacion = JSON.parse(localStorage.getItem("autenticado") || "false");

      if (usuarioGuardado && autenticacion) {
        setUsuario(JSON.parse(usuarioGuardado));
        setAutenticado(true);
      } else {
        await getDataSesion(); // Intentamos cargar la sesión
      }
    };

    cargarSesion();
  }, [getDataSesion]);

  return (
    <AuthContext.Provider value={{ autenticado, usuario, login, logout, getDataSesion }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para consumir el contexto de autenticación
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      "Error: Debe iniciar sesión para navegar en la aplicación."
    );
  }
  return context;
};