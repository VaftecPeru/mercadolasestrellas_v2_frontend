import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Principal from "../Layout/Principal";
import Tabla from "../components/Asociados/TablaSocios";
import Dashboard from "../components/Dashboard";
import TablaServicios from "../components/Servicios/TablaServicios";
import TablaPagos from "../components/Pagos/TablaPagos";
import TablaCuota from "../components/Cuotas/TablaCuota";
import TablaPuestos from "../components/Puestos/TablaPuestos";
import TablaReportePagos from "../components/ReportePagos/TablaReportePagos";
import TablaReporteDeudas from "../components/ReporteDeudas/TablaReporteDeudas";
import Login from "../components/Login/Login";
import { AuthProvider } from "../context/AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import TablaReporteCuotasMetrado from "../components/ReporteCuotasMetrado/TablaCuotasMetrado";
import TablaCuotasPuesto from "../components/ReporteCuotasPuesto/TablaCuotasPuesto";
import BusquedaRapida from "../components/BusquedaRapida";
import TablaReporteResumen from "../components/ReporteResumen/TablaReporteResumen";
import CambiarPassword from "../components/Login/CambiarPassword";
import TablaUsuarios from "../components/Usuarios/TablaUsuarios";
import { ID_ROL } from "../Utils/roles";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />
  },
  {
    path: "/cambiar-password",
    element: <CambiarPassword />
  },
  {
    path: "/busqueda-rapida",
    element: <BusquedaRapida />
  },
  {
    path: "/home",
    element: (
    
      <ProtectedRoute>
        <Principal />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute requiredRoles={[ID_ROL.CAJERO, ID_ROL.ADMINISTRADOR]}>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "socios",
        element: (
          <ProtectedRoute requiredRoles={[ID_ROL.CAJERO, ID_ROL.ADMINISTRADOR]}>
            <Tabla />
          </ProtectedRoute>
        ),
      },
      {
        path: "usuarios",
        element: (
          <ProtectedRoute requiredRoles={[ID_ROL.ADMINISTRADOR]}>
            <TablaUsuarios />
          </ProtectedRoute>
        ),
      },
      {
        path: "puestos",
        element: (
          <ProtectedRoute requiredRoles={[ID_ROL.ADMINISTRADOR]}>
            <TablaPuestos />,
          </ProtectedRoute>
        ),
      },
      {
        path: "servicios",
        element: (
          <ProtectedRoute requiredRoles={[ID_ROL.ADMINISTRADOR]}>
            <TablaServicios />
          </ProtectedRoute>
        ),
      },
      {
        path: "cuotas",
        element: (
          <ProtectedRoute requiredRoles={[ID_ROL.ADMINISTRADOR]}>
            <TablaCuota />
          </ProtectedRoute>
        ),
      },
      {
        path: "pagos",
        element: (
          <ProtectedRoute requiredRoles={[ID_ROL.CAJERO, ID_ROL.ADMINISTRADOR]}>
            <TablaPagos />
          </ProtectedRoute>  
        ),
      },
      {
        path: "reporte-pagos",
        element: (
          <ProtectedRoute requiredRoles={[ID_ROL.CAJERO, ID_ROL.ADMINISTRADOR]}>
            <TablaReportePagos />
          </ProtectedRoute>
        ),
      },
      {
        path: "reporte-deudas",
        element: (
          <ProtectedRoute>
            <TablaReporteDeudas />
          </ProtectedRoute>
        ),
      },
      {
        path: "reporte-cuotas-metrado",
        element: (
          <ProtectedRoute requiredRoles={[ID_ROL.CAJERO, ID_ROL.ADMINISTRADOR]}>
            <TablaReporteCuotasMetrado />
          </ProtectedRoute>
        ),
      },
      {
        path: "reporte-cuotas-puesto",
        element: (
          <ProtectedRoute requiredRoles={[ID_ROL.CAJERO, ID_ROL.ADMINISTRADOR]}>
            <TablaCuotasPuesto />
          </ProtectedRoute>
        ),
      },
      {
        path: "reporte-resumen",
        element: (
          <ProtectedRoute requiredRoles={[ID_ROL.CAJERO, ID_ROL.ADMINISTRADOR]}>
            <TablaReporteResumen />
          </ProtectedRoute>
        ),
      }
    ],
  },
]);

const App = () => {
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
}

export default App;