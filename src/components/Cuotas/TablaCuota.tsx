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
  Edit,
  Delete,
} from "@mui/icons-material";
import * as XLSX from 'xlsx';
import GenerarCuotaTabs from "./GenerarCuotaTabs";
import ModalEditarCuota from "./ModalEditarCuota";
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
import { mostrarAlerta, manejarError, mostrarAlertaConfirmacion } from "../Alerts/Registrar";

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

const anios: any = [
  { value: "", label: "Año" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
  { value: "2022", label: "2022" },
  { value: "2021", label: "2021" },
  { value: "2020", label: "2020" },
  { value: "2019", label: "2019" },
  { value: "2018", label: "2018" },
  { value: "2017", label: "2017" },
  { value: "2016", label: "2016" },
  { value: "2015", label: "2015" },
  { value: "2014", label: "2014" },
  { value: "2013", label: "2013" },
  { value: "2012", label: "2012" },
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
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedCuota, setSelectedCuota] = useState<Cuotas | null>(null);
  const [cuotas, setCuotas] = useState<Cuotas[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => {
    setOpen(false);
    listarCuotas();
  };

  const handleExportCuotas = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const exportUrl = Api_Global_Cuotas.cuotas.exportar();
    const fileNamePrefix = "lista-cuotas";
    await handleExport(exportUrl, exportFormat, fileNamePrefix, setExportFormat);
  };

  const handleSearchCuota = () => {
    listarCuotas();
  };

  const listarCuotas = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(
        Api_Global_Cuotas.cuotas.listar(page, anio, mes)
      );
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
      console.error("Error al traer datos", error);
    } finally {
      setIsLoading(false);
    }
  };

  const CambioDePagina = (event: React.ChangeEvent<unknown>, value: number) => {
    setPaginaActual(value);
    listarCuotas(value);
  };

  const handleDeleteCuota = async (id: number | string) => {
    mostrarAlertaConfirmacion(
      "¿Estás seguro?",
      "Esta acción no se puede deshacer.",
      "Eliminar",
      "Cancelar"
    ).then(async (result) => {
      if (result.isConfirmed) {
        setIsLoading(true);
        try {
          await apiClient.delete(Api_Global_Cuotas.cuotas.eliminar(id));
          mostrarAlerta("Eliminado", "La cuota ha sido eliminada.", "success");
          listarCuotas(paginaActual);
        } catch (error) {
          manejarError(error);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };

  const handleEditCuota = (cuota: Cuotas) => {
    setSelectedCuota(cuota);
    setOpenEdit(true);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setSelectedCuota(null);
    listarCuotas(paginaActual);
  };

  const handleAccionCuota = async (accion: number, cuota: Cuotas) => {
    const data = [
      ["ID Cuota", cuota.id_cuota],
      ["Fecha Emisión", cuota.fecha_emision],
      ["Fecha Vencimiento", cuota.fecha_vencimiento],
      ["Importe", cuota.importe],
    ];

    if (cuota.servicios && cuota.servicios.length > 0) {
      data.push(["Servicios", ""]);
      cuota.servicios.forEach((serv) => {
        data.push([serv.nombre, serv.costo_unitario]);
      });
    }

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cuota");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Cuota-${cuota.id_cuota}.xlsx`);
    document.body.appendChild(link);

    if (accion === 1) {
      link.click();
      document.body.removeChild(link);
    } else {
      const mensaje = `¡Hola! Aquí tienes el detalle de tu cuota ID: ${cuota.id_cuota}. Puedes descargar el archivo aquí: ${url}`;
      const urlWhatsApp = `https://api.whatsapp.com/send?text=${encodeURIComponent(
        mensaje
      )}`;
      window.open(urlWhatsApp, "_blank");
      document.body.removeChild(link);
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
        <BotonAgregar handleAction={handleOpen} texto="Generar Cuota" />
        <GenerarCuotaTabs open={open} handleClose={handleClose} />
        <ModalEditarCuota
          open={openEdit}
          handleClose={handleCloseEdit}
          cuota={selectedCuota}
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
            borderBottom: !mostrarFiltros
              ? "1px solid rgba(0, 0, 0, 0.25)"
              : "none",
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
            endIcon={mostrarFiltros ? <ExpandLess /> : <ExpandMore />}
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
              mb: isMobile ? 2 : 0,
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
            <Select
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              label="Año"
            >
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
            <Select
              value={mes}
              onChange={(e) => setMes(e.target.value)}
              label="Mes"
            >
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
                    {isTablet || isMobile ? (
                      <TableCell colSpan={columns.length}>
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
                    ) : (
                      columns.map((column) => (
                        <TableCell
                          key={column.id}
                          align={
                            column.id === "accion" ? "center" : column.align
                          }
                          style={{ minWidth: column.minWidth }}
                          sx={{
                            fontWeight: "bold",
                          }}
                        >
                          {column.label}
                        </TableCell>
                      ))
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cuotas.map((cuota) => (
                    <TableRow key={cuota.id_cuota} hover role="checkbox" tabIndex={-1}>
                      {isTablet || isMobile ? (
                        <TableCell padding="checkbox" colSpan={columns.length}>
                          <Box
                            sx={{ display: "flex", flexDirection: "column" }}
                          >
                            <Typography
                              sx={{
                                p: 2,
                                bgcolor:
                                  mostrarDetalles === cuota.id_cuota
                                    ? "#f0f0f0"
                                    : "inherit",
                                "&:hover": {
                                  cursor: "pointer",
                                  bgcolor: "#f0f0f0",
                                },
                              }}
                              onClick={() =>
                                setMostrarDetalles(
                                  mostrarDetalles === cuota.id_cuota
                                    ? null
                                    : cuota.id_cuota
                                )
                              }
                            >
                              {cuota.id_cuota}
                            </Typography>
                            {mostrarDetalles === cuota.id_cuota && (
                              <Box
                                sx={{
                                  p: 2,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 1,
                                }}
                              >
                                {columns.map((column) => {
                                  const value =
                                    column.id === "accion"
                                      ? ""
                                      : (cuota as any)[column.id];
                                  return (
                                    <Box key={column.id}>
                                      <Typography
                                        sx={{ fontWeight: "bold", mb: 1 }}
                                      >
                                        {column.label}
                                      </Typography>
                                      <Box>
                                        {column.id === "accion" ? (
                                          <Box
                                            sx={{
                                              width: "100%",
                                              display: "flex",
                                              flexDirection: "column",
                                              justifyContent: "center",
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                display: "flex",
                                                gap: 1,
                                                mt: 1,
                                              }}
                                            >
                                              <Button
                                                variant="contained"
                                                sx={{
                                                  flex: 1,
                                                  backgroundColor: "#1976d2",
                                                  color: "white",
                                                  "&:hover": {
                                                    backgroundColor: "#1565c0",
                                                  },
                                                }}
                                                onClick={() =>
                                                  handleEditCuota(cuota)
                                                }
                                              >
                                                <Edit sx={{ mr: 1 }} />
                                                Editar
                                              </Button>
                                              <Button
                                                variant="contained"
                                                sx={{
                                                  flex: 1,
                                                  backgroundColor: "#202123",
                                                  color: "white",
                                                  "&:hover": {
                                                    backgroundColor: "#3F4145",
                                                  },
                                                }}
                                                onClick={() =>
                                                  handleAccionCuota(1, cuota)
                                                }
                                              >
                                                <Download sx={{ mr: 1 }} />
                                                Descargar
                                              </Button>
                                            </Box>
                                            <Box
                                              sx={{
                                                display: "flex",
                                                gap: 1,
                                                mt: 1,
                                              }}
                                            >
                                              <Button
                                                variant="contained"
                                                sx={{
                                                  flex: 1,
                                                  backgroundColor: "#008001",
                                                  color: "white",
                                                  "&:hover": {
                                                    backgroundColor: "#006400",
                                                  },
                                                }}
                                                onClick={() =>
                                                  handleAccionCuota(2, cuota)
                                                }
                                              >
                                                <WhatsApp sx={{ mr: 1 }} />
                                                WhatsApp
                                              </Button>
                                              <Button
                                                variant="contained"
                                                sx={{
                                                  flex: 1,
                                                  backgroundColor: "#d32f2f",
                                                  color: "white",
                                                  "&:hover": {
                                                    backgroundColor: "#b71c1c",
                                                  },
                                                }}
                                                onClick={() =>
                                                  handleDeleteCuota(
                                                    cuota.id_cuota
                                                  )
                                                }
                                              >
                                                <Delete sx={{ mr: 1 }} />
                                                Eliminar
                                              </Button>
                                            </Box>
                                          </Box>
                                        ) : column.id === "servicios" ? (
                                          cuota.servicios.map((servicio) => (
                                            <Typography key={servicio.id_servicio}>
                                              {`${servicio.nombre} - S/ ${servicio.costo_unitario}`}
                                            </Typography>
                                          ))
                                        ) : column.id === "puestos_asignados" ? (
                                          cuota.puestos_asignados ? (
                                            cuota.puestos_asignados.map(
                                              (puesto) => (
                                                <Typography key={puesto.numero}>
                                                  {puesto.numero}
                                                </Typography>
                                              )
                                            )
                                          ) : (
                                            <Typography>
                                              Todos los puestos
                                            </Typography>
                                          )
                                        ) : (
                                          value
                                        )}
                                      </Box>
                                    </Box>
                                  );
                                })}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                      ) : (
                        columns.map((column) => {
                          const value =
                            column.id === "accion"
                              ? ""
                              : (cuota as any)[column.id];
                          return (
                            <TableCell
                              key={column.id}
                              align={
                                column.id === "accion" ? "center" : column.align
                              }
                            >
                              {column.id === "servicios" ? (
                                cuota.servicios.map((servicio) => (
                                  <Typography key={servicio.id_servicio}>
                                    {`${servicio.nombre} - S/ ${servicio.costo_unitario}`}
                                  </Typography>
                                ))
                              ) : column.id === "puestos_asignados" ? (
                                cuota.puestos_asignados ? (
                                  cuota.puestos_asignados.map((puesto) => (
                                    <Typography key={puesto.numero}>
                                      {puesto.numero}
                                    </Typography>
                                  ))
                                ) : (
                                  <Typography>Todos los puestos</Typography>
                                )
                              ) : column.id === "importe" ? (
                                parseFloat(cuota.importe).toFixed(2)
                              ) : column.id === "accion" ? (
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      gap: 0.5,
                                      justifyContent: "center",
                                    }}
                                  >
                                    <IconButton
                                      aria-label="edit"
                                      sx={{ color: "#1976d2" }}
                                      onClick={() => handleEditCuota(cuota)}
                                    >
                                      <Edit />
                                    </IconButton>
                                    <IconButton
                                      aria-label="download"
                                      sx={{ color: "#202123" }}
                                      onClick={() =>
                                        handleAccionCuota(1, cuota)
                                      }
                                    >
                                      <Download />
                                    </IconButton>
                                    <IconButton
                                      aria-label="whatsapp"
                                      sx={{ color: "#008001" }}
                                      onClick={() =>
                                        handleAccionCuota(2, cuota)
                                      }
                                    >
                                      <WhatsApp />
                                    </IconButton>
                                    <IconButton
                                      aria-label="delete"
                                      sx={{ color: "#d32f2f" }}
                                      onClick={() =>
                                        handleDeleteCuota(cuota.id_cuota)
                                      }
                                    >
                                      <Delete />
                                    </IconButton>
                                  </Box>
                                </Box>
                              ) : (
                                value
                              )}
                            </TableCell>
                          );
                        })
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box
              sx={{ display: "flex", justifyContent: "center", marginTop: 3 }}
            >
              <Pagination
                count={totalPages}
                page={paginaActual}
                onChange={CambioDePagina}
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
