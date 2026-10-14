import { Autocomplete, Box, FormControl, Pagination, Tabs, Tab, TextField } from '@mui/material';
import React, { useState } from 'react';
import useResponsive from '../../hooks/Responsive/useResponsive';
import LoadingSpinner from '../PogressBar/ProgressBarV1';
import Contenedor from '../Shared/Contenedor';
import BotonExportar from '../Shared/BotonExportar';
import BotonAgregar from '../Shared/BotonAgregar';
import BotonLimpiar from '../Shared/BotonLimpiar';
import ContenedorBotones from '../Shared/ContenedorBotones';
import ListaDeudasPendientes from './ListaDeudasPendientes';
import ListaPagosRealizados from './ListaPagosRealizados';
import { Socio, DeudaPendiente } from '../../interface/ReporteDeudas/deudas';
import { Data as DataPago } from '../../interface/ReportePagos/pagos';
import apiClient from '../../Utils/apliClient';
import { Api_Global_Reportes } from '../../service/ReporteApi';
import { handleExport } from '../../Utils/exportUtils';
import { mostrarAlerta } from '../Alerts/Registrar';
import useFiltroPuestoSocio from '../../hooks/Reportes/useFiltroPuestoSocio';

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
  const [deudas, setDeudas] = useState<DeudaPendiente[]>([]);
  const [pagos, setPagos] = useState<DataPago[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  // Los resultados mostrados dejan de ser válidos cuando el usuario cambia o limpia los filtros
  const limpiarResultados = () => {
    setDeudas([]);
    setPagos([]);
    setPaginaDeudas(1);
    setTotalPaginasDeudas(1);
    setPaginaPagos(1);
    setTotalPaginasPagos(1);
  };

  const {
    puestos,
    puestosDisponibles,
    socios,
    puestoSeleccionado,
    socioSeleccionado,
    handlePuestoChange,
    handleSocioChange,
    limpiarFiltros,
  } = useFiltroPuestoSocio({
    onFiltrosChange: limpiarResultados,
    // Si llega el parametro puesto, obtener las deudas del puesto (sin filtrar por socio)
    onPuestoDesdeUrl: (idPuesto) => fetchDeudas(1, idPuesto, null),
  });

  // Para exportar
  const [exportFormat, setExportFormat] = useState<string>("");

  // Metodo para obtener las deudas pendientes de la pestaña actual
  // socioOverride: null fuerza consultar sin socio (p. ej. al llegar con ?puesto= desde la URL)
  const fetchDeudas = async (pagina: number = 1, idPuestoOverride?: number, socioOverride?: Socio | null) => {
    setIsLoading(true)
    try {
      const idPuestoFinal = idPuestoOverride ?? puestoSeleccionado;
      const socioFinal = socioOverride !== undefined ? socioOverride : socioSeleccionado;
      const response = await apiClient.get(
        Api_Global_Reportes.reportes.deudasPendientes(pagina, 15, idPuestoFinal, socioFinal?.id_socio ?? "")
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
  const fetchPagos = async (pagina: number = 1, idPuestoOverride?: number, socioOverride?: Socio | null) => {
    setIsLoading(true)
    try {
      const idPuestoFinal = idPuestoOverride ?? puestoSeleccionado;
      const socioFinal = socioOverride !== undefined ? socioOverride : socioSeleccionado;
      const response = await apiClient.get(
        Api_Global_Reportes.reportes.pagos(pagina, 15, idPuestoFinal, socioFinal?.id_socio ?? "")
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
    const idSocio = socioSeleccionado?.id_socio || "";
    const params = [
      puestoSeleccionado ? `id_puesto=${puestoSeleccionado}` : "",
      idSocio ? `id_socio=${idSocio}` : "",
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
        variant="fullWidth"
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
              options={puestosDisponibles}
              getOptionLabel={(puesto) => puesto.numero_puesto}
              value={puestos.find(p => Number(p.id_puesto) === puestoSeleccionado) || null}
              onChange={(_event, value) => {
                handlePuestoChange(value);
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
              noOptionsText="No se encontraron puestos"
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
              onChange={(_event, value) => {
                handleSocioChange(value);
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
          {/* Botón "Limpiar Filtros" */}
          <BotonLimpiar handleAction={limpiarFiltros} />
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
