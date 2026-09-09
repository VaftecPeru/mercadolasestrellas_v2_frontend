import { useCallback, useState } from "react";
import apiClient from "../../Utils/apliClient";
import { Api_Global_Reportes } from "../../service/ReporteApi";
import { DeudaPendiente } from "../../interface/ReporteDeudas/deudas";
import { Data as DataPago } from "../../interface/ReportePagos/pagos";

const useReporteSocio = (idSocio: number | null) => {
  const [deudas, setDeudas] = useState<DeudaPendiente[]>([]);
  const [pagos, setPagos] = useState<DataPago[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarDeudas = useCallback(async () => {
    if (!idSocio) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(Api_Global_Reportes.reportes.socioDeudas(idSocio));
      setDeudas(response.data.data || []);
    } catch (error) {
      console.error("Error al cargar deudas del socio:", error);
      setDeudas([]);
      setError("No se pudieron cargar las deudas del socio.");
    } finally {
      setIsLoading(false);
    }
  }, [idSocio]);

  const cargarPagos = useCallback(async () => {
    if (!idSocio) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(Api_Global_Reportes.reportes.socioPagos(idSocio));
      setPagos(response.data.data || []);
    } catch (error) {
      console.error("Error al cargar pagos del socio:", error);
      setPagos([]);
      setError("No se pudieron cargar los pagos del socio.");
    } finally {
      setIsLoading(false);
    }
  }, [idSocio]);

  const reset = useCallback(() => {
    setDeudas([]);
    setPagos([]);
    setError(null);
  }, []);

  return { deudas, pagos, isLoading, error, cargarDeudas, cargarPagos, reset };
};

export default useReporteSocio;
