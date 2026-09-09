import { Autocomplete, Box, FormControl, Pagination, Tabs, Tab, TextField } from '@mui/material';
import React, { useEffect, useState } from 'react'
import useResponsive from '../../hooks/Responsive/useResponsive';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../PogressBar/ProgressBarV1';
import Contenedor from '../Shared/Contenedor';
import BotonExportar from '../Shared/BotonExportar';
import BotonAgregar from '../Shared/BotonAgregar';
import ContenedorBotones from '../Shared/ContenedorBotones';
import ListaDeudasPendientes from './ListaDeudasPendientes';
import ListaPagosRealizados from './ListaPagosRealizados';
import { Puesto, Socio, DeudaPendiente } from '../../interface/ReporteDeudas/deudas';
import { Data as DataPago } from '../../interface/ReportePagos/pagos';
import apiClient from "../../Utils/apliClient";
import { Api_Global_Reportes } from '../../service/ReporteApi';
import { Api_Global_Puestos } from '../../service/PuestoApi';
import { Api_Global_Pagos } from '../../service/PagoApi';
import { ordenarPuestosPorNumero } from '../../Utils/ordenarPuestos';
import { ordenarSociosPorNombre } from '../../Utils/ordenarSocios';
import { handleExport } from '../../Utils/exportUtils';
import { useAuth } from '../../context/AuthContext';
import { mostrarAlerta } from '../Alerts/Registrar';

const MENSAJE_VACIO_DEUDAS = (
  <>
    No hay deudas pendientes para los filtros seleccionados. <br />
    Para generar el reporte, seleccione un puesto y/o un socio, y de clic en el botón "GENERAR".
  </>
);

const MENSAJE_VACIO_PAGOS = (
  <>
    No hay pagos realizados para los filtros seleccionados. <br />
    Para generar el reporte, seleccione un puesto y/o un socio, y de clic en el botón "GENERAR".
  </>
);

