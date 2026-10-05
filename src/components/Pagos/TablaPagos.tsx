import {
  Download,
  FileDownload,
  Search,
  WhatsApp,
  DeleteForever,
} from "@mui/icons-material";
import {
  Autocomplete,
  Box,
  Button,
  FormControl,
  IconButton,
  Pagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState, useCallback } from "react";
import RegistrarPagoTabs from "./RegistrarPagoTabs";
import ImportPagosModal from "./ImportPagosModal";
import useResponsive from "../../hooks/Responsive/useResponsive";
import LoadingSpinner from "../PogressBar/ProgressBarV1";
import * as XLSX from 'xlsx';
import Contenedor from "../Shared/Contenedor";
import ContenedorBotones from "../Shared/ContenedorBotones";
import BotonExportar from "../Shared/BotonExportar";
import BotonAgregar from "../Shared/BotonAgregar";
import { formatDate } from "../../Utils/dateUtils";
import { Pagos, Data } from "../../interface/Pagos/Pagos";
import { columns } from "../../Columns/Pagos";
import apiClient from "../../Utils/apliClient";
import { Api_Global_Pagos } from "../../service/PagoApi";
import { Api_Global_Puestos } from "../../service/PuestoApi";
import { handleExport } from "../../Utils/exportUtils";
import { manejarError, mostrarAlerta, mostrarAlertaConfirmacion } from "../Alerts/Registrar";
import { ordenarPuestosPorNumero } from "../../Utils/ordenarPuestos";
import { Puesto } from "../../interface/ReportePagos/pagos";

