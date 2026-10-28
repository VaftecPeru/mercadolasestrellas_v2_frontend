import { useCallback, useRef, useState } from "react";
import apiClient from "../../Utils/apliClient";
import { Api_Global_ConsultaDocumento } from "../../service/ConsultaDocumentoApi";
import { mostrarAlerta } from "../../components/Alerts/Registrar";
import {
  ConsultaDniResponse,
  ConsultaRucResponse,
  ContribuyenteConsultado,
  PersonaConsultada,
} from "../../interface/ConsultaDocumento";

const REGEX_DNI = /^\d{8}$/;
const REGEX_RUC = /^\d{11}$/;
const MENSAJE_DNI_POR_DEFECTO = "No se pudo consultar el DNI. Ingrese los datos manualmente.";
const MENSAJE_RUC_POR_DEFECTO = "No se pudo consultar el RUC. Ingrese los datos manualmente.";

interface AxiosLikeError {
  isAxiosError?: boolean;
  response?: {
    data?: {
      message?: string;
    };
  };
}

const esAxiosError = (error: unknown): error is AxiosLikeError =>
  typeof error === "object" && error !== null && (error as AxiosLikeError).isAxiosError === true;

const obtenerMensaje = (error: unknown, fallback: string): string =>
  (esAxiosError(error) && error.response?.data?.message) || fallback;

export interface UseConsultaDocumentoReturn {
  consultando: boolean;
  consultarDni: (valor: string) => Promise<PersonaConsultada | null>;
  consultarRuc: (valor: string) => Promise<ContribuyenteConsultado | null>;
}

/**
 * Consulta los datos de personas (DNI vía RENIEC/BD local) y empresas (RUC vía SUNAT).
 * Solo consulta cuando el valor tiene formato peruano válido (8 dígitos para DNI, 11 para RUC),
 * almacena en caché respuestas obtenidas para no consumir créditos innecesarios de la API
 * y descarta respuestas de documentos si el usuario los modificó mientras se consultaba.
 * Ante cualquier fallo informa al usuario y devuelve null: el ingreso manual siempre es posible.
 */
export const useConsultaDocumento = (): UseConsultaDocumentoReturn => {
  const [consultando, setConsultando] = useState(false);
  const resultadosDni = useRef<Map<string, PersonaConsultada>>(new Map());
  const resultadosRuc = useRef<Map<string, ContribuyenteConsultado>>(new Map());
  const ultimoSolicitadoDni = useRef("");
  const ultimoSolicitadoRuc = useRef("");

  const consultarDni = useCallback(async (valor: string): Promise<PersonaConsultada | null> => {
    const dni = valor.trim();
    ultimoSolicitadoDni.current = dni;

    if (!REGEX_DNI.test(dni)) {
      setConsultando(false);
      return null;
    }

    const consultado = resultadosDni.current.get(dni);
    if (consultado) {
      setConsultando(false);
      return consultado;
    }

    setConsultando(true);
    try {
      const response = await apiClient.get<ConsultaDniResponse>(Api_Global_ConsultaDocumento.consultas.dni(dni));
      resultadosDni.current.set(dni, response.data.data);
      return ultimoSolicitadoDni.current === dni ? response.data.data : null;
    } catch (error) {
      if (ultimoSolicitadoDni.current === dni) {
        mostrarAlerta("Consulta de DNI", obtenerMensaje(error, MENSAJE_DNI_POR_DEFECTO), "warning");
      }
      return null;
    } finally {
      if (ultimoSolicitadoDni.current === dni) {
        setConsultando(false);
      }
    }
  }, []);

  const consultarRuc = useCallback(async (valor: string): Promise<ContribuyenteConsultado | null> => {
    const ruc = valor.trim();
    ultimoSolicitadoRuc.current = ruc;

    if (!REGEX_RUC.test(ruc)) {
      setConsultando(false);
      return null;
    }

    const consultado = resultadosRuc.current.get(ruc);
    if (consultado) {
      setConsultando(false);
      return consultado;
    }

    setConsultando(true);
    try {
      const response = await apiClient.get<ConsultaRucResponse>(Api_Global_ConsultaDocumento.consultas.ruc(ruc));
      resultadosRuc.current.set(ruc, response.data.data);
      return ultimoSolicitadoRuc.current === ruc ? response.data.data : null;
    } catch (error) {
      if (ultimoSolicitadoRuc.current === ruc) {
        mostrarAlerta("Consulta de RUC", obtenerMensaje(error, MENSAJE_RUC_POR_DEFECTO), "warning");
      }
      return null;
    } finally {
      if (ultimoSolicitadoRuc.current === ruc) {
        setConsultando(false);
      }
    }
  }, []);

  return { consultando, consultarDni, consultarRuc };
};

export default useConsultaDocumento;

