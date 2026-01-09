import { Business } from "@mui/icons-material";
import {
  Box,
  Typography,
  Grid,
  TextField,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Autocomplete,
  Button,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import useResponsive from "../../hooks/Responsive/useResponsive";
import {
  manejarError,
  mostrarAlerta,
} from "../Alerts/Registrar";
import jsPDF from "jspdf";
import { AvisoFormulario } from "../Shared/ElementosFormulario";
import { formatDate, nombreMes } from "../../Utils/dateUtils";
import { AgregarProps, Column, Data, Deuda, Puesto, Socio, DeudaPendiente } from "../../interface/Pagos/RegistrarPagos";
import { Api_Global_Pagos } from "../../service/PagoApi";
import apiClient from "../../Utils/apliClient";
import { Api_Global_Cuotas } from "../../service/CuotaApi";

const columns: readonly Column[] = [
  { id: "anio", label: "Año", minWidth: 50, align: "center" },
  { id: "mes", label: "Mes", minWidth: 50, align: "center" },
  { id: "servicio_descripcion", label: "Servicio", minWidth: 50, align: "center" },
  { id: "total", label: "Total (S/)", minWidth: 50, align: "center" },
  { id: "a_cuenta", label: "A cuenta (S/)", minWidth: 50, align: "center" },
  { id: "pago", label: "Pago (S/)", minWidth: 50, align: "center" },
  { id: "accion", label: "", minWidth: 30, align: "center" },
];

const RegistrarPago: React.FC<AgregarProps> = ({ open, handleClose }) => {
  const { isMobile } = useResponsive();
  const [socios, setSocios] = useState<Socio[]>([]);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [idSocioSeleccionado, setIdSocioSeleccionado] = useState("");
  const [idPuestoSeleccionado, setIdPuestoSeleccionado] = useState("");
  const [deudas, setDeudas] = useState<DeudaPendiente[]>([]);
  const [filasSeleccionadas, setFilasSeleccionadas] = useState<({ [key: string]: boolean; })>({});
  const [montoPagar, setMontoPagar] = useState<{ [key: number]: number }>({});
  const [totalPagar, setTotalPagar] = useState(0);
  const [totalDeuda, setTotalDeuda] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [valueAC, setValueAC] = React.useState(null);

  // Para registrar el pago
  const [formData, setFormData] = useState({
    id_socio: "",
    nombre_socio: "",
    nombre_block: "",
    numero_puesto: "",
    deudas: [{
      id_deuda_cuota: 0,
      importe: 0,
      servicio: "",
    }]
  });

  // Obtener Lista Socios
  useEffect(() => {
    const fetchSocios = async () => {
      try {
        const response = await apiClient.get(Api_Global_Pagos.socios.listar());
        const data = response.data.data.map((item: Socio) => ({
          id_socio: item.id_socio,
          nombre_completo: item.nombre_completo,
        }));
        setSocios(data);
      } catch (error) {
      }
    };

    fetchSocios();
  }, []);

  // Obtener Lista Puestos
  const fetchPuestos = async (idSocio: string) => {
    try {
      const response = await apiClient.get(Api_Global_Pagos.puestos.listarPorSocio(idSocio));
      const data = response.data.data.map((item: Puesto) => ({
        id_puesto: item.id_puesto,
        numero_puesto: item.numero_puesto,
        block: {
          nombre: item.block?.nombre || 'S/N',
        }
      }));
      setPuestos(data);
    } catch (error) {
    }
  };

  // Obtener Deudas Pendientes por Puesto
  const fetchDeudaPuesto = async (idSocio: string, idPuesto: string) => {
    try {
      const response = await apiClient.get(Api_Global_Pagos.cuotas.pendientesPorPuesto(idSocio, idPuesto));
      const data = response.data.data.map((item: any) => ({
        id_deuda: item.id_deuda,
        id_deuda_cuota: item.id_deuda_cuota,
        total: item.total,
        servicio_descripcion: item.nombre_servicio,
        anio: item.anio,
        mes: item.mes,
        a_cuenta: item.a_cuenta,
        deuda: item.por_pagar,
        checked: false,
      }));
      setDeudas(data);
      setFilasSeleccionadas({});
      setMontoPagar({});
      setTotalPagar(0);

      // Calcular deuda total inicial
      const total = data.reduce((sum: number, item: any) => sum + parseFloat(item.deuda), 0);
      setTotalDeuda(total);
    } catch (error) {
      // manejarError(error);
    }
  };

  const handleSocioChange = (event: any, newValue: Socio | null) => {
    setValueAC(newValue as any);
    if (newValue) {
      setIdSocioSeleccionado(newValue.id_socio.toString());
      setIdPuestoSeleccionado("");
      setDeudas([]);
      fetchPuestos(newValue.id_socio.toString());

      setFormData({
        ...formData,
        id_socio: newValue.id_socio.toString(),
        nombre_socio: newValue.nombre_completo,
      })

    } else {
      setIdSocioSeleccionado("");
      setPuestos([]);
      setIdPuestoSeleccionado("");
      setDeudas([]);
    }
  };

  const handlePuestoChange = (event: any) => {
    const idPuesto = event.target.value;
    setIdPuestoSeleccionado(idPuesto);
    fetchDeudaPuesto(idSocioSeleccionado, idPuesto);

    const puestoSeleccionado = puestos.find((puesto) => puesto.id_puesto.toString() === idPuesto);
    if (puestoSeleccionado) {
      setFormData({
        ...formData,
        nombre_block: puestoSeleccionado.block.nombre,
        numero_puesto: puestoSeleccionado.numero_puesto,
      })
    }
  };

  const handleCheckBoxChange = (checked: boolean, idDeudaCuota: number) => {
    const updatedFilas = { ...filasSeleccionadas, [idDeudaCuota]: checked };
    setFilasSeleccionadas(updatedFilas);

    const deuda = deudas.find((d) => d.id_deuda_cuota === idDeudaCuota);
    if (deuda) {
      const updatedMontoPagar = { ...montoPagar };
      if (checked) {
        updatedMontoPagar[idDeudaCuota] = parseFloat(deuda.deuda);
      } else {
        delete updatedMontoPagar[idDeudaCuota];
      }
      setMontoPagar(updatedMontoPagar);
      calcularTotal(updatedMontoPagar);
    }
  };

  const handleMontoPagarChange = (idDeudaCuota: number, valor: string) => {
    // Si la fila no está seleccionada, no permitir cambios
    if (!filasSeleccionadas[idDeudaCuota]) return;

    const monto = parseFloat(valor) || 0;
    const deuda = deudas.find((d) => d.id_deuda_cuota === idDeudaCuota);

    if (deuda) {
      // Validar que el monto no exceda la deuda pendiente
      if (monto > parseFloat(deuda.deuda)) {
        mostrarAlerta("Error", "El monto a pagar no puede exceder la deuda pendiente", "error");
        return;
      }

      const updatedMontoPagar = { ...montoPagar, [idDeudaCuota]: monto };
      setMontoPagar(updatedMontoPagar);
      calcularTotal(updatedMontoPagar);
    }
  };

  const calcularTotal = (montos: { [key: number]: number }) => {
    const total = Object.values(montos).reduce((sum, current) => sum + current, 0);
    setTotalPagar(total);
  };

  const handleCloseModal = () => {
    setIdSocioSeleccionado("");
    setPuestos([]);
    setIdPuestoSeleccionado("");
    setDeudas([]);
    setFilasSeleccionadas({});
    setMontoPagar({});
    setTotalPagar(0);
    setValueAC(null);
    handleClose();
  };

  // Registrar Pago
  const registrarPago = async () => {
    if (!idSocioSeleccionado) {
      mostrarAlerta("Error", "Debe seleccionar un socio", "error");
      return;
    }

    const deudasSeleccionadas = deudas
      .filter((d) => filasSeleccionadas[d.id_deuda_cuota])
      .map((d) => ({
        id_deuda_cuota: d.id_deuda_cuota,
        importe: montoPagar[d.id_deuda_cuota],
        servicio: d.servicio_descripcion
      }));

    if (deudasSeleccionadas.length === 0) {
      mostrarAlerta("Error", "Debe seleccionar al menos una deuda para pagar", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post(Api_Global_Pagos.pagos.registrar(), {
        id_socio: idSocioSeleccionado,
        deudas: deudasSeleccionadas,
      });

      if (response.status === 200) {
        mostrarAlerta("Éxito", "El pago se ha registrado correctamente", "success");
        // GENERAR RECIBO
        generatePDF(deudasSeleccionadas, response.data.data.serie, response.data.data.numero_pago);

        handleCloseModal();
      }
    } catch (error) {
      manejarError(error);
    } finally {
      setLoading(false);
    }
  };

  // GENERAR RECIBO PDF
  const generatePDF = (servicios: any[], serie: string, numero_pago: string) => {
    const doc = jsPDF as any;
    const pdf = new doc({
      orientation: "portrait",
      unit: "mm",
      format: [80, 150], // Formato de ticket (Ancho: 80mm)
    });

    const marginX = 5;
    let currentY = 10;

    // Título / Empresa
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.text("MERCADO LAS ESTRELLAS", 40, currentY, { align: "center" });

    currentY += 6;
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text("RUC: 20600123456", 40, currentY, { align: "center" });

    currentY += 4;
    pdf.text("AV. LAS ESTRELLAS NRO. 123", 40, currentY, { align: "center" });

    currentY += 4;
    pdf.text("SANTA ANITA - LIMA - LIMA", 40, currentY, { align: "center" });

    currentY += 6;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("RECIBO DE PAGO", 40, currentY, { align: "center" });

    currentY += 5;
    pdf.text(`${serie}-${numero_pago}`, 40, currentY, { align: "center" });

    // Separador
    currentY += 4;
    pdf.setLineWidth(0.2);
    pdf.line(marginX, currentY, 75, currentY);

    // Información del Socio y Puesto
    currentY += 6;
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Socio:`, marginX, currentY);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${formData.nombre_socio}`, 15, currentY);

    currentY += 4;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Block:`, marginX, currentY);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${formData.nombre_block}`, 15, currentY);

    currentY += 4;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Puesto:`, marginX, currentY);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${formData.numero_puesto}`, 18, currentY);

    currentY += 4;
    pdf.setFont("helvetica", "bold");
    pdf.text(`Fecha:`, marginX, currentY);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${formatDate(new Date().toISOString())}`, 15, currentY);

    // Detalle de servicios
    currentY += 6;
    pdf.line(marginX, currentY, 75, currentY);

    currentY += 5;
    pdf.setFont("helvetica", "bold");
    pdf.text("SERVICIO", marginX, currentY);
    pdf.text("IMPORTE", 75, currentY, { align: "right" });

    currentY += 4;
    pdf.setFont("helvetica", "normal");
    servicios.forEach((s) => {
      pdf.text(`${s.servicio}`, marginX, currentY);
      pdf.text(`S/ ${s.importe.toFixed(2)}`, 75, currentY, { align: "right" });
      currentY += 4;
    });

    // Total
    pdf.line(marginX, currentY, 75, currentY);
    currentY += 6;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("TOTAL:", marginX, currentY);
    pdf.text(`S/ ${totalPagar.toFixed(2)}`, 75, currentY, { align: "right" });

    currentY += 10;
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "italic");
    pdf.text("Gracias por su pago", 40, currentY, { align: "center" });

    // Descargar el PDF (se puede abrir en una nueva pestaña o descargar automáticamente)
    const blob = pdf.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url);
  };


  // Contenido del modal
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <>
            <AvisoFormulario />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={12} marginTop={1}
                display="flex" flexDirection={isMobile ? "column" : "row"} gap={1}>
                {/* Seleccionar socio */}
                <Box
                  sx={{
                    flexGrow: 1,
                    width: isMobile ? "100%" : "50%",
                  }}
                >
                  <Autocomplete
                    value={valueAC}
                    id="combo-box-demo"
                    options={socios}
                    getOptionLabel={(option) => option.nombre_completo}
                    onChange={handleSocioChange}
                    sx={{ width: "100%" }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Seleccionar Socio *"
                        variant="outlined"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <Business sx={{ mr: 1, color: "gray" }} />
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                </Box>

                {/* Seleccionar puesto */}
                <Box
                  sx={{
                    flexGrow: 1,
                    width: isMobile ? "100%" : "50%",
                  }}
                >
                  <FormControl fullWidth required>
                    <InputLabel id="puesto-label">Seleccionar Puesto *</InputLabel>
                    <Select
                      labelId="puesto-label"
                      id="puesto-select"
                      value={idPuestoSeleccionado}
                      label="Seleccionar Puesto *"
                      onChange={handlePuestoChange}
                      startAdornment={<Business sx={{ mr: 1, color: "gray" }} />}
                      disabled={!idSocioSeleccionado}
                    >
                      {puestos.map((puesto) => (
                        <MenuItem key={puesto.id_puesto} value={puesto.id_puesto.toString()}>
                          {puesto.numero_puesto}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Grid>

              {/* Detalle de deudas */}
              <Grid item xs={12}>
                <TableContainer component={Paper}
                  sx={{
                    height: "200px",
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
                      {deudas.length > 0 ? (
                        deudas.map((deuda) => (
                          <TableRow hover role="checkbox" tabIndex={-1} key={deuda.id_deuda_cuota}>
                            <TableCell align="center">{deuda.anio}</TableCell>
                            <TableCell align="center">{nombreMes(parseInt(deuda.mes))}</TableCell>
                            <TableCell align="center">{deuda.servicio_descripcion}</TableCell>
                            <TableCell align="center">{deuda.total}</TableCell>
                            <TableCell align="center">{deuda.a_cuenta}</TableCell>
                            <TableCell align="center">
                              <TextField
                                type="number"
                                size="small"
                                value={filasSeleccionadas[deuda.id_deuda_cuota] ? (montoPagar[deuda.id_deuda_cuota] || "") : ""}
                                onChange={(e) => handleMontoPagarChange(deuda.id_deuda_cuota, e.target.value)}
                                disabled={!filasSeleccionadas[deuda.id_deuda_cuota]}
                                sx={{
                                  width: "80px",
                                  "& .MuiInputBase-input": {
                                    textAlign: "center",
                                  },
                                }}
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Checkbox
                                color="primary"
                                checked={!!filasSeleccionadas[deuda.id_deuda_cuota]}
                                onChange={(e) => handleCheckBoxChange(e.target.checked, deuda.id_deuda_cuota)}
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} align="center">
                            No hay deudas pendientes para este puesto
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>

              {/* Totales */}
              <Grid item xs={12} display="flex" justifyContent="flex-end" sx={{ mt: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  <TextField
                    label="Monto Total a Pagar"
                    value={totalPagar.toFixed(2)}
                    InputProps={{
                      readOnly: true,
                      startAdornment: <Typography sx={{ mr: 1 }}>S/</Typography>,
                    }}
                    sx={{
                      width: isMobile ? "100%" : "200px",
                    }}
                  />
                </Box>
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
            mr: 1,
            backgroundColor: "#008001",
            color: "#fff",
            "&:hover": {
              backgroundColor: "#388E3C",
            },
          }}
          onClick={registrarPago}
        >
          Registrar
        </Button>
        <Button
          variant="contained"
          sx={{
            width: "200px",
            height: "45px",
            backgroundColor: "#202123",
            color: "#fff",
            "&:hover": {
              backgroundColor: "#3F4145",
            },
          }}
          onClick={handleCloseModal}
        >
          Cerrar
        </Button>
      </div>
    </Box>
  );
};

export default RegistrarPago;
