import { Autocomplete, Box, FormControl, Pagination, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react'
import useResponsive from '../../hooks/Responsive/useResponsive';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../PogressBar/ProgressBarV1';
import Contenedor from '../Shared/Contenedor';
import BotonExportar from '../Shared/BotonExportar';
import BotonAgregar from '../Shared/BotonAgregar';
import ContenedorBotones from '../Shared/ContenedorBotones';
import { Column, Puesto, Socio, DeudaPendiente } from '../../interface/ReporteDeudas/deudas';
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

const columnsDeudas: readonly Column[] = [
  { id: "fecha", label: "Fecha Pago", minWidth: 90, align: "center" },
  { id: "nombre_servicio", label: "Servicios", minWidth: 200, align: "left" },
  { id: "total", label: "Total (S/)", minWidth: 100, align: "right" },
  { id: "a_cuenta", label: "Imp. Pagado (S/)", minWidth: 110, align: "right" },
  { id: "por_pagar", label: "Imp. Por pagar (S/)", minWidth: 120, align: "right" },
];

const columnasPagos = ["Fecha Pago", "Comprobante", "Concepto", "Monto (S/)"];

const soloFecha = (fecha: string) => (fecha ? String(fecha).split(" ")[0] : "");

const TablaReporteDeudas: React.FC = () => {
  const { isTablet, isMobile } = useResponsive();
  const [tab, setTab] = useState(0);
  const [mostrarDetalles, setMostrarDetalles] = useState<string | null>(null);
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

  const totalGeneralDeudas = deudas.reduce((acc, row) => ({
    total: acc.total + parseFloat(row.total || "0"),
    a_cuenta: acc.a_cuenta + parseFloat(row.a_cuenta || "0"),
    por_pagar: acc.por_pagar + parseFloat(row.por_pagar || "0"),
  }), { total: 0, a_cuenta: 0, por_pagar: 0 });

  const totalMontoPagos = pagos.reduce((acc, pago) =>
    acc + pago.detalle_pagos.reduce((a, detalle) => a + Number(detalle.importe || 0), 0), 0);

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
    setMostrarDetalles(null);
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
    <Paper sx={{ width: "100%", overflow: "hidden", boxShadow: "none" }}>
      <TableContainer
        sx={{ maxHeight: "100%", borderRadius: "5px", border: "none" }}
      >
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {isTablet || isMobile
                ? <TableCell colSpan={columnsDeudas.length}>
                  <Typography
                    sx={{
                      mt: 2,
                      mb: 1,
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      textAlign: "center",
                    }}
                  >
                    Deudas Pendientes
                  </Typography>
                </TableCell>
                : columnsDeudas.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                    sx={{
                      fontWeight: "bold",
                      backgroundColor: "#f5f5f5",
                    }}
                  >
                    {column.label}
                  </TableCell>
                ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {deudas.length > 0
              ? deudas
                .map((deuda) => (
                  <TableRow key={`${deuda.id_deuda}-${deuda.id_deuda_cuota}`} hover role="checkbox" tabIndex={-1}>
                    {isTablet || isMobile
                      ? <TableCell padding="checkbox" colSpan={columnsDeudas.length}>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                          <Typography
                            sx={{
                              p: 2,
                              bgcolor: mostrarDetalles === String(deuda.id_deuda_cuota) ? "#f0f0f0" : "inherit",
                              "&:hover": {
                                cursor: "pointer",
                                bgcolor: "#f0f0f0",
                              }
                            }}
                            onClick={() => setMostrarDetalles(
                              mostrarDetalles === String(deuda.id_deuda_cuota) ? null : String(deuda.id_deuda_cuota)
                            )}
                          >
                            {soloFecha(deuda.fecha)} - {deuda.nombre_servicio} - S/{deuda.por_pagar}
                          </Typography>
                          {mostrarDetalles === String(deuda.id_deuda_cuota) && (
                            <Box
                              sx={{
                                p: 2,
                                display: "flex",
                                flexDirection: "column",
                                gap: 1
                              }}
                            >
                              {columnsDeudas.map((column) => (
                                <Box key={column.id}>
                                  <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                                    {column.label}
                                  </Typography>
                                  <Typography>
                                    {(deuda as any)[column.id]}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      : columnsDeudas.map((column) => (
                        <TableCell
                          key={column.id}
                          align={column.align}
                        >
                          {(deuda as any)[column.id]}
                        </TableCell>
                      ))}
                  </TableRow>
                ))
              : <TableRow>
                <TableCell colSpan={columnsDeudas.length} align="center">
                  No hay deudas pendientes para los filtros seleccionados. <br />
                  Para generar el reporte, seleccione un puesto y/o un socio, y de clic en el botón "GENERAR".
                </TableCell>
              </TableRow>
            }
          </TableBody>
          {!isTablet && !isMobile && deudas.length > 0 && (
            <TableHead>
              <TableRow>
                <TableCell colSpan={2} align="right" sx={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                  TOTAL:
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd", fontSize: '1rem', borderTop: '2px solid #1976d2' }}>
                  S/ {Number(totalGeneralDeudas.total || 0).toFixed(2)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd", fontSize: '1rem', borderTop: '2px solid #1976d2' }}>
                  S/ {Number(totalGeneralDeudas.a_cuenta || 0).toFixed(2)}
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd", fontSize: '1rem', borderTop: '2px solid #1976d2' }}>
                  S/ {Number(totalGeneralDeudas.por_pagar || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableHead>
          )}
        </Table>
      </TableContainer>
      <Box sx={{ display: "flex", justifyContent: "center", marginTop: 3 }}>
        <Pagination
          count={totalPaginasDeudas}
          page={paginaDeudas}
          onChange={cambiarPagina}
          color="primary" />
      </Box>
    </Paper>
  );

  const renderTablaPagos = () => (
    <Paper sx={{ width: "100%", overflow: "hidden", boxShadow: "none" }}>
      <TableContainer
        sx={{ maxHeight: "100%", borderRadius: "5px", border: "none" }}
      >
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {isTablet || isMobile
                ? <TableCell colSpan={columnasPagos.length}>
                  <Typography
                    sx={{
                      mt: 2,
                      mb: 1,
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      textAlign: "center",
                    }}
                  >
                    Pagos Realizados
                  </Typography>
                </TableCell>
                : columnasPagos.map((label, index) => (
                  <TableCell
                    key={label}
                    align={index === 2 ? "left" : index === 3 ? "right" : "center"}
                    sx={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}
                  >
                    {label}
                  </TableCell>
                ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pagos.length > 0
              ? (isTablet || isMobile
                ? pagos.map((pago) => (
                  <TableRow key={pago.id_pago} hover tabIndex={-1}>
                    <TableCell>
                      <Box
                        onClick={() => setMostrarDetalles(mostrarDetalles === String(pago.id_pago) ? null : String(pago.id_pago))}
                        sx={{ cursor: 'pointer', py: 1 }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: '500' }}>
                          Fecha: {soloFecha(pago.fecha)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                          Comprobante: {pago.serie_numero}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                          Total Pago: S/ {Number(pago.total).toFixed(2)}
                        </Typography>
                        {mostrarDetalles === String(pago.id_pago) && (
                          <Box sx={{ mt: 1, pl: 2, borderLeft: '3px solid #1976d2', bgcolor: '#fafafa', p: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Conceptos:</Typography>
                            {pago.detalle_pagos.map((detalle, i) => (
                              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption">• {detalle.descripcion}</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>S/ {Number(detalle.importe).toFixed(2)}</Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
                : pagos.map((pago) => (
                  <React.Fragment key={pago.id_pago}>
                    {pago.detalle_pagos.map((detalle, detIdx) => (
                      <TableRow key={`${pago.id_pago}-${detIdx}`} hover tabIndex={-1}>
                        <TableCell align="center">{detIdx === 0 ? soloFecha(pago.fecha) : ""}</TableCell>
                        <TableCell align="center">{detIdx === 0 ? pago.serie_numero : ""}</TableCell>
                        <TableCell>{detalle.descripcion}</TableCell>
                        <TableCell align="right">{detIdx === pago.detalle_pagos.length - 1 ? `S/ ${Number(pago.total).toFixed(2)}` : Number(detalle.importe).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                )))
              : <TableRow>
                <TableCell colSpan={columnasPagos.length} align="center">
                  No hay pagos realizados para los filtros seleccionados. <br />
                  Para generar el reporte, seleccione un puesto y/o un socio, y de clic en el botón "GENERAR".
                </TableCell>
              </TableRow>
            }
          </TableBody>
          {!isTablet && !isMobile && pagos.length > 0 && (
            <TableHead>
              <TableRow>
                <TableCell colSpan={3} align="right" sx={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                  TOTAL:
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd", fontSize: '1rem', borderTop: '2px solid #1976d2' }}>
                  S/ {Number(totalMontoPagos || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableHead>
          )}
        </Table>
      </TableContainer>
      <Box sx={{ display: "flex", justifyContent: "center", marginTop: 3 }}>
        <Pagination
          count={totalPaginasPagos}
          page={paginaPagos}
          onChange={cambiarPagina}
          color="primary" />
      </Box>
    </Paper>
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
