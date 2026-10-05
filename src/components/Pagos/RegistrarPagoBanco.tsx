import { Business, AccountBalance, CardMembership, Event, AccountCircle } from "@mui/icons-material";
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
import React, { useEffect, useState } from "react";
import useResponsive from "../../hooks/Responsive/useResponsive";
import {
  manejarError,
  mostrarAlerta,
  mostrarAlertaConfirmacion,
} from "../Alerts/Registrar";
import jsPDF from "jspdf";
import { AvisoFormulario, TxtFormulario } from "../Shared/ElementosFormulario";
import { formatDate, nombreMes } from "../../Utils/dateUtils";
import { AgregarProps, Column, Puesto, Socio, Banco, BancoCuenta, FormRegistroBanco, RegistroPagoCompartido } from "../../interface/Pagos/RegistrarPagos";
import { Api_Global_Pagos } from "../../service/PagoApi";
import { Api_Global_Setup } from "../../service/SetupApi";
import apiClient from "../../Utils/apliClient";
import ContenedorMini from "../Shared/ContenedorMini";

const columns: readonly Column[] = [
  { id: "anio", label: "Año", minWidth: 50, align: "center" },
  { id: "mes", label: "Mes", minWidth: 50, align: "center" },
  { id: "servicio_descripcion", label: "Servicio", minWidth: 50, align: "center" },
  { id: "total", label: "Total (S/)", minWidth: 50, align: "center" },
  { id: "a_cuenta", label: "A cuenta (S/)", minWidth: 50, align: "center" },
  { id: "pago", label: "Pago (S/)", minWidth: 50, align: "center" },
  { id: "accion", label: "", minWidth: 30, align: "center" },
];

