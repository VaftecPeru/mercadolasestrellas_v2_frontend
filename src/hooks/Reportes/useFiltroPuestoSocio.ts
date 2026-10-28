import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../Utils/apliClient';
import { Api_Global_Puestos } from '../../service/PuestoApi';
import { Api_Global_Socios } from '../../service/SocioApi';
import { ordenarPuestosPorNumero } from '../../Utils/ordenarPuestos';
import { ordenarSociosPorNombre } from '../../Utils/ordenarSocios';
import { buscarSocioDelPuesto, puestoPerteneceASocio } from '../../Utils/puestoSocio';
import { useAuth } from '../../context/AuthContext';
import { Puesto, Socio } from '../../interface/ReporteDeudas/deudas';

export interface UseFiltroPuestoSocioOptions {
  onFiltrosChange?: () => void;
  onPuestoDesdeUrl?: (idPuesto: number) => void;
}

export interface UseFiltroPuestoSocioReturn {
  puestos: Puesto[];
  puestosDisponibles: Puesto[];
  socios: Socio[];
  puestoSeleccionado: number;
  socioSeleccionado: Socio | null;
  puestoObjetoSeleccionado: Puesto | null;
  setPuestoSeleccionado: React.Dispatch<React.SetStateAction<number>>;
  setSocioSeleccionado: React.Dispatch<React.SetStateAction<Socio | null>>;
  handlePuestoChange: (value: Puesto | null) => void;
  handleSocioChange: (value: Socio | null) => void;
  limpiarFiltros: () => void;
  isLoadingFiltros: boolean;
  tieneFiltrosActivos: boolean;
}