const TablaPago: React.FC = () => {
  const { isTablet, isMobile, isSmallMobile } = useResponsive();
  const [mostrarDetalles, setMostrarDetalles] = useState<string | null>(null);
  const [pagos, setPagos] = useState<Data[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [paginaActual, setPaginaActual] = useState(1);
  const [exportFormat, setExportFormat] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [openImport, setOpenImport] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Data | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState<Puesto | null>(null);

  // Cargar lista de puestos al montar
  useEffect(() => {
    const fetchPuestos = async () => {
      try {
        const response = await apiClient.get(Api_Global_Puestos.puestos.buscar(1, 1000, "", "", "", ""));
        setPuestos(ordenarPuestosPorNumero(response.data.data));
      } catch (error) {
        console.error("Error al cargar puestos:", error);
      }
    };
    fetchPuestos();
  }, []);

  const handleOpen = (pago?: Data) => {
    setPagoSeleccionado(pago || null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    listarPagos(paginaActual);
  }

  const handleOpenImport = () => setOpenImport(true);
  const handleCloseImport = () => setOpenImport(false);

  const handleExportPagos = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const exportUrl = Api_Global_Pagos.pagos.exportar();
    const fileNamePrefix = "lista-pagos";
    await handleExport(exportUrl, exportFormat, fileNamePrefix, setExportFormat);
  };

  const handleAccionesPago = async (accion: number, telefono: string, pago: Pagos) => {

    const data = [
      ["ID", pago.id_pago],
      ["Serie número", pago.serie_numero],
      ["Puesto", pago.puesto],
      ["Socio", pago.socio],
      ["DNI", pago.dni],
      ["Fecha", pago.fecha_registro],
      ["Teléfono", pago.telefono],
      ["Correo", pago.correo],
      ["A Cuenta", pago.total_pago],
      ["Monto Actual", pago.total_deuda]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos");

    ws['A1'].s = { font: { bold: true } };
    ws['B2'].s = { alignment: { horizontal: 'left' } };
    ws['!cols'] = [{ wch: 18 }, { wch: 30 }];

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Pago-${pago.socio}-${formatDate(pago.fecha_registro)}.xlsx`);
    document.body.appendChild(link);

    // Accion 1: Descargar
    if (accion === 1) {
      link.click();
      link.parentNode?.removeChild(link);
    } else {
      // Accion 2: Enviar por WhatsApp
      const mensaje = `¡Hola ${pago.socio}! \n Copia el siguiente enlace en tu navegador para descargar el detalle de tu pago. \n ${url}`;
      const urlWhatsApp = `https://api.whatsapp.com/send?phone=${telefono}&text=${encodeURIComponent(mensaje)}`;
      window.open(urlWhatsApp, '_blank');
    }

  }

  // Listar pagos con filtros por nombre de socio y/o puesto
  const listarPagos = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    try {
      const idPuesto = puestoSeleccionado ? puestoSeleccionado.id_puesto : "";
      const response = await apiClient.get(
        Api_Global_Pagos.pagos.listar(page, searchTerm, idPuesto)
      );
      const data = response.data.data.map((item: Pagos) => ({
        id_pago: item.id_pago,
        puesto: item.puesto,
        socio: item.socio,
        dni: item.dni,
        telefono: item.telefono,
        correo: item.correo,
        total_pago: item.total_pago,
        total_deuda: item.total_deuda,
        id_socio: item.id_socio,
        pago_banco: item.pago_banco,
        fecha_registro: item.fecha_registro,
        serie_numero: item.serie_numero,
      }));
      setPagos(data);
      setTotalPages(response.data.meta.last_page);
      setPaginaActual(response.data.meta.current_page);
    } catch (error) {
      console.error("Error al traer datos", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, puestoSeleccionado]);

  const eliminarPago = async (id_pago: string) => {
    try {
      const response = await apiClient.delete(Api_Global_Pagos.pagos.eliminar(id_pago));
      if (response.status === 200) {
        mostrarAlerta("Éxito", "El pago ha sido eliminado correctamente", "success");
        listarPagos(paginaActual);
      }
    } catch (error) {
      manejarError(error);
    }
  };

  const CambioDePagina = (event: React.ChangeEvent<unknown>, value: number) => {
    setPaginaActual(value);
    listarPagos(value);
  };

  // useEffect para ejecutar la búsqueda automáticamente
  useEffect(() => {
    listarPagos(paginaActual);
  }, [listarPagos, paginaActual]);

  return (
    <Contenedor>
      <ContenedorBotones>

        <BotonAgregar
          handleAction={() => handleOpen()}
          texto="Registrar Pago"
        />

        <RegistrarPagoTabs open={open} handleClose={handleClose} pago={pagoSeleccionado} />

        <Button
          variant="contained"
          startIcon={<FileDownload />}
          sx={{
            backgroundColor: "#008001",
            "&:hover": {
              backgroundColor: "#2c6d33",
            },
            height: "45px",
            borderRadius: "30px",
            padding: "0 20px",
            ml: 2
          }}
          onClick={handleOpenImport}
        >
          Importar Excel
        </Button>

        <ImportPagosModal
          open={openImport}
          handleClose={handleCloseImport}
          onSuccess={() => listarPagos(paginaActual)}
        />

        <BotonExportar
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          handleExport={handleExportPagos}
        />

      </ContenedorBotones>

      {/* Filtros: Buscar por Socio y/o Puesto */}
      <Box
        sx={{
          padding: isTablet || isMobile ? "15px 0px" : "15px 35px",
          borderTop: "1px solid rgba(0, 0, 0, 0.25)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: isMobile ? "flex-start" : "center",
          flexWrap: "wrap",
          gap: isMobile ? 1.5 : 2,
        }}
      >
        <Typography
          sx={{
            display: isTablet || isMobile ? "none" : "inline-block",
            fontWeight: "bold",
          }}
        >
          Buscar por:
        </Typography>

        {/* Autocomplete Puesto — igual al Reporte Pagos */}
        <FormControl
          sx={{ width: isTablet ? "35%" : isMobile ? "100%" : "230px" }}
        >
          <Autocomplete
            options={puestos}
            getOptionLabel={(option) => option.numero_puesto || ""}
            value={puestoSeleccionado}
            onChange={(_event, value) => {
              setPuestoSeleccionado(value);
              setPaginaActual(1);
            }}
            renderInput={(params) => (
              <TextField {...params} label="Puesto" variant="outlined" />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id_puesto}>
                {option.numero_puesto}
              </li>
            )}
            isOptionEqualToValue={(option, value) => option.id_puesto === value.id_puesto}
            noOptionsText="No se encontraron puestos"
            clearOnEscape
          />
        </FormControl>

        {/* Input Nombre Socio */}
        <TextField
          sx={{
            width: isTablet ? "35%" : isMobile ? "100%" : "280px",
            my: 0,
          }}
          label="Nombre del socio"
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPaginaActual(1);
          }}
        />

        {/* Botón Buscar */}
        <Button
          variant="contained"
          startIcon={<Search />}
          sx={{
            backgroundColor: "#008001",
            "&:hover": { backgroundColor: "#2c6d33" },
            height: "50px",
            width: isMobile ? "100%" : isTablet ? "20%" : "150px",
            borderRadius: "30px",
            fontSize: isSmallMobile ? "0.8rem" : "auto",
          }}
          onClick={() => listarPagos(1)}
        >
          Buscar
        </Button>
      </Box>
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Tabla Deudas */}
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
                          Lista de pagos
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
                  {pagos.map((pago) => (
                    <TableRow hover role="checkbox" tabIndex={-1}>
                      {isTablet || isMobile
                        ? <TableCell padding="checkbox" colSpan={columns.length}>
                          <Box sx={{ display: "flex", flexDirection: "column" }}>
                            <Typography
                              sx={{
                                p: 2,
                                // Seleccionar el pago y cambiar el color de fondo
                                bgcolor: mostrarDetalles === pago.id_pago ? "#f0f0f0" : "inherit",
                                "&:hover": {
                                  cursor: "pointer",
                                  bgcolor: "#f0f0f0",
                                }
                              }}
                              onClick={() => setMostrarDetalles(
                                // Si el pago seleccionado es igual al pago actual, ocultar detalles
                                mostrarDetalles === pago.id_pago ? null : pago.id_pago
                              )}
                            >
                              {pago.fecha_registro} - {pago.socio} - {pago.total_pago}
                            </Typography>
                            {mostrarDetalles === pago.id_pago && (
                              <Box
                                sx={{
                                  p: 2,
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 1
                                }}
                              >
                                {columns.map((column) => {
                                  const value = column.id === "accion" ? "" : (pago as any)[column.id];
                                  return (
                                    <Box>
                                      {/* Mostrar titulo del campo */}
                                      <Typography sx={{ fontWeight: "bold", mb: 1 }}>
                                        {column.label}
                                      </Typography>
                                      {/* Mostrar los detalles del pago */}
                                      <Typography>
                                        {column.id === "accion" ? (
                                          <Box
                                            sx={{
                                              width: "100%",
                                              display: "flex",
                                              flexDirection: "column",
                                              justifyContent: "center"
                                            }}
                                          >
                                            {/* <Button 
                                              variant="contained"
                                              sx={{
                                                padding: "0.5rem 1.5rem",
                                                backgroundColor: "#0478E3", 
                                                color: "white" 
                                              }}
                                              // onClick={() => handleOpen(pago)}
                                            >
                                              <InsertDriveFile sx={{ mr: 1 }} />
                                              Ver detalles
                                            </Button> */}
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
                                                  backgroundColor: "black",
                                                  color: "white"
                                                }}
                                                onClick={() => handleAccionesPago(1, "", pago as any)}
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
                                                onClick={() => handleAccionesPago(2, pago.telefono, pago as any)}
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
                                                  "Eliminar pago",
                                                  "¿Estás seguro de eliminar este pago?",
                                                  "Eliminar",
                                                  "Cancelar"
                                                ).then((result) => {
                                                  if (result.isConfirmed) {
                                                    eliminarPago(pago.id_pago);
                                                  }
                                                })}
                                              >
                                                <DeleteForever sx={{ mr: 1 }} />
                                                Eliminar
                                              </Button>
                                            </Box>
                                          </Box>
                                        ) : (
                                          value
                                        )}
                                      </Typography>
                                    </Box>
                                  )
                                })}
                              </Box>
                            )}
                          </Box>
                        </TableCell>
                        : columns.map((column) => {
                          const value =
                            column.id === "accion" ? "" : (pago as any)[column.id];
                          return (
                            <TableCell key={column.id} align="center">
                              {column.id === "accion" ? (
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    justifyContent: "center",
                                  }}
                                >
                                  {/* Boton Descargar */}
                                  <IconButton
                                    aria-label="download"
                                    sx={{ color: "#002B7E" }}
                                    onClick={() => handleAccionesPago(1, "", pago as any)}
                                  >
                                    <FileDownload />
                                  </IconButton>

                                  {/* Boton Whatsapp */}
                                  <IconButton
                                    aria-label="share"
                                    sx={{ color: "#008001" }}
                                    onClick={() => handleAccionesPago(2, pago.telefono, pago as any)}
                                  >
                                    <WhatsApp />
                                  </IconButton>
                                  <IconButton
                                    aria-label="delete"
                                    sx={{ color: "red" }}
                                    onClick={() => mostrarAlertaConfirmacion(
                                      "Eliminar pago",
                                      "¿Estás seguro de eliminar este pago?",
                                      "Eliminar",
                                      "Cancelar"
                                    ).then((result) => {
                                      if (result.isConfirmed) {
                                        eliminarPago(pago.id_pago);
                                      }
                                    })
                                    }
                                  >
                                    <DeleteForever />
                                  </IconButton>
                                </Box>
                              ) : (
                                value
                              )}
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

export default TablaPago;
