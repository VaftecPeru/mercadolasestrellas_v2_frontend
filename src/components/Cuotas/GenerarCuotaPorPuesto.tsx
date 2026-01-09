import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Grid,
  TextField,
  Table,
  TableContainer,
  Paper,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Button,
} from "@mui/material";
import { CalendarIcon } from "@mui/x-date-pickers";
import { AttachMoney, Bolt, Delete, Business } from "@mui/icons-material";
import useResponsive from "../../hooks/Responsive/useResponsive";
import { manejarError, mostrarAlerta } from "../Alerts/Registrar";
import { AvisoFormulario, TxtFormulario } from "../Shared/ElementosFormulario";
import apiClient from "../../Utils/apliClient";
import { Api_Global_Cuotas } from "../../service/CuotaApi";
import { ColumnServicios } from "../../interface/Cuota";
import { Servicio } from "../../interface/Servicios";
import { Puesto } from "../../interface/Puestos";

const columns: readonly ColumnServicios[] = [
  { id: "nombre", label: "Servicio", minWidth: 50, align: "center" },
  { id: "costo_unitario", label: "Monto", minWidth: 50, align: "center" },
  { id: "accion", label: "", minWidth: 50, align: "center" },
];

const GenerarCuotaPorPuesto: React.FC = () => {

  // Variables para el diseño responsivo
  const { isLaptop, isTablet, isMobile } = useResponsive();

  // Para seleccionar servicios
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<string>("");
  const [serviciosAgregados, setServiciosAgregados] = useState<Servicio[]>([]);
  const [serviciosIds, setServiciosIds] = useState<string[]>([]);

  // Para el importe total
  const [importeTotal, setImporteTotal] = useState<number>(0);

  // Para el modal
  const [activeTab, setActiveTab] = useState(0);

  // Datos del formulario
  const [fechaEmision, setFechaEmision] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [loading, setLoading] = useState(false);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [puestoSeleccionado, setPuestoSeleccionado] = useState<string>("");

  const [formData, setFormData] = useState({
    fecha_emision: "",
    fecha_vencimiento: "",
    id_puesto: ""
  });

  // Para calcular la fecha de vencimiento de la cuota (La cuota vence en 30 dias)
  const manejarFechaEmisionCambio = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nuevaFechaEmision = event.target.value;
    setFechaEmision(nuevaFechaEmision);

    if (!nuevaFechaEmision) {
      setFechaEmision("");
      setFechaVencimiento("");
      return;
    }
    const fecha = new Date(nuevaFechaEmision);
    if (isNaN(fecha.getTime())) return;
    fecha.setDate(fecha.getDate() + 30);
    const fechaVencimientoFormateada = fecha.toISOString().split('T')[0];
    setFechaVencimiento(fechaVencimientoFormateada);
  };

  // Obtener los servicios para el SelectList
  useEffect(() => {
    const fetchServicios = async () => {
      try {
        const response = await apiClient.get(Api_Global_Cuotas.servicio.listar());
        setServicios(response.data.data);
      } catch (error) {
      }
    }
    fetchServicios();
  }, []);

  // Obtener los puestos para el SelectList
  useEffect(() => {
    const fetchPuestos = async () => {
      try {
        const response = await apiClient.get(Api_Global_Cuotas.puesto.listar());
        setPuestos(response.data.data);
      } catch (error) {
      }
    }
    fetchPuestos();
  }, []);

  // Para manejar el cambio de seleccion y agregar servicios a la tabla
  const handleServicioChange = (event: SelectChangeEvent<string>) => {
    const servicioId = event.target.value;
    setServicioSeleccionado(servicioId);
    const servicio = servicios.find((s) => String(s.id_servicio) === String(servicioId));
    if (servicio) {
      if (!serviciosAgregados.some((s) => s.id_servicio === servicio.id_servicio)) {
        setServiciosAgregados([...serviciosAgregados, servicio]);
        setServiciosIds((prevIds) => [...prevIds, servicio.id_servicio]);
      }
    }
  };

  // Para manejar el cambio de seleccion de puesto
  const handlePuestoChange = (event: SelectChangeEvent<string>) => {
    const idPuesto = event.target.value;
    setPuestoSeleccionado(idPuesto);
  };

  // Para eliminar un servicio de la tabla
  const handleServicioDelete = (id: string) => {
    const updatedServicios = serviciosAgregados.filter((s) => s.id_servicio !== id);
    setServiciosAgregados(updatedServicios);
    const updatedServiciosIds = serviciosIds.filter((servicioId) => servicioId !== id);
    setServiciosIds(updatedServiciosIds);
  };

  // Para calcular el importe total cuando cambien los servicios agregados
  useEffect(() => {
    const total = serviciosAgregados.reduce((sum, servicio) => {
      const cost = parseFloat(servicio.costo_unitario);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);
    setImporteTotal(total);
  }, [serviciosAgregados]);

  // Handle submit (Registrar cuota por puesto)
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (fechaEmision === "" || fechaVencimiento === "" || serviciosAgregados.length === 0 || puestoSeleccionado === "") {
      mostrarAlerta("Error", "Debe completar todos los campos", "error");
      return;
    }
    setLoading(true);

    try {
      const response = await apiClient.post(Api_Global_Cuotas.cuotas.registrarPorPuesto(), {
        fecha_emision: fechaEmision,
        fecha_vencimiento: fechaVencimiento,
        servicios: serviciosIds,
        id_puesto: puestoSeleccionado
      });

      if (response.status === 201) {
        mostrarAlerta("Éxito", "La cuota ha sido registrada correctamente", "success");
        setFechaEmision("");
        setFechaVencimiento("");
        setServiciosAgregados([]);
        setServiciosIds([]);
        setServicioSeleccionado("");
        setPuestoSeleccionado("");
        setImporteTotal(0);
      } else {
        mostrarAlerta("Error", "No se pudo registrar la cuota", "error");
      }
    } catch (error) {
      manejarError(error);
    } finally {
      setLoading(false);
    }
  };

  // Contenido de la ventana modal
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <>
            <AvisoFormulario />
            {/* <pre>{JSON.stringify(formData, null, 2)}</pre> */}
            <Grid container spacing={1}>
              <Grid item xs={12} sm={6}>
                {/* Seleccionar fecha de emision y fecha de vencimiento */}
                <TxtFormulario
                  type="date"
                  label="Fecha de emisión"
                  name="fecha_emision"
                  value={fechaEmision}
                  onChange={manejarFechaEmisionCambio}
                  noMargin={true}
                  icono={<CalendarIcon sx={{ mr: 1, color: "gray" }} />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TxtFormulario
                  type="date"
                  label="Fecha de vencimiento"
                  name="fecha_vencimiento"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  noMargin={true}
                  icono={<CalendarIcon sx={{ mr: 1, color: "gray" }} />}
                />
              </Grid>

              {/* Botón para seleccionar puesto */}
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id="puesto-label">Seleccionar Puesto *</InputLabel>
                  <Select
                    labelId="puesto-label"
                    id="puesto-select"
                    value={puestoSeleccionado}
                    label="Seleccionar puesto"
                    onChange={handlePuestoChange}
                    startAdornment={<Business sx={{ mr: 1, color: "gray" }} />}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 200,
                        },
                      },
                    }}
                  >
                    {puestos.map((puesto) => (
                      <MenuItem key={puesto.id_puesto} value={String(puesto.id_puesto)}>
                        {`${puesto.numero_puesto} - ${puesto.block?.nombre || 'S/N'}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Botón para abrir el selector de servicios */}
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id="servicio-label">Seleccionar Servicio *</InputLabel>
                  <Select
                    labelId="servicio-label"
                    id="servicio-select"
                    value={servicioSeleccionado}
                    label="Seleccionar servicio"
                    onChange={handleServicioChange}
                    startAdornment={<Bolt sx={{ mr: 1, color: "gray" }} />}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 200,
                        },
                      },
                    }}
                  >
                    {servicios.map((servicio) => (
                      <MenuItem key={servicio.id_servicio} value={String(servicio.id_servicio)}>
                        {`${servicio.nombre} - S/ ${servicio.costo_unitario}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Tabla para mostrar servicios agregados */}
              <Grid item xs={12}>
                <TableContainer component={Paper}
                  sx={{
                    height: "150px",
                    mb: "5px",
                    borderRadius: "10px",
                    border: "1px solid #202123",
                  }}
                >
                  <Table stickyHeader aria-label="sticky table" size="small">
                    <TableHead>
                      <TableRow>
                        {columns.map((column) => (
                          <TableCell
                            key={column.id}
                            align={column.align}
                            style={{ minWidth: column.minWidth, backgroundColor: "#202123", color: "white" }}
                          >
                            <Typography sx={{ fontWeight: "bold", fontSize: "14px" }}>
                              {column.label}
                            </Typography>
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {serviciosAgregados.length > 0 ? (
                        serviciosAgregados.map((servicio) => (
                          <TableRow hover role="checkbox" tabIndex={-1} key={servicio.id_servicio}>
                            <TableCell align="center">{servicio.nombre}</TableCell>
                            <TableCell align="center">{servicio.costo_unitario}</TableCell>
                            <TableCell align="center">
                              <IconButton onClick={() => handleServicioDelete(servicio.id_servicio)}>
                                <Delete sx={{ color: "#840202" }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            No se han agregado servicios
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Importe total */}
              <Grid item xs={12} sm={6} m="0 auto" mt={1}>
                <TextField
                  fullWidth
                  label="Importe (S/) *"
                  value={importeTotal.toFixed(2)}
                  InputProps={{
                    readOnly: true,
                    startAdornment: <AttachMoney sx={{ mr: 1, color: "gray" }} />,
                  }}
                />
              </Grid>
            </Grid>
          </>
        );
      default:
        return "";
    }
  };

  return (
    <Box sx={{ p: 1 }}>
      {renderTabContent()}
      <div style={{ textAlign: "center", marginTop: "15px" }}>
        <Button
          variant="contained"
          sx={{
            width: "200px",
            height: "45px",
            backgroundColor: "#008001",
            color: "#fff",
            "&:hover": {
              backgroundColor: "#388E3C",
            },
          }}
          onClick={handleSubmit}
        >
          Registrar
        </Button>
      </div>
    </Box>
  );
};

export default GenerarCuotaPorPuesto;