export const useFiltroPuestoSocio = ({
  onFiltrosChange,
  onPuestoDesdeUrl,
}: UseFiltroPuestoSocioOptions = {}): UseFiltroPuestoSocioReturn => {
  const { usuario } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const idPuestoUrl = searchParams.get('puesto');

  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState<number>(0);
  const [socioSeleccionado, setSocioSeleccionado] = useState<Socio | null>(null);
  const [isLoadingFiltros, setIsLoadingFiltros] = useState<boolean>(false);

  // Mantener referencias actualizadas de callbacks para evitar ciclos de render
  const onFiltrosChangeRef = useRef(onFiltrosChange);
  useEffect(() => {
    onFiltrosChangeRef.current = onFiltrosChange;
  }, [onFiltrosChange]);

  const onPuestoDesdeUrlRef = useRef(onPuestoDesdeUrl);
  useEffect(() => {
    onPuestoDesdeUrlRef.current = onPuestoDesdeUrl;
  }, [onPuestoDesdeUrl]);

  const urlProcesadaRef = useRef<string | null>(null);

  // Carga inicial concurrente de puestos y socios
  useEffect(() => {
    let isMounted = true;

    const cargarDatos = async () => {
      setIsLoadingFiltros(true);
      try {
        const [resPuestos, resSocios] = await Promise.all([
          apiClient.get(Api_Global_Puestos.puestos.buscar(1, 1000, '', '', '', '')),
          apiClient.get(Api_Global_Socios.socios.seleccionar()),
        ]);

        if (!isMounted) return;

        let puestosCargados: Puesto[] = [];
        if (resPuestos.data?.data) {
          puestosCargados = ordenarPuestosPorNumero(resPuestos.data.data);
          setPuestos(puestosCargados);
        }

        let sociosCargados: Socio[] = [];
        if (resSocios.data?.data) {
          const dataSocios = resSocios.data.data.map((item: any) => ({
            id_socio: String(item.id_socio),
            nombre_completo: item.nombre_completo,
          }));
          sociosCargados = ordenarSociosPorNombre(dataSocios);
          setSocios(sociosCargados);
        }

        // Auto-selección para rol Socio (id_rol === 2)
        const esRolSocio = usuario && Number(usuario.id_rol) === 2;
        if (esRolSocio && sociosCargados.length === 1) {
          setSocioSeleccionado(sociosCargados[0]);
          if (puestosCargados.length === 1) {
            setPuestoSeleccionado(Number(puestosCargados[0].id_puesto));
          }
        }
      } catch (error) {
        console.error('Error al cargar filtros de puestos y socios:', error);
      } finally {
        if (isMounted) {
          setIsLoadingFiltros(false);
        }
      }
    };

    cargarDatos();

    return () => {
      isMounted = false;
    };
  }, [usuario]);

  // Si existe el parámetro ?puesto= en la URL, auto-seleccionar puesto y su socio dueño
  useEffect(() => {
    if (idPuestoUrl && puestos.length > 0 && socios.length > 0) {
      if (urlProcesadaRef.current === idPuestoUrl) return;
      urlProcesadaRef.current = idPuestoUrl;

      const idNum = Number(idPuestoUrl);
      if (!Number.isNaN(idNum) && idNum > 0) {
        setPuestoSeleccionado(idNum);
        const puestoEncontrado = puestos.find((p) => Number(p.id_puesto) === idNum);
        if (puestoEncontrado) {
          const socioDueno = buscarSocioDelPuesto(socios, puestoEncontrado);
          if (socioDueno) {
            setSocioSeleccionado(socioDueno);
          }
        }
        onPuestoDesdeUrlRef.current?.(idNum);
      }
    } else if (!idPuestoUrl) {
      urlProcesadaRef.current = null;
    }
  }, [idPuestoUrl, puestos, socios]);

  // Puestos disponibles: si hay socio seleccionado, solo sus puestos; si no, todos los puestos
  const puestosDisponibles = useMemo(() => {
    if (!socioSeleccionado) {
      return puestos;
    }
    return puestos.filter((p) => puestoPerteneceASocio(p, socioSeleccionado.id_socio));
  }, [puestos, socioSeleccionado]);

  // Objeto puesto actualmente seleccionado (para consumo en Autocomplete value)
  const puestoObjetoSeleccionado = useMemo(() => {
    if (!puestoSeleccionado) return null;
    return puestos.find((p) => Number(p.id_puesto) === puestoSeleccionado) || null;
  }, [puestos, puestoSeleccionado]);

  // Selección de puesto -> auto-selecciona el socio dueño
  const handlePuestoChange = useCallback(
    (value: Puesto | null) => {
      if (value) {
        const nuevoIdPuesto = Number(value.id_puesto);
        setPuestoSeleccionado(nuevoIdPuesto);
        const socioDueno = buscarSocioDelPuesto(socios, value);
        if (socioDueno) {
          setSocioSeleccionado(socioDueno);
        }
      } else {
        setPuestoSeleccionado(0);
        if (searchParams.get('puesto')) {
          setSearchParams({}, { replace: true });
        }
      }
      onFiltrosChangeRef.current?.();
    },
    [socios, searchParams, setSearchParams]
  );

  // Selección de socio -> filtra puestos y auto-selecciona si tiene exactamente 1
  const handleSocioChange = useCallback(
    (value: Socio | null) => {
      const esRolSocio = usuario && Number(usuario.id_rol) === 2;
      const nuevoSocio = esRolSocio && !value && socios.length === 1 ? socios[0] : value;
      setSocioSeleccionado(nuevoSocio);

      if (nuevoSocio) {
        const puestosDelSocio = puestos.filter((p) => puestoPerteneceASocio(p, nuevoSocio.id_socio));

        if (puestosDelSocio.length === 1) {
          setPuestoSeleccionado(Number(puestosDelSocio[0].id_puesto));
        } else {
          // Si tiene múltiples puestos (o ninguno), verificar si el puesto actual le pertenece
          const puestoActualPertenece = puestosDelSocio.some(
            (p) => Number(p.id_puesto) === puestoSeleccionado
          );
          if (!puestoActualPertenece) {
            setPuestoSeleccionado(0);
          }
        }
        if (searchParams.get('puesto')) {
          setSearchParams({}, { replace: true });
        }
      } else {
        setPuestoSeleccionado(0);
        if (searchParams.get('puesto')) {
          setSearchParams({}, { replace: true });
        }
      }
      onFiltrosChangeRef.current?.();
    },
    [usuario, socios, puestos, puestoSeleccionado, searchParams, setSearchParams]
  );

  // Limpiar todos los filtros y parámetros de búsqueda
  const limpiarFiltros = useCallback(() => {
    const esRolSocio = usuario && Number(usuario.id_rol) === 2;
    if (esRolSocio && socios.length === 1) {
      setPuestoSeleccionado(puestos.length === 1 ? Number(puestos[0].id_puesto) : 0);
      setSocioSeleccionado(socios[0]);
    } else {
      setPuestoSeleccionado(0);
      setSocioSeleccionado(null);
    }
    urlProcesadaRef.current = null;
    if (searchParams.get('puesto')) {
      setSearchParams({}, { replace: true });
    }
    onFiltrosChangeRef.current?.();
  }, [usuario, socios, puestos, searchParams, setSearchParams]);

  const tieneFiltrosActivos = Boolean(puestoSeleccionado !== 0 || socioSeleccionado !== null);

  return {
    puestos,
    puestosDisponibles,
    socios,
    puestoSeleccionado,
    socioSeleccionado,
    puestoObjetoSeleccionado,
    setPuestoSeleccionado,
    setSocioSeleccionado,
    handlePuestoChange,
    handleSocioChange,
    limpiarFiltros,
    isLoadingFiltros,
    tieneFiltrosActivos,
  };
};

export default useFiltroPuestoSocio;
