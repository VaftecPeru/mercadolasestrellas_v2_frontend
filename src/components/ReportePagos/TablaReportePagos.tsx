import { Autocomplete, Box, FormControl, Pagination, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import useResponsive from '../../hooks/Responsive/useResponsive';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../PogressBar/ProgressBarV1';
import Contenedor from '../Shared/Contenedor';
import BotonExportar from '../Shared/BotonExportar';
import BotonAgregar from '../Shared/BotonAgregar';
import ContenedorBotones from '../Shared/ContenedorBotones';
import apiClient from "../../Utils/apliClient";
import { Api_Global_Reportes } from '../../service/ReporteApi';
import { Api_Global_Puestos } from '../../service/PuestoApi';
import { Api_Global_Socios } from '../../service/SocioApi';
import { ordenarPuestosPorNumero } from '../../Utils/ordenarPuestos';
import { ordenarSociosPorNombre } from '../../Utils/ordenarSocios';
import { handleExport } from '../../Utils/exportUtils';
import { Column, Data, Puesto, Socio } from '../../interface/ReportePagos/pagos';
import { nombreMes } from '../../Utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { mostrarAlerta } from '../Alerts/Registrar';

const columns: readonly Column[] = [
  { id: "fecha", label: "Fecha Pago", minWidth: 100, align: "center" },
  { id: "servicios", label: "Servicios", minWidth: 150, align: "left" },
  { id: "montos", label: "Total (S/)", minWidth: 100, align: "right" },
  { id: "total", label: "Imp. Pagado (S/)", minWidth: 120, align: "right" },
];

const TablaReportePagos: React.FC = () => {
  const { isTablet, isMobile } = useResponsive();

  const getAnio = (fecha: string) => {
    return new Date(fecha).getUTCFullYear();
  };

  const getMesNombre = (fecha: string) => {
    const mesIndex = new Date(fecha).getUTCMonth();
    return nombreMes(mesIndex);
  };

  const [mostrarDetalles, setMostrarDetalles] = useState<string | null>(null);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState<number | null>(null);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [socioSeleccionado, setSocioSeleccionado] = useState<Socio | null>(null);
  const [pagos, setPagos] = useState<Data[]>([]);
  const [exportFormat, setExportFormat] = useState<string>("");
  const [searchParams] = useSearchParams();
  const idPuestoQuery = searchParams.get("puesto");
  const [isLoading, setIsLoading] = useState(false);
  const [totalGeneral, setTotalGeneral] = useState<number>(0);

  const totalMonto = pagos.reduce((acc, pago) => {
    return acc + pago.detalle_pagos.reduce((a, detalle) => a + Number(detalle.importe), 0);
  }, 0);

  const { usuario } = useAuth();

  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const cambiarPagina = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPaginaActual(value);
    fetchPagos(value, puestoSeleccionado, socioSeleccionado);
  };

  useEffect(() => {
    const fetchPuestos = async () => {
      try {
        const response = await apiClient.get(Api_Global_Puestos.puestos.buscar(1, 1000, "", "", "", ""));
        setPuestos(ordenarPuestosPorNumero(response.data.data));
      } catch (error) {
        console.error("Error al cargar puestos:", error);
      }
    };
    if (usuario) fetchPuestos();
  }, [usuario]);

  useEffect(() => {
    const fetchSocios = async () => {
      try {
        const response = await apiClient.get(Api_Global_Socios.socios.seleccionar());
        const data = response.data.data.map((item: any) => ({
          id_socio: String(item.id_socio),
          nombre_completo: item.nombre_completo,
        }));
        setSocios(ordenarSociosPorNombre(data));
      } catch (error) {
        console.error("Error al cargar socios:", error);
      }
    };
    if (usuario) fetchSocios();
  }, [usuario]);

  // Puestos disponibles filtrados por socio si hay uno seleccionado
  const puestosDisponibles = React.useMemo(() => {
    if (!socioSeleccionado) {
      return puestos;
    }
    return puestos.filter((p) => {
      const matchId = p.id_socio && Number(p.id_socio) === Number(socioSeleccionado.id_socio);
      const matchNombre = p.socio && p.socio !== 'No asignado' && p.socio.trim().toLowerCase() === socioSeleccionado.nombre_completo.trim().toLowerCase();
      return matchId || matchNombre;
    });
  }, [puestos, socioSeleccionado]);

  // Al seleccionar un puesto -> auto-seleccionar el socio dueño
  const handlePuestoChange = (value: Puesto | null) => {
    if (value) {
      const nuevoIdPuesto = Number(value.id_puesto);
      setPuestoSeleccionado(nuevoIdPuesto);
      const socioDueno = socios.find((s) => {
        const matchId = value.id_socio && Number(s.id_socio) === Number(value.id_socio);
        const matchNombre = value.socio && value.socio !== 'No asignado' && s.nombre_completo.trim().toLowerCase() === value.socio.trim().toLowerCase();
        return matchId || matchNombre;
      });
      if (socioDueno) {
        setSocioSeleccionado(socioDueno);
      }
    } else {
      setPuestoSeleccionado(null);
    }
  };

  // Al seleccionar un socio -> filtrar puestos y auto-seleccionar si tiene 1 solo
  const handleSocioChange = (value: Socio | null) => {
    setSocioSeleccionado(value);
    if (value) {
      const puestosDelSocio = puestos.filter((p) => {
        const matchId = p.id_socio && Number(p.id_socio) === Number(value.id_socio);
        const matchNombre = p.socio && p.socio !== 'No asignado' && p.socio.trim().toLowerCase() === value.nombre_completo.trim().toLowerCase();
        return matchId || matchNombre;
      });

      if (puestosDelSocio.length === 1) {
        setPuestoSeleccionado(Number(puestosDelSocio[0].id_puesto));
      } else {
        const puestoActualPertenece = puestosDelSocio.some((p) => Number(p.id_puesto) === puestoSeleccionado);
        if (!puestoActualPertenece) {
          setPuestoSeleccionado(null);
        }
      }
    } else {
      setPuestoSeleccionado(null);
    }
  };

  useEffect(() => {
    if (idPuestoQuery && puestos.length > 0) {
      const id = Number(idPuestoQuery);
      setPuestoSeleccionado(id);
      const puestoEncontrado = puestos.find((p) => Number(p.id_puesto) === id);
      if (puestoEncontrado && socios.length > 0) {
        const socioDueno = socios.find((s) => {
          const matchId = puestoEncontrado.id_socio && Number(s.id_socio) === Number(puestoEncontrado.id_socio);
          const matchNombre = puestoEncontrado.socio && puestoEncontrado.socio !== 'No asignado' && s.nombre_completo.trim().toLowerCase() === puestoEncontrado.socio.trim().toLowerCase();
          return matchId || matchNombre;
        });
        if (socioDueno) {
          setSocioSeleccionado(socioDueno);
        }
      }
      fetchPagos(1, id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPuestoQuery, puestos, socios]);

  const fetchPagos = async (pagina: number = 1, idPuestoOverride?: number | null, socioOverride?: Socio | null) => {
    const id = idPuestoOverride !== undefined ? idPuestoOverride : puestoSeleccionado;
    const socio = socioOverride !== undefined ? socioOverride : socioSeleccionado;

    if (!id && !socio) {
      mostrarAlerta("Atención", "Por favor seleccione un puesto o un socio para generar el reporte.", "info");
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.get(
        Api_Global_Reportes.reportes.pagos(
          pagina,
          15,
          id || 0,
          socio?.nombre_completo || "",
          socio?.id_socio || ""
        )
      );
      setPagos(response.data.data);
      setTotalPaginas(response.data.meta.last_page);
      setPaginaActual(response.data.meta.current_page);
      setTotalGeneral(response.data.total_general || 0);
    } catch (error) {
      console.error("Error al obtener pagos:", error);
      setPagos([]);
      setTotalGeneral(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportReportePagos = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!puestoSeleccionado && !socioSeleccionado) {
      mostrarAlerta("Error", "Seleccione un puesto o un socio para exportar el reporte.", "warning");
      return;
    }
    const exportUrl = Api_Global_Reportes.reportes.exportarReportePagos();
    const fileNamePrefix = puestoSeleccionado
      ? `reporte-pagos-puesto-${puestoSeleccionado}`
      : `reporte-pagos-socio-${socioSeleccionado?.id_socio}`;

    const params = [
      puestoSeleccionado ? `id_puesto=${puestoSeleccionado}` : "",
      socioSeleccionado ? `id_socio=${socioSeleccionado.id_socio}` : "",
      socioSeleccionado ? `nombre_socio=${encodeURIComponent(socioSeleccionado.nombre_completo)}` : "",
    ].filter(Boolean).join("&");

    await handleExport(exportUrl, exportFormat, fileNamePrefix, setExportFormat, params);
  };

  return (
    <Contenedor>
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
          <FormControl
            fullWidth
            required
            sx={{ width: isTablet ? "70%" : isMobile ? "100%" : "250px" }}
          >
            <Autocomplete
              options={puestosDisponibles}
              getOptionLabel={(option) => option.numero_puesto || ""}
              value={puestos.find(p => Number(p.id_puesto) === puestoSeleccionado) || null}
              onChange={(_event, value) => {
                handlePuestoChange(value);
              }}
              renderInput={(params) => (
                <TextField {...params} label="Seleccionar puesto" variant="outlined" />
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
          <FormControl
            fullWidth
            required
            sx={{ width: isTablet ? "70%" : isMobile ? "100%" : "250px" }}
          >
            <Autocomplete
              options={socios}
              getOptionLabel={(socio) => socio.nombre_completo}
              value={socioSeleccionado}
              onChange={(_event, value) => {
                handleSocioChange(value);
              }}
              renderInput={(params) => (
                <TextField {...params} label="Seleccionar socio" variant="outlined" />
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

          <BotonAgregar
            exportar
            handleAction={() => fetchPagos(1, puestoSeleccionado, socioSeleccionado)}
            texto="Generar"
          />
        </Box>

        <BotonExportar
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          handleExport={handleExportReportePagos}
        />
      </ContenedorBotones>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <Paper sx={{ width: "100%", overflow: "hidden", boxShadow: "none", mt: 2 }}>
          <TableContainer sx={{ maxHeight: "calc(100vh - 350px)", borderRadius: "5px" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  {isTablet || isMobile ? (
                    <TableCell align="center">
                      <Typography sx={{ fontWeight: "bold", textTransform: "uppercase" }}>Lista de Pagos</Typography>
                    </TableCell>
                  ) : (
                    columns.map((column) => (
                      <TableCell
                        key={column.id}
                        align={column.align}
                        sx={{ fontWeight: "bold", backgroundColor: "#f5f5f5", minWidth: column.minWidth }}
                      >
                        {column.label}
                      </TableCell>
                    ))
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {pagos.length > 0 ? (
                  pagos.map((pago, pagoIdx) => (
                    <React.Fragment key={pago.id_pago}>
                      {pago.detalle_pagos.map((detalle, detIdx) => (
                        <TableRow
                          key={`${pago.id_pago}-${detIdx}`}
                          hover
                          sx={{
                            "& > td": {
                              borderBottom: detIdx === pago.detalle_pagos.length - 1 ? "2px solid #e0e0e0" : "1px solid #f0f0f0"
                            }
                          }}
                        >
                          {isTablet || isMobile ? (
                            detIdx === 0 && (
                              <TableCell>
                                <Box
                                  onClick={() => setMostrarDetalles(mostrarDetalles === String(pago.id_pago) ? null : String(pago.id_pago))}
                                  sx={{ cursor: 'pointer', py: 1 }}
                                >
                                  <Typography variant="body2" sx={{ fontWeight: '500' }}>
                                    Fecha: {pago.fecha}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                    Periodo: {getMesNombre(pago.fecha)} {getAnio(pago.fecha)}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                                    Total Pago: S/ {Number(pago.total).toFixed(2)}
                                  </Typography>

                                  {mostrarDetalles === String(pago.id_pago) && (
                                    <Box sx={{ mt: 1, pl: 2, borderLeft: '3px solid #1976d2', bgcolor: '#fafafa', p: 1 }}>
                                      <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Servicios:</Typography>
                                      {pago.detalle_pagos.map((det, i) => (
                                        <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                          <Typography variant="caption">• {det.descripcion}</Typography>
                                          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>S/ {det.importe}</Typography>
                                        </Box>
                                      ))}
                                      <Box sx={{ borderTop: '1px solid #ddd', mt: 1, pt: 0.5, display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Total:</Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>S/ {Number(pago.total).toFixed(2)}</Typography>
                                      </Box>
                                    </Box>
                                  )}
                                </Box>
                              </TableCell>
                            )
                          ) : (
                            <>
                              {/* Fecha */}
                              <TableCell align="center" sx={{ borderRight: '1px solid #f0f0f0' }}>
                                {pago.fecha}
                              </TableCell>

                              {/* Columna Servicio (Fila Individual) */}
                              <TableCell>
                                <Typography sx={{ fontSize: '0.85rem' }}>
                                  {detalle.descripcion}
                                </Typography>
                              </TableCell>

                              {/* Columna Monto Individual */}
                              <TableCell align="right">
                                <Typography sx={{ fontSize: '0.85rem', fontWeight: '500' }}>
                                  {Number(detalle.importe).toFixed(2)}
                                </Typography>
                              </TableCell>

                              {/* Imp. Pagado */}
                              <TableCell align="right" sx={{ borderLeft: '1px solid #f0f0f0', backgroundColor: '#fafafa' }}>
                                {detIdx === pago.detalle_pagos.length - 1 ? `S/ ${Number(pago.total).toFixed(2)}` : ""}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={isTablet || isMobile ? 1 : columns.length} align="center">
                      No hay datos para mostrar. <br />
                      Para generar el reporte, seleccione un puesto y/o un socio, y de clic en el botón "GENERAR".
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
              {!isTablet && !isMobile && pagos.length > 0 && (
                <TableHead>
                  <TableRow>
                    <TableCell colSpan={2} align="right" sx={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                      TOTAL:
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd", fontSize: '1rem', borderTop: '2px solid #1976d2' }}>
                      S/ {Number(totalMonto || 0).toFixed(2)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd", fontSize: '1rem', borderTop: '2px solid #1976d2' }}>
                      S/ {Number(totalGeneral || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableHead>
              )}
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "center", marginTop: 3 }}>
            <Pagination
              count={totalPaginas}
              page={paginaActual}
              onChange={cambiarPagina}
              color="primary"
            />
          </Box>
        </Paper>
      )}
    </Contenedor>
  );
};

export default TablaReportePagos;