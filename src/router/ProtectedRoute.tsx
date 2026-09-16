import React, { ReactNode, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Cookies from "js-cookie";
import { ID_ROL } from "../Utils/roles";


interface ProtectedRouteProps {
  children: ReactNode;
  requiredRoles?: number[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoles }) => {
  const navigate = useNavigate();
 
  const { autenticado, usuario, getDataSesion } = useAuth();
  const [loading, setLoading] = useState(true);

  const validar = () => {
    if (!autenticado) {
      navigate("/");
    }

    if (requiredRoles && !requiredRoles.includes(usuario ? usuario.id_rol : -1)) {
      if (usuario?.id_rol === ID_ROL.SOCIO) {
        navigate("/home/reporte-deudas");
      }
      navigate("/home");
    }
  };

  useEffect(() => {
    const cargarDatosSesion = async () => {
      const token = Cookies.get("token");
      if (token && !usuario) {
        await getDataSesion();
      }
      setLoading(false);
      validar();
    };
    cargarDatosSesion();
  }, [getDataSesion, usuario]);

  if (loading) {
    return <div>Cargando...</div>;
  }

  // Si el usuario está autenticado, mostramos el contenido
  // if (!autenticado) {
  //   return <Navigate to="/" />;
  // }

  // if (requiredRoles && !requiredRoles.includes(usuario ? usuario.id_rol : -1)) {
  //   if (usuario?.id_rol === ID_ROL.SOCIO) {
  //     return <Navigate to="/home/reporte-deudas" />;
  //   }
  //   return <Navigate to="/home" />;
  // }

  return <>{children}</>;

};

export default ProtectedRoute;
