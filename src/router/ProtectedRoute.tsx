import React, { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import Cookies from "js-cookie";
import { useAuth } from "../context/AuthContext";
import { ID_ROL } from "../Utils/roles";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: number[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles }) => {
  const { autenticado, usuario, getDataSesion } = useAuth();
  const [loading, setLoading] = useState<boolean>(
    () => Boolean(Cookies.get("token") && !usuario)
  );

  useEffect(() => {
    let activo = true;

    const cargarDatosSesion = async () => {
      const token = Cookies.get("token");

      if (token && !usuario) {
        try {
          await getDataSesion();
        } catch {
          // El contexto limpia la sesión si el token ya no es válido.
        }
      }

      if (activo) {
        setLoading(false);
      }
    };

    cargarDatosSesion();

    return () => {
      activo = false;
    };
  }, [getDataSesion, usuario]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!autenticado || !usuario || !Cookies.get("token")) {
    return <Navigate to="/" replace />;
  }

  if (requiredRoles && !requiredRoles.includes(usuario.id_rol)) {
    return (
      <Navigate
        to={usuario.id_rol === ID_ROL.SOCIO ? "/home/reporte-deudas" : "/home"}
        replace
      />
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
