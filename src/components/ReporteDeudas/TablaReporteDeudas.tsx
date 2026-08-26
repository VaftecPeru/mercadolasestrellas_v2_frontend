import { Autocomplete, Box, FormControl, Pagination, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import useResponsive from '../../hooks/Responsive/useResponsive';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../PogressBar/ProgressBarV1';
import Contenedor from '../Shared/Contenedor';
import BotonExportar from '../Shared/BotonExportar';
import BotonAgregar from '../Shared/BotonAgregar';
import ContenedorBotones from '../Shared/ContenedorBotones';
import { Column, Data, Puesto } from '../../interface/ReporteDeudas/deudas';
import apiClient from "../../Utils/apliClient";
import { Api_Global_Reportes } from '../../service/ReporteApi';
import { Api_Global_Puestos } from '../../service/PuestoApi';
import { handleExport } from '../../Utils/exportUtils';
import { useAuth } from '../../context/AuthContext';
import { mostrarAlerta } from '../Alerts/Registrar';

const columns: readonly Column[] = [
  { id: "fecha", label: "Fec. Pago", minWidth: 50, align: "center" },
  { id: "servicio_descripcion", label: "Servicios", minWidth: 50, align: "left" },
  { id: "total", label: "Total (S/)", minWidth: 50, align: "center" },
  { id: "importe_pagado", label: "Imp. Pagado (S/)", minWidth: 50, align: "center" },
  { id: "importe_por_pagar", label: "Imp. Por pagar (S/)", minWidth: 50, align: "center" },
]

const TablaReporteDeudas: React.FC = () => {
  const { isTablet, isMobile } = useResponsive();
  const [mostrarDetalles, setMostrarDetalles] = useState<string | null>(null);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState<number>(0);
  const [deudas, setDeudas] = useState<Data[]>([]);
  const [searchParams] = useSearchParams();
  const idPuesto = searchParams.get("puesto");
  const [isLoading, setIsLoading] = useState(false);

  const { usuario } = useAuth();

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);

  const totalGeneral = deudas.reduce((acc, row) => ({
    total: acc.total + parseFloat(row.total),
    importe_pagado: acc.importe_pagado + parseFloat(row.importe_pagado),
    importe_por_pagar: acc.importe_por_pagar + parseFloat(row.importe_por_pagar),
  }), { total: 0, importe_pagado: 0, importe_por_pagar: 0 });

  const cambiarPagina = (event: React.ChangeEvent<unknown>, value: number) => {
    setPaginaActual(value);
    fetchDeudas(value, puestoSeleccionado);
  };

  // Si el parametro puesto existe, obtener las deudas del puesto
  useEffect(() => {
    if (idPuesto) {
      setPuestoSeleccionado(Number(idPuesto));
      fetchDeudas(undefined, Number(idPuesto));
    }
  }, [idPuesto]);

  // Para exportar
  const [exportFormat, setExportFormat] = useState<string>("");

  // Metodo para obtener los puestos
  useEffect(() => {
    const fetchPuestos = async () => {
      try {
        if (usuario?.rol !== "Socio") {
          const response = await apiClient.get(Api_Global_Puestos.puestos.buscar(1, 1000, "", "", "", ""));
          setPuestos(response.data.data);
        } else {
          const response = await apiClient.get(Api_Global_Puestos.puestos.buscar(1, 1000, "", "", "", usuario.id_usuario.toString()));
          setPuestos(response.data.data);
        }
      } catch (error) {
        console.log("Error:", error);
      }
    }
    fetchPuestos();
  }, [usuario]);

  // Metodo para obtener las deudas de un puesto
  const fetchDeudas = async (pagina: number = 1, idPuesto: number) => {
    setIsLoading(true)
    try {
      const response = await apiClient.get(Api_Global_Reportes.reportes.deudas(pagina, 15, idPuesto));
      setDeudas(response.data.data);
      setTotalPaginas(response.data.meta.last_page);
      setPaginaActual(response.data.meta.current_page);
    } catch (error) {
      console.log("Error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleExportReporteDeudas = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!puestoSeleccionado) {
      mostrarAlerta("Error", "Seleccione un puesto para exportar el reporte.", "warning");
      return;
    }
    const exportUrl = Api_Global_Reportes.reportes.exportarReporteDeudas(); // URL específica para servicios
    const fileNamePrefix = "lista-reporte-deudas"; // Nombre del archivo
    await handleExport(exportUrl, exportFormat, fileNamePrefix, setExportFormat, `id_puesto=${puestoSeleccionado}`);
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
          <FormControl fullWidth required
            sx={{
              width: isTablet ? "70%" : isMobile ? "100%" : "300px"
            }}
          >
            <Autocomplete
              options={puestos}
              getOptionLabel={(puesto) => puesto.numero_puesto} // Mostrar el numero del puesto
              value={puestos.find(p => Number(p.id_puesto) === puestoSeleccionado) || null}
              onChange={(event, value) => { // Obtener el id del puesto seleccionado
                if (value) { // Si se selecciona un puesto
                  setPuestoSeleccionado(Number(value.id_puesto)); // Guardar el id del puesto
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Seleccionar puesto" // Etiqueta del input
                  InputProps={{ ...params.InputProps }} // Propiedades del input
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id_puesto}>
                  {option.numero_puesto}
                </li>
              )}
              ListboxProps={{
                style: {
                  maxHeight: 270, // Altura máxima de la lista de opciones
                  overflow: 'auto', // Hacer scroll si hay muchos elementos
                },
              }}
              isOptionEqualToValue={(option, value) => option.id_puesto === value.id_puesto}
            />
          </FormControl>
          {/* Botón "Generar Reporte" */}
          <BotonAgregar
            exportar
            handleAction={() => fetchDeudas(undefined, puestoSeleccionado)}
            texto="Generar"
          />
        </Box>

        <BotonExportar
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          handleExport={handleExportReporteDeudas}
        />

      </ContenedorBotones>
      {isLoading ? (
        <LoadingSpinner /> // Mostrar el loading mientras se están cargando los datos
      ) : (
        <>
          {/* Tabla reporte deudas */}
          <Paper sx={{ width: "100%", overflow: "hidden", boxShadow: "none" }}>
            <TableContainer
              sx={{ maxHeight: "100%", borderRadius: "5px", border: "none" }}
            >
              <Table stickyHeader aria-label="sticky table">
                <TableHead>
                  <TableRow>
                    {isTablet || isMobile
                      ? <TableCell colSpan={columns.length}>
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
                          Lista de Deudas
                        </Typography>
                      </TableCell>
                      : columns.map((column) => (
                        <TableCell
                          key={column.id}
                          align={column.align}
                          style={{ minWidth: column.minWidth }}
                          sx={{
                            fontWeight: "bold",
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
                        <TableRow key={deuda.id_cuota} hover role="checkbox" tabIndex={-1}>
                          {isTablet || isMobile
                            ? <TableCell padding="checkbox" colSpan={columns.length}>
                              <Box sx={{ display: "flex", flexDirection: "column" }}>
                                <Typography
                                  sx={{
                                    p: 2,
                                    // Seleccionar la deuda y cambiar el color de fondo
                                    bgcolor: mostrarDetalles === deuda.id_cuota ? "#f0f0f0" : "inherit",
                                    "&:hover": {
                                      cursor: "pointer",
                                      bgcolor: "#f0f0f0",
                                    }
                                  }}
                                  onClick={() => setMostrarDetalles(
                                    mostrarDetalles === deuda.id_cuota ? null : deuda.id_cuota
                                  )}
                                >
                                  {deuda.mes} - {deuda.anio} - S/{deuda.total}
                                </Typography>
                                {mostrarDetalles === deuda.id_cuota && (
                                  <Box
                                    sx={{
                                      p: 2,
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 1
                                    }}
                                  >
                                    {columns.map((column) => {
                                      const value = column.id === "accion" ? "" : (deuda as any)[column.id];
                                      return (
                                        <Box key={column.id}>
                                          {/* Mostrar titulo del campo */}
                                          <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                                            {column.label}
                                          </Typography>
                                          {/* Mostrar los detalles de la deuda */}
                                          {Array.isArray(value) // Si es un array de servicios
                                            ? (value.map((servicio, index) => ( // Mostrar los servicios
                                              <Typography key={index}>
                                                {servicio.nombre}: S/ {servicio.costo}
                                              </Typography>
                                            ))
                                            ) : <Typography>
                                              {value}
                                            </Typography>
                                          }
                                        </Box>
                                      )
                                    })}
                                  </Box>
                                )}
                              </Box>
                            </TableCell>
                            : columns.map((column) => {
                              const value = column.id === "accion" ? "" : (deuda as any)[column.id];
                              return (
                                <TableCell
                                  key={column.id}
                                  align={column.align}
                                >
                                  {value}
                                </TableCell>
                              );
                            })}
                        </TableRow>
                      ))
                    : <TableRow>
                      <TableCell colSpan={columns.length} align="center">
                        No hay datos para mostrar. <br />
                        Para generar el reporte, seleccione un puesto y de clic en el botón "GENERAR".
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
                        S/ {Number(totalGeneral.total || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd", fontSize: '1rem', borderTop: '2px solid #1976d2' }}>
                        S/ {Number(totalGeneral.importe_pagado || 0).toFixed(2)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd", fontSize: '1rem', borderTop: '2px solid #1976d2' }}>
                        S/ {Number(totalGeneral.importe_por_pagar || 0).toFixed(2)}
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
                color="primary" />
            </Box>
          </Paper>
        </>
      )}
    </Contenedor>
  )

}

export default TablaReporteDeudas;