const RegistrarPagoBanco: React.FC<AgregarProps & RegistroPagoCompartido> = ({
  pago,
  socios,
  puestos,
  idSocioSeleccionado,
  idPuestoSeleccionado,
  valueAC,
  setValueAC,
  deudas,
  setDeudas,
  setIdSocioSeleccionado,
  setIdPuestoSeleccionado,
  montoPagar,
  totalPagar,
  fechaPago,
  setFechaPago,
  formData,
  setFormData,
  fetchPuestos,
  fetchDeudaPuesto,
  handleCheckBoxChange,
  actualizarMontoPagar,
  calcularTotalSeleccionado,
  handleCloseModal,
}) => {
  const { isMobile } = useResponsive();
  const [activeTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [bancoCuentas, setBancoCuentas] = useState<BancoCuenta[]>([]);
  const [idBancoSeleccionado, setIdBancoSeleccionado] = useState("");
  const [idBancoCuentaSeleccionado, setIdBancoCuentaSeleccionado] = useState("");

  // Campos propios del pago por banco (no compartidos entre pestañas)
  const [formDataBanco, setFormDataBanco] = useState<FormRegistroBanco>({
    id_socio: "",
    nombre_socio: "",
    nombre_block: "",
    numero_puesto: "",
    id_banco: "",
    id_bancocuenta: "",
    numero_operacion: "",
    fecha_operacion: "",
    deudas: [{
      id_deuda_cuota: 0,
      importe: 0,
      servicio: "",
    }]
  });

  // Obtener Lista Bancos
  const fetchBancos = async () => {
    try {
      const response = await apiClient.get(Api_Global_Setup.bancos.listar());
      const data = response.data.data.map((item: Banco) => ({
        id_banco: item.id_banco,
        siglas_nombre: item.siglas_nombre,
      }));
      setBancos(data);
    } catch (error) {
    }
  };

  // Obtener Lista Banco Cuentas
  const fetchBancoCuentas = async (idBanco: string) => {
    try {
      const response = await apiClient.get(Api_Global_Setup.bancoCuentas.listar(idBanco));
      const data = response.data.data.map((item: BancoCuenta) => ({
        id_bancocuenta: item.id_bancocuenta,
        numero_cuenta: item.numero_cuenta,
      }));
      setBancoCuentas(data);
    } catch (error) {
    }
  };

  // Sincronizar datos bancarios del pago cuando se recibe para edición
  useEffect(() => {
    if (pago && pago.pago_banco) {
      const pb = pago.pago_banco;
      setIdBancoSeleccionado(pb.id_banco);
      setIdBancoCuentaSeleccionado(pb.id_bancocuenta);
      fetchBancoCuentas(pb.id_banco);
      setFormDataBanco(prev => ({
        ...prev,
        id_banco: pb.id_banco,
        id_bancocuenta: pb.id_bancocuenta,
        numero_operacion: pb.numero_operacion,
        fecha_operacion: pb.fecha_operacion
      }));
    }
  }, [pago]);

  // Validar formulario antes de registrar
  const validarFormulario = () => {
    if (!idSocioSeleccionado) {
      mostrarAlerta("Atención", "Seleccione un socio.", "warning");
      return false;
    }
    if (!idPuestoSeleccionado) {
      mostrarAlerta("Atención", "Seleccione un puesto.", "warning");
      return false;
    }
    if (formData.deudas.length === 0) {
      mostrarAlerta("Atención", "Seleccione al menos una deuda a pagar.", "warning");
      return false;
    }
    if (totalPagar <= 0) {
      mostrarAlerta("Atención", "El monto a pagar debe ser mayor a cero.", "warning");
      return false;
    }
    return true;
  };

  // REGISTRAR PAGO
  const registrarPago = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!pago && !validarFormulario()) {
      return;
    }

    if (!pago) {
      const confirmHTML = `
        <div style="text-align:left; line-height:1.8;">
          <strong>Socio:</strong> ${formData.nombre_socio}<br/>
          <strong>Puesto:</strong> ${formData.nombre_block} - ${formData.numero_puesto}<br/>
          <strong>Monto total:</strong> S/ ${totalPagar.toFixed(2)}
        </div>`;

      const result = await mostrarAlertaConfirmacion(
        "Confirmar pago",
        "Verifique los datos antes de continuar",
        "Confirmar",
        "Cancelar",
        confirmHTML
      );
      if (!result.isConfirmed) {
        return;
      }
    }

    setLoading(true);

    // Extraemos los datos necesarios para enviar
    const { nombre_socio, nombre_block, numero_puesto, deudas, ...rest } = formData;
    const filteredDeudas = deudas.map(({ servicio, ...deudaRest }) => deudaRest); // Filtramos el servicio de las deudas
    const dataToSend: {
      id_socio: string;
      deudas: { id_deuda_cuota: number; importe: number; }[] // Solo enviamos el id_deuda y el importe
    } = { ...rest, ...formDataBanco, deudas: filteredDeudas }; // Retornamos el id_socio, datos de banco y las deudas sin el servicio

    try {
      let response;
      if (pago) {
        // En modo edición solo permitimos actualizar la fecha y campos de banco según backend
        response = await apiClient.put(Api_Global_Pagos.pagos.editar(pago.id_pago), {
          fecha_registro: fechaPago,
          id_banco: formDataBanco.id_banco,
          id_bancocuenta: formDataBanco.id_bancocuenta,
          numero_operacion: formDataBanco.numero_operacion,
          fecha_operacion: formDataBanco.fecha_operacion
        });
      } else {
        response = await apiClient.post(Api_Global_Pagos.pagos.registrarPorBanco(), dataToSend);
      }

      if (response.status === 200) {
        const mensaje = response.data.message || (pago ? "El pago fue actualizado correctamente" : "El pago fue registrado correctamente");
        if (!pago) {
          generarTicketPDF({ ...formData, ...formDataBanco }, response.data.data);
        }
        mostrarAlerta(pago ? "Actualización exitosa" : "Registro exitoso", mensaje, "success").then(() => {
          handleCloseModal();
        });
      } else {
        mostrarAlerta("Error", "Ocurrió un error inesperado.", "error");
      }
    } catch (error) {
      manejarError(error);
    } finally {
      setLoading(false);
    }
  };

  const generarTicketPDF = async (data: FormRegistroBanco, pago: any) => {
    const ticket = new jsPDF();
    const pageWidth = ticket.internal.pageSize.getWidth(); // Ancho de la página

    const response = await fetch("/logoBase64.txt");
    const imagenLogo = await response.text();

    const centerText = (text: string, y: number) => {
      const textWidth = ticket.getTextWidth(text);
      const x = (pageWidth - textWidth) / 2 + 20;
      ticket.text(text, x, y);
    };

    const rightText = (text: string, y: number) => {
      const textWidth = ticket.getTextWidth(text);
      const x = pageWidth - textWidth - 20;
      ticket.text(text, x, y);
    };

    const textoMezclado = (textoNegrita: string, textoNormal: string, x: number, y: number, ticket: jsPDF) => {
      const textoNegritaWidth = ticket.getTextWidth(textoNegrita);
      ticket.setFont("helvetica", "bold");
      ticket.text(textoNegrita, x, y);
      ticket.setFont("helvetica", "normal");
      ticket.text(textoNormal, x + textoNegritaWidth, y);
    };

    ticket.setFontSize(12);
    ticket.setFont("helvetica", "bold");

    ticket.addImage(imagenLogo, "JPEG", 20, 10, 30, 30);
    centerText("Asociación comercial de Propietarios del Mercado", 18);
    centerText('"Nstra. Sra.de Las Estrellas"', 25);

    ticket.setFontSize(10);
    centerText('Fundado el 07 de Abril de 1977 Inscrito en la Sunarp Partida N°11012575.', 32);
    centerText('Calle 9 Asociación de Viv. "Hijos de Apurimac Primera Etapa - Santa Clara - Ate', 36);

    textoMezclado("N° Recibo: ", pago.numero_pago, 20, 50, ticket);
    textoMezclado("Socio:  ", data.nombre_socio, 20, 60, ticket);
    
    // Buscar nombre del banco
    const bancoSeleccionado = bancos.find(b => b.id_banco === Number(data.id_banco));
    const nombreBanco = bancoSeleccionado?.siglas_nombre || "";
    
    // Buscar número de cuenta
    const cuentaSeleccionada = bancoCuentas.find(c => c.id_bancocuenta === Number(data.id_bancocuenta));
    const numeroCuenta = cuentaSeleccionada?.numero_cuenta || "";
    
    textoMezclado("Nombre de banco:  ", nombreBanco, 20, 70, ticket);
    textoMezclado("N° Cuenta:  ", numeroCuenta, 20, 80, ticket);
    textoMezclado("N° Operación:  ", data.numero_operacion, 20, 90, ticket);
    textoMezclado("Fecha Operación:  ", data.fecha_operacion, 20, 100, ticket);

    const posTextoCompleto = pageWidth - ticket.getTextWidth(`Block:  ${data.nombre_block} - Puesto:  ${data.numero_puesto}`) - 20;
    const anchoPuesto = ticket.getTextWidth(`Puesto:  ${data.numero_puesto}`);
    textoMezclado('Block:  ', `${data.nombre_block} - `, posTextoCompleto, 50, ticket);
    textoMezclado('Puesto:  ', data.numero_puesto, pageWidth - anchoPuesto - 20, 50, ticket);

    const fechaHora = new Date().toLocaleString();

    const anchoFechaHora = ticket.getTextWidth(`Fecha y hora:  ${fechaHora.toString()}`);
    textoMezclado('Fecha y Hora:  ', fechaHora.toString(), pageWidth - anchoFechaHora - 20, 60, ticket);

    ticket.setFont("helvetica", "bold");

    ticket.text("DESCRIPCIÓN", 30, 115);
    rightText("IMPORTE", 115);

    let y = 125;

    data.deudas.forEach((deuda, index) => {

      ticket.text(`#${index + 1}`, 20, y);
      ticket.text(`${deuda.servicio}`, 30, y);
      rightText(`S/${deuda.importe.toFixed(2)}`, y);

      y += 5; // Espaciado entre las deudas

      // Dibujar una línea semi visible de separación
      ticket.setDrawColor(200, 200, 200); // Color gris claro
      ticket.line(20, y, pageWidth - 20, y);

      y += 8; // Espaciado adicional después de la línea

    });

    rightText(`Total a pagar: S/${totalPagar.toFixed(2)}`, y + 10);

    const date = new Date();
    const mes = date.getMonth();
    const dia = date.getDate();
    const año = date.getFullYear();

    rightText(`Lima, ${dia} de ${nombreMes(mes)} del ${año}`, y + 30);

    // Generar el PDF
    const pdfBlob = ticket.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const ticketLink = document.createElement('a');

    const fecha = formatDate(date.toString())

    ticketLink.href = pdfUrl;
    ticketLink.target = "_blank"; // Abrir en una nueva pestaña
    ticketLink.click();

    ticketLink.download = `Recibo-Pago-${data.nombre_socio}-${fecha}.pdf`; // Nombre personalizado
    ticketLink.click();

    // Limpiar la URL temporal después de abrirla
    URL.revokeObjectURL(pdfUrl);
  };

  useEffect(() => {
    fetchBancos();
  }, []);

  // Contenido del modal
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <>
            <AvisoFormulario />

            {/* <pre>{JSON.stringify(formData, null, 2)}</pre> */}

            <Grid container spacing={1}>
              <Grid item xs={12} sm={12} marginTop={0}
                display="flex" flexDirection={isMobile ? "column" : "row"} gap={1}>
                {/* Seleccionar banco */}
                <FormControl
                  sx={{ width: isMobile ? "100%" : "50%" }}
                >
                  <InputLabel id="seleccionar-banco-label">
                    Seleccionar Banco
                  </InputLabel>
                  <Select
                    labelId="seleccionar-banco-label"
                    label="Seleccionar Banco"
                    id="select-banco"
                    value={idBancoSeleccionado}
                    onChange={(e) => {
                      const value = e.target.value;
                      setIdBancoSeleccionado(value);
                      setFormDataBanco({
                        ...formDataBanco,
                        id_banco: value,
                      });
                      fetchBancoCuentas(value);
                    }}
                    startAdornment={<AccountBalance sx={{ mr: 1, color: "gray" }} />}
                  >
                    {bancos.map((banco: Banco) => (
                      <MenuItem key={banco.id_banco} value={banco.id_banco}>
                        {banco.siglas_nombre}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Seleccionar número cuenta */}
                <FormControl
                  sx={{ width: isMobile ? "100%" : "50%" }}
                >
                  <InputLabel id="seleccionar-numero-cuenta-label">
                    Seleccionar Número de cuenta
                  </InputLabel>
                  <Select
                    labelId="seleccionar-numero-cuenta-label"
                    label="Seleccionar Número de cuenta"
                    id="select-numero-cuenta"
                    value={idBancoCuentaSeleccionado}
                    onChange={(e) => {
                      const value = e.target.value;
                      setIdBancoCuentaSeleccionado(value);
                      setFormDataBanco({
                        ...formDataBanco,
                        id_bancocuenta: value,
                      });
                    }}
                    startAdornment={<CardMembership sx={{ mr: 1, color: "gray" }} />}
                  >
                    {bancoCuentas.map((bancoCuenta: BancoCuenta) => (
                      <MenuItem key={bancoCuenta.id_bancocuenta} value={bancoCuenta.id_bancocuenta}>
                        {bancoCuenta.numero_cuenta}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={12} marginTop={0}
                display="flex" flexDirection={isMobile ? "column" : "row"} gap={1}>
                {/* Ingresar numero operacion */}
                <FormControl
                  sx={{
                    width: isMobile ? "100%" : "50%",
                    mb: isMobile ? "15px" : "0px",
                  }}
                >
                  <TxtFormulario
                    label="Número de operación (*)"
                    name="numero_operacion"
                    value={formDataBanco.numero_operacion}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormDataBanco({
                        ...formDataBanco,
                        numero_operacion: value,
                      });
                    }}
                    icono={<AccountCircle sx={{ mr: 1, color: "gray" }} />}
                  />
                </FormControl>

                {/* Ingresar fecha operacion */}
                <FormControl
                  sx={{ width: isMobile ? "100%" : "50%" }}
                >
                  <TxtFormulario
                    type="date"
                    label="Fecha de operación"
                    name="fecha_operacion"
                    value={formDataBanco.fecha_operacion}
                    // onChange={manejarCambio}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormDataBanco({
                        ...formDataBanco,
                        fecha_operacion: value,
                      });
                    }}
                    icono={<Event sx={{ mr: 1, color: "gray" }} />}
                  />
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={12} marginTop={1}
                display="flex" flexDirection={isMobile ? "column" : "row"} gap={1}>
                {/* Seleccionar socio */}
                <FormControl
                  sx={{
                    width: isMobile ? "100%" : "50%",
                    mb: isMobile ? "15px" : "0px",
                  }}
                >
                  <Autocomplete
                    value={valueAC}
                    options={socios}
                    getOptionLabel={(socio: Socio) => socio.nombre_completo}
                    onChange={(event, newValue: any) => {
                      if (newValue) {
                        const socioId = String(newValue.id_socio); // Convertimos id_socio a string
                        setIdSocioSeleccionado(socioId); // Asignamos el string
                        setFormData({
                          ...formData,
                          id_socio: socioId,
                          nombre_socio: newValue.nombre_completo,
                        }); // Mantenemos el string en formData
                        fetchPuestos(socioId); // Pasamos el id_socio como string
                        setIdPuestoSeleccionado(""); // Limpiamos el puesto seleccionado
                        setDeudas([]); // Limpiamos las deudas
                        setValueAC(newValue);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Seleccionar Socio"
                        InputProps={{
                          ...params.InputProps,
                          startAdornment: (
                            <>
                              <AccountCircle sx={{ mr: 1, color: "gray" }} />
                              {params.InputProps.startAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    ListboxProps={{
                      style: {
                        maxHeight: 270,
                        overflow: "auto",
                      },
                    }}
                    isOptionEqualToValue={(option, value) =>
                      option.id_socio === Number(value)
                    } // Convertimos value a número para la comparación
                  />
                </FormControl>

                {pago && (
                  <TextField
                    label="Fecha de Pago"
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    sx={{ width: isMobile ? "100%" : "20%" }}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                )}

                {/* Seleccionar puesto */}
                <FormControl
                  sx={{ width: isMobile ? "100%" : "50%" }}
                >
                  <InputLabel id="seleccionar-puesto-label">
                    Seleccionar Puesto
                  </InputLabel>
                  <Select
                    labelId="seleccionar-puesto-label"
                    label="Seleccionar Puesto"
                    id="select-puesto"
                    value={idPuestoSeleccionado}
                    onChange={(e) => {
                      const value = e.target.value;
                      setIdPuestoSeleccionado(value);
                      setFormData({
                        ...formData,
                        numero_puesto:
                          puestos.find((p) => p.id_puesto === Number(value))
                            ?.numero_puesto || "",
                        nombre_block:
                          puestos.find((p) => p.id_puesto === Number(value))
                            ?.block.nombre || "",
                      });
                      fetchDeudaPuesto(idSocioSeleccionado, value);
                    }}
                    startAdornment={<Business sx={{ mr: 1, color: "gray" }} />}
                  >
                    {puestos.map((puesto: Puesto) => (
                      <MenuItem key={puesto.id_puesto} value={puesto.id_puesto}>
                        {puesto.numero_puesto}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Tabla deudas */}
              <Grid item xs={12} sm={12}>
                <Paper
                  sx={{
                    width: "100%",
                    overflow: "hidden",
                    boxShadow: "none",
                  }}
                >
                  <TableContainer
                    sx={{
                      height: "130px",
                      borderRadius: "10px",
                      border: "1px solid #202123",
                    }}
                  >
                    <Table>
                      <TableHead sx={{ backgroundColor: "#202123" }}>
                        <TableRow>
                          {columns.map((column) => (
                            <TableCell
                              key={column.id}
                              align={column.align}
                              style={{ minWidth: column.minWidth }}
                              sx={{ color: "white" }}
                            >
                              {column.label}
                            </TableCell>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {idPuestoSeleccionado !== "" && deudas.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={columns.length}
                              align="center"
                              sx={{ color: "#888", fontStyle: "italic", padding: "25px" }}
                            >
                              Este socio no tiene deudas pendientes para el puesto seleccionado.
                            </TableCell>
                          </TableRow>
                        ) : (
                        deudas.map((deuda) => {
                          const montoInicial = parseFloat(deuda.total) - parseFloat(deuda.a_cuenta);

                          // Si el monto a pagar se a cambiado, usamos el nuevo monto; si no, usamos el monto inicial
                          const nuevoMonto =
                            montoPagar[deuda.id_deuda] !== undefined
                              ? montoPagar[deuda.id_deuda]
                              : montoInicial;

                          return (
                            <TableRow hover tabIndex={-1} key={deuda.id_deuda_cuota}>
                              {columns.map((column) => {
                                let value =
                                  column.id === "accion"
                                    ? ""
                                    : (deuda as any)[column.id];

                                if (column.id === "pago") {
                                  value = nuevoMonto;
                                }

                                return (
                                  <TableCell
                                    key={column.id}
                                    align="center"
                                    padding="checkbox"
                                  >
                                    {column.id === "accion" ? (
                                      <Box
                                        sx={{
                                          display: "flex",
                                          gap: 1,
                                          justifyContent: "center",
                                        }}
                                      >
                                        <IconButton
                                          aria-label="select_row"
                                          sx={{ color: "#840202" }}
                                        >
                                          <Checkbox
                                            checked={deuda.checked}
                                            onChange={(e) =>
                                              handleCheckBoxChange(
                                                e.target.checked,
                                                deuda.id_deuda,
                                                deuda.id_deuda_cuota,
                                                deuda.servicio_descripcion,
                                                montoInicial,
                                                montoInicial
                                              )
                                            }
                                          />
                                        </IconButton>
                                      </Box>
                                    ) : column.id === "pago" ? (
                                      <TextField
                                        id={`pago-${deuda.id_deuda_cuota}`}
                                        type="number"
                                        name="pago"
                                        value={deuda.deuda}
                                        onChange={(e) => {
                                          const value =
                                            parseFloat(e.target.value) || 0;
                                          actualizarMontoPagar(
                                            deuda.id_deuda_cuota,
                                            value,
                                            montoInicial
                                          );
                                          calcularTotalSeleccionado();
                                        }}
                                        InputProps={{
                                          // Si no esta seleccionado no se puede editar el monto a pagar
                                          readOnly: !deuda.checked,
                                        }}
                                        sx={{
                                          width: "100px",
                                        }}
                                      />
                                    ) : (
                                      value
                                    )}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>

              {/* Monto a pagar */}
              <Box
                sx={{
                  m: "10px 0 0 auto",
                  pl: isMobile ? "16px" : "0px",
                }}
              >
                {/* <TextField
                  label="Total deuda"
                  value={totalDeuda}
                  focused
                  InputProps={{
                    readOnly: true,
                    startAdornment: <Typography sx={{ mr: 1 }}>S/</Typography>,
                  }}
                  sx={{
                    mr: 2,
                    mb: isMobile ? "15px" : "0px",
                    width: isMobile ? "100%" : "200px",
                  }}
                /> */}
                <TextField
                  color="success"
                  label="Monto a pagar"
                  value={totalPagar}
                  focused
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
          </>
        );
      default:
        return "";
    }
  };

  return (
    <ContenedorMini>
      {renderTabContent()}
      <div style={{ textAlign: "right", marginTop: "15px" }}>
        <Button
          variant="contained"
          sx={{
            width: "140px",
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
          {pago ? "Actualizar" : "Registrar"}
        </Button>
        <Button
          style={{ marginLeft: "auto", marginRight: "auto" }}
          variant="contained"
          sx={{
            width: "140px",
            height: "45px",
            backgroundColor: "#202123",
            color: "#fff",
            mr: 1,
            "&:hover": {
              backgroundColor: "#3F4145",
            },
          }}
          onClick={handleCloseModal}
        >
          Cerrar
        </Button>
      </div>
    </ContenedorMini>
  );
};

export default RegistrarPagoBanco;