const TablaReporteDeudas: React.FC = () => {
  const { isTablet, isMobile } = useResponsive();
  const [tab, setTab] = useState(0);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState<number>(0);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [socioSeleccionado, setSocioSeleccionado] = useState<Socio | null>(null);
  const [deudas, setDeudas] = useState<DeudaPendiente[]>([]);
  const [pagos, setPagos] = useState<DataPago[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const idPuesto = searchParams.get("puesto");
  const [isLoading, setIsLoading] = useState(false);

  const { usuario } = useAuth();

  // Paginación por pestaña
  const [paginaDeudas, setPaginaDeudas] = useState(1);
  const [totalPaginasDeudas, setTotalPaginasDeudas] = useState(1);
  const [paginaPagos, setPaginaPagos] = useState(1);
  const [totalPaginasPagos, setTotalPaginasPagos] = useState(1);

  const cambiarPagina = (event: React.ChangeEvent<unknown>, value: number) => {
    if (tab === 0) {
      setPaginaDeudas(value);
      fetchDeudas(value);
    } else {
      setPaginaPagos(value);
      fetchPagos(value);
    }
  };

  const cambiarTab = (_event: React.SyntheticEvent, nuevoTab: number) => {
    setTab(nuevoTab);
  };

  // Si el parametro puesto existe, obtener las deudas del puesto
  useEffect(() => {
    if (idPuesto) {
      setPuestoSeleccionado(Number(idPuesto));
      fetchDeudas(1, Number(idPuesto), "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPuesto]);

  // Para exportar
  const [exportFormat, setExportFormat] = useState<string>("");

  // Metodo para obtener los puestos
  useEffect(() => {
    const fetchPuestos = async () => {
      try {
        if (usuario?.rol !== "Socio") {
          const response = await apiClient.get(Api_Global_Puestos.puestos.buscar(1, 1000, "", "", "", ""));
          setPuestos(ordenarPuestosPorNumero(response.data.data));
        } else {
          const response = await apiClient.get(Api_Global_Puestos.puestos.buscar(1, 1000, "", "", "", usuario.id_usuario.toString()));
          setPuestos(ordenarPuestosPorNumero(response.data.data));
        }
      } catch (error) {
        console.log("Error:", error);
      }
    }
    fetchPuestos();
  }, [usuario]);

  // Metodo para obtener los socios
  useEffect(() => {
    const fetchSocios = async () => {
      try {
        const response = await apiClient.get(Api_Global_Pagos.socios.listar());
        const data = response.data.data.map((item: any) => ({
          id_socio: String(item.id_socio),
          nombre_completo: item.nombre_completo,
        }));
        setSocios(ordenarSociosPorNombre(data));
      } catch (error) {
        console.log("Error al cargar socios:", error);
      }
    }
    fetchSocios();
  }, []);

  // Metodo para obtener las deudas pendientes de la pestaña actual
  const fetchDeudas = async (pagina: number = 1, idPuestoOverride?: number, nombreSocioOverride?: string) => {
    setIsLoading(true)
    try {
      const idPuestoFinal = idPuestoOverride ?? puestoSeleccionado;
      const nombreSocioFinal = nombreSocioOverride ?? (socioSeleccionado?.nombre_completo ?? "");
      const response = await apiClient.get(
        Api_Global_Reportes.reportes.deudasPendientes(pagina, 15, idPuestoFinal, nombreSocioFinal.trim())
      );
      setDeudas(response.data.data);
      setTotalPaginasDeudas(response.data.meta.last_page);
      setPaginaDeudas(response.data.meta.current_page);
    } catch (error) {
      console.log("Error:", error);
      setDeudas([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Metodo para obtener los pagos realizados de la pestaña actual
  const fetchPagos = async (pagina: number = 1, idPuestoOverride?: number, nombreSocioOverride?: string) => {
    setIsLoading(true)
    try {
      const idPuestoFinal = idPuestoOverride ?? puestoSeleccionado;
      const nombreSocioFinal = nombreSocioOverride ?? (socioSeleccionado?.nombre_completo ?? "");
      const response = await apiClient.get(
        Api_Global_Reportes.reportes.pagos(pagina, 15, idPuestoFinal, nombreSocioFinal.trim())
      );
      setPagos(response.data.data);
      setTotalPaginasPagos(response.data.meta.last_page);
      setPaginaPagos(response.data.meta.current_page);
    } catch (error) {
      console.log("Error:", error);
      setPagos([]);
    } finally {
      setIsLoading(false);
    }
  }

  const generar = () => {
    if (!puestoSeleccionado && !socioSeleccionado) {
      mostrarAlerta("Atención", "Seleccione un puesto o un socio para generar el reporte.", "info");
      return;
    }
    if (tab === 0) {
      fetchDeudas(1);
    } else {
      fetchPagos(1);
    }
  };

  const handleExportReporte = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!puestoSeleccionado && !socioSeleccionado) {
      mostrarAlerta("Error", "Seleccione un puesto o un socio para exportar el reporte.", "warning");
      return;
    }
    const nombreSocio = socioSeleccionado?.nombre_completo.trim() || "";
    const params = [
      puestoSeleccionado ? `id_puesto=${puestoSeleccionado}` : "",
      nombreSocio ? `nombre_socio=${encodeURIComponent(nombreSocio)}` : "",
      tab === 1 ? "modo=detalle" : "",
    ].filter(Boolean).join("&");

    const exportUrl = tab === 0
      ? Api_Global_Reportes.reportes.exportarReporteDeudas()
      : Api_Global_Reportes.reportes.exportarReportePagos();
    const fileNamePrefix = tab === 0 ? "reporte-deudas-pendientes" : "reporte-pagos-realizados";
    await handleExport(exportUrl, exportFormat, fileNamePrefix, setExportFormat, params);
  };

  const renderTablaDeudas = () => (
    <>
      <ListaDeudasPendientes
        deudas={deudas}
        tituloMovil="Deudas Pendientes"
        mensajeVacio={MENSAJE_VACIO_DEUDAS}
      />
      <Box sx={{ display: "flex", justifyContent: "center", marginTop: 3 }}>
        <Pagination
          count={totalPaginasDeudas}
          page={paginaDeudas}
          onChange={cambiarPagina}
          color="primary" />
      </Box>
    </>
  );

  const renderTablaPagos = () => (
    <>
      <ListaPagosRealizados
        pagos={pagos}
        tituloMovil="Pagos Realizados"
        mensajeVacio={MENSAJE_VACIO_PAGOS}
      />
      <Box sx={{ display: "flex", justifyContent: "center", marginTop: 3 }}>
        <Pagination
          count={totalPaginasPagos}
          page={paginaPagos}
          onChange={cambiarPagina}
          color="primary" />
      </Box>
    </>
  );

  return (
    <Contenedor>
      <Tabs
        value={tab}
        onChange={cambiarTab}
        textColor="primary"
        indicatorColor="primary"
        sx={{ mb: 2 }}
      >
        <Tab label="Deudas Pendientes" />
        <Tab label="Pagos Realizados" />
      </Tabs>

      <ContenedorBotones reporte>
        <Box
          sx={{
            width: isTablet || isMobile ? "100%" : "auto",
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
            alignItems: "center",
            ml: isTablet || isMobile ? "0px" : "10px",
            mr: isMobile ? "0px" : "auto",
          }}
        >
          {/* Seleccionar puesto */}
          <FormControl fullWidth required
            sx={{
              width: isTablet ? "70%" : isMobile ? "100%" : "250px"
            }}
          >
            <Autocomplete
              options={puestos}
              getOptionLabel={(puesto) => puesto.numero_puesto}
              value={puestos.find(p => Number(p.id_puesto) === puestoSeleccionado) || null}
              onChange={(event, value) => {
                setPuestoSeleccionado(value ? Number(value.id_puesto) : 0);
                if (!value && idPuesto) {
                  setSearchParams({}, { replace: true });
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Seleccionar puesto"
                  InputProps={{ ...params.InputProps }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id_puesto}>
                  {option.numero_puesto}
                </li>
              )}
              ListboxProps={{
                style: {
                  maxHeight: 270,
                  overflow: 'auto',
                },
              }}
              isOptionEqualToValue={(option, value) => option.id_puesto === value.id_puesto}
            />
          </FormControl>
          {/* Seleccionar socio */}
          <FormControl fullWidth required
            sx={{
              width: isTablet ? "70%" : isMobile ? "100%" : "250px"
            }}
          >
            <Autocomplete
              options={socios}
              getOptionLabel={(socio) => socio.nombre_completo}
              value={socioSeleccionado}
              onChange={(event, value) => {
                setSocioSeleccionado(value);
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Seleccionar socio"
                  InputProps={{ ...params.InputProps }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id_socio}>
                  {option.nombre_completo}
                </li>
              )}
              ListboxProps={{
                style: {
                  maxHeight: 270,
                  overflow: 'auto',
                },
              }}
              isOptionEqualToValue={(option, value) => option.id_socio === value.id_socio}
              noOptionsText="No se encontraron socios"
            />
          </FormControl>
          {/* Botón "Generar Reporte" */}
          <BotonAgregar
            exportar
            handleAction={generar}
            texto="Generar"
          />
        </Box>

        <BotonExportar
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          handleExport={handleExportReporte}
        />

      </ContenedorBotones>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        tab === 0 ? renderTablaDeudas() : renderTablaPagos()
      )}
    </Contenedor>
  )
}

export default TablaReporteDeudas;
