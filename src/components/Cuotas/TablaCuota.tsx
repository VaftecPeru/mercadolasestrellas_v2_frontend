import * as React from "react";
import { useState, useEffect } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Box,
  Pagination,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
} from "@mui/material";
import {
  Download,
  Search,
  WhatsApp,
  ExpandLess,
  ExpandMore,
  SaveAs,
  DeleteForever,
} from "@mui/icons-material";
import * as XLSX from 'xlsx';
// import GenerarCuota from "./GenerarCuota";
import GenerarCuotaTabs from "./GenerarCuotaTabs";
import useResponsive from "../../hooks/Responsive/useResponsive";
import LoadingSpinner from "../PogressBar/ProgressBarV1";
import Contenedor from "../Shared/Contenedor";
import ContenedorBotones from "../Shared/ContenedorBotones";
import BotonExportar from "../Shared/BotonExportar";
import BotonAgregar from "../Shared/BotonAgregar";
import { formatDate } from "../../Utils/dateUtils";
import { columns } from "../../Columns/Cuotas";
import { Api_Global_Cuotas } from "../../service/CuotaApi";
import { handleExport } from "../../Utils/exportUtils";
import apiClient from "../../Utils/apliClient";
import { Cuotas, IMeses } from "../../interface/Cuota";
import { manejarError, mostrarAlerta, mostrarAlertaConfirmacion } from "../Alerts/Registrar";

const optMeses = [
  { value: "", label: "Mes" },
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
];

const anioActual = new Date().getFullYear();
const anios: any = [
  { value: "", label: "Año" },
  ...[...Array(anioActual - 2011)].map((_, i) => {
    const anio = String(anioActual - i);
    return { value: anio, label: anio };
  }),
];

const TablaCuota: React.FC = () => {
  const { isTablet, isMobile } = useResponsive();
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [mostrarDetalles, setMostrarDetalles] = useState<string | null>(null);
  const [iMeses, setIMeses] = useState<IMeses[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [paginaActual, setPaginaActual] = useState(1);
  const [exportFormat, setExportFormat] = useState<string>("");
  const [anio, setAnio] = useState<string>("");
  const [mes, setMes] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [cuotas, setCuotas] = useState<Cuotas[]>([]);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<Cuotas | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = (cuota?: Cuotas) => {
    setCuotaSeleccionada(cuota || null);
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setCuotaSeleccionada(null);
    listarCuotas();
  }

  const handleExportCuotas = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const exportUrl = Api_Global_Cuotas.cuotas.exportar();
    const fileNamePrefix = "lista-cuotas";
    await handleExport(exportUrl, exportFormat, fileNamePrefix, setExportFormat);
  };

  const handleSearchCuota = () => {
    listarCuotas();
  }

  const listarCuotas = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(Api_Global_Cuotas.cuotas.listar(page, anio, mes));
      const data = response.data.data.map((item: Cuotas) => ({
        id_cuota: item.id_cuota,
        fecha_emision: formatDate(item.fecha_emision),
        fecha_vencimiento: formatDate(item.fecha_vencimiento),
        importe: item.importe,
        puestos_asignados: item.puestos_asignados,
        servicios: item.servicios,
      }));
      setCuotas(data);
      setTotalPages(response.data.meta.last_page);
      setPaginaActual(response.data.meta.current_page);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const CambioDePagina = (event: React.ChangeEvent<unknown>, value: number) => {
    setPaginaActual(value);
    listarCuotas(value)
  };

  const eliminarCuota = async (id_cuota: string) => {
    try {
      const response = await apiClient.delete(Api_Global_Cuotas.cuotas.eliminar(id_cuota));
      if (response.status === 200) {
        mostrarAlerta("Éxito", "La cuota ha sido eliminada correctamente", "success");
        listarCuotas(paginaActual);
      }
    } catch (error) {
      manejarError(error);
    }
  };

  const handleAccionesCuota = async (accion: number, cuota: Cuotas) => {
    const puestos = cuota.puestos_asignados
      ? cuota.puestos_asignados.map(p => p.numero).join(", ")
      : "Todos los puestos";

    const servicios = cuota.servicios.map(s => `${s.nombre} (S/ ${s.costo_unitario})`).join("\n");

    const data = [
      ["ID CUOTA", cuota.id_cuota],
      ["Fec. Emisión", cuota.fecha_emision],
      ["Fec. Vencimiento", cuota.fecha_vencimiento],
      ["Importe Total", cuota.importe],
      ["Puestos", puestos],
      ["Servicios", servicios],
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cuota Detalle");

    ws['!cols'] = [{ wch: 20 }, { wch: 30 }];

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

    if (accion === 1) {
      // Descargar
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Cuota-${cuota.id_cuota}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // WhatsApp
      const mensaje = `Detalle de la Cuota #${cuota.id_cuota}:\nEmisión: ${cuota.fecha_emision}\nVencimiento: ${cuota.fecha_vencimiento}\nImporte: S/ ${cuota.importe}\nServicios:\n${servicios}\n\nPuedes descargar el detalle aquí: ${url}`;
      const urlWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
      window.open(urlWhatsApp, '_blank');
    }
  };

  useEffect(() => {
    listarCuotas(paginaActual);
  }, []);

  useEffect(() => {
    setIMeses(optMeses);
  }, []);

  return (
    <Contenedor>
      <ContenedorBotones>
        <BotonAgregar
          handleAction={() => handleOpen()}
          texto="Generar Cuota"
        />
        {/* <GenerarCuota
          open={open}
          handleClose={handleClose}
        /> */}
        <GenerarCuotaTabs
          open={open}
          handleClose={handleClose}
          cuota={cuotaSeleccionada}
        />
        <BotonExportar
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          handleExport={handleExportCuotas}
        />
      </ContenedorBotones>
      {isMobile && (
        <Box
          sx={{
            width: "100%",
            borderTop: "1px solid rgba(0, 0, 0, 0.25)",
            borderBottom: !mostrarFiltros ? "1px solid rgba(0, 0, 0, 0.25)" : "none",
            pt: "1rem",
          }}
        >
          <Button
            variant="contained"
            sx={{
              height: "50px",
              width: "100%",
              borderRadius: "30px",
              mb: "1rem",
            }}
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            endIcon={mostrarFiltros
              ? <ExpandLess />
              : <ExpandMore />}
          >
            {mostrarFiltros ? "Ocultar Filtros" : "Mostrar Filtros"}
          </Button>
        </Box>
      )}

      {(!isMobile || mostrarFiltros) && (
        <Box
          sx={{
            padding: isTablet || isMobile ? "15px 0" : "15px 35px",
            borderTop: "1px solid rgba(0, 0, 0, 0.25)",
            borderBottom: "1px solid rgba(0, 0, 0, 0.25)",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: isMobile ? "left" : "center",
          }}
        >
          <Typography
            sx={{
              display: isTablet ? "none" : "block",
              textAlign: "left",
              fontWeight: "bold",
              mr: 2,
              mt: isMobile ? 1 : 0,
              mb: isMobile ? 2 : 0
            }}
          >
            Buscar por:
          </Typography>
          <FormControl
            sx={{
              width: isMobile ? "100%" : "200px",
              mr: isMobile ? 0 : 1,
            }}
          >
            <InputLabel id="cuota-anio-label">Año</InputLabel>
            {/* <Select value={anio} onChange={(e) => setAnio(e.target.value)} label="Año">
              {[
                "", 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015,
                2014, 2013, 2012,
              ].map((año) => (
                <MenuItem
                  sx={{ padding: "10px 25px !important" }}
                  key={año}
                  value={año}
                >
                  {año}
                </MenuItem>
              ))}
            </Select> */}
            <Select value={anio} onChange={(e) => setAnio(e.target.value)} label="Año">
              {anios.map((año: any) => (
                <MenuItem
                  sx={{ padding: "10px 25px !important" }}
                  key={año.value}
                  value={año.value}
                >
                  {año.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl
            sx={{
              width: isMobile ? "100%" : "200px",
              mr: isMobile ? 0 : 1,
              mt: isMobile ? 2 : 0,
              mb: isMobile ? 2 : 0,
            }}
          >
            <InputLabel id="cuota-mes-label">Mes</InputLabel>
            <Select value={mes} onChange={(e) => setMes(e.target.value)} label="Mes">
              {iMeses.map((iMes: IMeses) => (
                <MenuItem key={iMes.value} value={iMes.value}>
                  {iMes.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            startIcon={<Search />}
            sx={{
              backgroundColor: "#008001",
              "&:hover": {
                backgroundColor: "#2c6d33",
              },
              height: "50px",
              width: isMobile ? "100%" : "170px",
              marginLeft: isMobile ? 0 : "1rem",
              borderRadius: "30px",
            }}
            onClick={handleSearchCuota}
          >
            Buscar
          </Button>
        </Box>

      )}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
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
                          Listado de Cuotas
                        </Typography>
                      </TableCell>
                      : columns.map((column) => (
                        <TableCell
                          key={column.id}
                          align={column.id === "accion" ? "center" : column.align} // Alinear 'accion' a la derecha
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
                  {cuotas.map((cuota) => (
                    <TableRow key={cuota.id_cuota} hover role="checkbox" tabIndex={-1}>
                      {isTablet || isMobile
                        ? <TableCell padding="checkbox" colSpan={columns.length}>
                          <Box sx={{ display: "flex", flexDirection: "column" }}>
                            <Typography
                              sx={{
                                p: 2,
                                // Seleccionar la cuota y cambiar el color de fondo
                                bgcolor: mostrarDetalles === cuota.id_cuota ? "#f0f0f0" : "inherit",
                                "&:hover": {
                                  cursor: "pointer",
                                  bgcolor: "#f0f0f0",
                                }
                              }}
                              onClick={() => setMostrarDetalles(
                                // Si la cuota seleccionada es igual a la cuota actual, ocultar detalles
                                mostrarDetalles === cuota.id_cuota ? null : cuota.id_cuota
                              )}
                            >
                              {cuota.id_cuota} - {cuota.id_cuota}
                            </Typography>
                            {mostrarDetalles === cuota.id_cuota && (
                              <Box
                                sx={{
                                  p: 2,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 1
                                }}
                              >
                                {columns.map((column) => {
                                  const value = column.id === "accion" ? "" : (cuota as any)[column.id];
                                  return (
                                    <Box key={column.id}>
                                      {/* Mostrar titulo del campo */}
                                      <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                                        {column.label}
                                      </Typography>
                                      {/* Mostrar los detalles de la cuota */}
                                      <Box>
                                        {column.id === "accion" ? (
                                          <Box
                                            sx={{
                                              width: "100%",
                                              display: "flex",
                                              flexDirection: "column",
                                              justifyContent: "center",
                                              gap: 1
                                            }}
                                          >
                                            <Button
                                              variant="contained"
                                              sx={{
                                                padding: "0.5rem 1.5rem",
                                                backgroundColor: "#0478E3",
                                                color: "white"
                                              }}
                                              onClick={() => handleOpen(cuota)}
                                            >
                                              <SaveAs sx={{ mr: 1 }} />
                                              Editar
                                            </Button>
                                            <Button
                                              variant="contained"
                                              sx={{
                                                padding: "0.5rem 1.5rem",
                                                backgroundColor: "black",
                                                color: "white"
                                              }}
                                              onClick={() => handleAccionesCuota(1, cuota)}
                                            >
                                              <Download sx={{ mr: 1 }} />
                                              Descargar
                                            </Button>
                                            <Button
                                              variant="contained"
                                              sx={{
                                                padding: "0.5rem 1.5rem",
                                                backgroundColor: "green",
                                                color: "white"
                                              }}
                                              onClick={() => handleAccionesCuota(2, cuota)}
                                            >
                                              <WhatsApp sx={{ mr: 1 }} />
                                              Enviar
                                            </Button>
                                            <Button
                                              variant="contained"
                                              sx={{
                                                padding: "0.5rem 1.5rem",
                                                backgroundColor: "crimson",
                                                color: "white"
                                              }}
                                              onClick={() => mostrarAlertaConfirmacion(
                                                "Eliminar cuota",
                                                "¿Estás seguro de eliminar esta cuota?",
                                                "Eliminar",
                                                "Cancelar"
                                              ).then((result) => {
                                                if (result.isConfirmed) {
                                                  eliminarCuota(cuota.id_cuota);
                                                }
                                              })}
                                            >
                                              <DeleteForever sx={{ mr: 1 }} />
                                              Eliminar
                                            </Button>
                                          </Box>
                                        ) : column.id === "servicios" ? (
                                          cuota.servicios.map((servicio, index) => (
                                            <Typography key={servicio.id_servicio || index}>{`${servicio.nombre} - S/ ${servicio.costo_unitario}`}</Typography>
                                          ))
                                        ) : column.id === "puestos_asignados" ? (
                                          cuota.puestos_asignados ? cuota.puestos_asignados.map((puesto, index) => (
                                            <Typography key={puesto.id_puesto || index}>{puesto.numero}</Typography>
                                          )) : <Typography>Todos los puestos</Typography>
                                        ) : column.id === "importe" ? (
                                          <Typography>{parseFloat(cuota.importe).toFixed(2)}</Typography>
                                        ) : (
                                          <Typography>{value}</Typography>
                                        )}
                                      </Box>
                                    </Box>
                                  )
                                })}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        : columns.map((column) => {
                          const value =
                            column.id === "accion" ? "" : (cuota as any)[column.id];
                          return (
                            <TableCell
                              key={column.id}
                              align={
                                column.id === "accion" ? "center" : column.align
                              }
                            >
                              {column.id === "servicios" ? (
                                cuota.servicios.map((servicio, index) => (
                                  <Typography key={servicio.id_servicio || index}>{`${servicio.nombre} - S/ ${servicio.costo_unitario}`}</Typography>
                                ))
                              ) : column.id === "puestos_asignados" ? (
                                cuota.puestos_asignados ? cuota.puestos_asignados.map((puesto, index) => (
                                  <Typography key={puesto.id_puesto || index}>{puesto.numero}</Typography>
                                )) : <Typography>Todos los puestos</Typography>
                              ) : column.id === "importe" ?
                                parseFloat(cuota.importe).toFixed(2)
                                : column.id === "accion" ? (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "center",
                                    }}
                                  >
                                    {/* Alinea los íconos a la derecha */}
                                    <IconButton
                                      aria-label="edit"
                                      sx={{ color: "#0478E3" }}
                                      onClick={() => handleOpen(cuota)}
                                    >
                                      <SaveAs />
                                    </IconButton>
                                    <IconButton
                                      aria-label="copy"
                                      sx={{ color: "black" }}
                                      onClick={() => handleAccionesCuota(1, cuota)}
                                    >
                                      <Download />
                                    </IconButton>
                                    <IconButton
                                      aria-label="whatsapp"
                                      sx={{ color: "green" }}
                                      onClick={() => handleAccionesCuota(2, cuota)}
                                    >
                                      <WhatsApp />
                                    </IconButton>
                                    <IconButton
                                      aria-label="delete"
                                      sx={{ color: "red" }}
                                      onClick={() => mostrarAlertaConfirmacion(
                                        "Eliminar cuota",
                                        "¿Estás seguro de eliminar esta cuota?",
                                        "Eliminar",
                                        "Cancelar"
                                      ).then((result) => {
                                        if (result.isConfirmed) {
                                          eliminarCuota(cuota.id_cuota);
                                        }
                                      })}
                                    >
                                      <DeleteForever />
                                    </IconButton>
                                  </Box>
                                ) : value}
                            </TableCell>
                          );
                        })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{ display: "flex", justifyContent: "center", marginTop: 3 }}
            >
              <Pagination
                count={totalPages} // Total de páginas
                page={paginaActual} // Página actual
                onChange={CambioDePagina} // Manejar el cambio de página
                color="primary"
              />

            </Box>
          </Paper>
        </>
      )}
    </Contenedor>
  );
};

export default TablaCuota;
