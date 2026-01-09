import React, { useEffect, useState } from "react";
import {
    Box,
    Button,
    Grid,
    Typography,
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
} from "@mui/material";
import { CalendarIcon } from "@mui/x-date-pickers";
import { Business, Delete, AttachMoney } from "@mui/icons-material";
import ContenedorModal from "../Shared/ContenedorModal";
import { TxtFormulario, AvisoFormulario } from "../Shared/ElementosFormulario";
import apiClient from "../../Utils/apliClient";
import { Api_Global_Pagos } from "../../service/PagoApi";
import { mostrarAlerta, manejarError } from "../Alerts/Registrar";
import { Data as PagoData } from "../../interface/Pagos/Pagos";
import useResponsive from "../../hooks/Responsive/useResponsive";
import { Socio, Puesto, DeudaPendiente } from "../../interface/Pagos/RegistrarPagos";

interface Props {
    open: boolean;
    handleClose: () => void;
    pago: PagoData | null;
}

const columns = [
    { id: "anio", label: "Año", minWidth: 50, align: "center" },
    { id: "mes", label: "Mes", minWidth: 50, align: "center" },
    { id: "servicio_descripcion", label: "Servicio", minWidth: 50, align: "center" },
    { id: "total", label: "Total (S/)", minWidth: 50, align: "center" },
    { id: "a_cuenta", label: "A cuenta (S/)", minWidth: 50, align: "center" },
    { id: "pago", label: "Pago (S/)", minWidth: 50, align: "center" },
    { id: "accion", label: "", minWidth: 30, align: "center" },
];

const ModalEditarPago: React.FC<Props> = ({ open, handleClose, pago }) => {
    const { isMobile } = useResponsive();
    const [loading, setLoading] = useState(false);
    const [fechaRegistro, setFechaRegistro] = useState("");
    const [socios, setSocios] = useState<Socio[]>([]);
    const [puestos, setPuestos] = useState<Puesto[]>([]);
    const [idSocioSeleccionado, setIdSocioSeleccionado] = useState<string>("");
    const [idPuestoSeleccionado, setIdPuestoSeleccionado] = useState<string>("");
    const [valueSocioAC, setValueSocioAC] = useState<Socio | null>(null);
    const [deudas, setDeudas] = useState<DeudaPendiente[]>([]);
    const [totalPagar, setTotalPagar] = useState(0);

    // Fetch initial data (Socios)
    useEffect(() => {
        const fetchSocios = async () => {
            try {
                const response = await apiClient.get(Api_Global_Pagos.socios.listar());
                setSocios(response.data.data);
            } catch (error) {
                console.error("Error fetching socios", error);
            }
        };
        if (open) fetchSocios();
    }, [open]);

    // Populate form when pago is selected
    useEffect(() => {
        const loadPagoDetail = async () => {
            if (!pago || !open) return;
            setLoading(true);
            try {
                const response = await apiClient.get(Api_Global_Pagos.pagos.obtener(pago.id_pago));
                const fullPago = response.data.data;

                setFechaRegistro(fullPago.fecha_registro || "");
                setIdSocioSeleccionado(String(fullPago.id_socio));

                // Find and set the socio for Autocomplete
                if (fullPago.socio) {
                    setValueSocioAC(fullPago.socio);
                }

                // Load puestos for this socio
                const puestosRes = await apiClient.get(Api_Global_Pagos.puestos.listarPorSocio(fullPago.id_socio));
                setPuestos(puestosRes.data.data);

                // Find and set the current puesto (identifying by numero_puesto from the list if possible, 
                // but the list only has 'puesto' string "B-01". We might need to iterate)
                const currentPuesto = puestosRes.data.data.find((p: any) => `${p.block.nombre}-${p.numero_puesto}` === pago.puesto);
                if (currentPuesto) {
                    setIdPuestoSeleccionado(String(currentPuesto.id_puesto));
                    // Load deudas (including those in the current payment)
                    fetchDeudaPuesto(String(fullPago.id_socio), String(currentPuesto.id_puesto), fullPago.detalle_pagos);
                }

            } catch (error) {
                manejarError(error);
            } finally {
                setLoading(false);
            }
        };
        loadPagoDetail();
    }, [pago, open]);

    const fetchDeudaPuesto = async (idSocio: string, idPuesto: string, currentDetalles: any[] = []) => {
        try {
            const response = await apiClient.get(Api_Global_Pagos.cuotas.pendientesPorPuesto(idSocio, idPuesto));
            let allDeudas = response.data.data.map((item: any) => ({
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

            // Include or highlight deudas that were part of the current payment
            const updatedDeudas = allDeudas.map((d: any) => {
                const detail = currentDetalles.find(det => det.id_deuda_cuota === d.id_deuda_cuota);
                if (detail) {
                    return { ...d, checked: true, deuda: detail.importe };
                }
                return d;
            });

            // If some deudas from currentDetalles are NOT in the pending list (because they were paid fully)
            // we should add them manually to the table so they can be edited/removed.
            currentDetalles.forEach(det => {
                if (!updatedDeudas.some((d: any) => d.id_deuda_cuota === det.id_deuda_cuota)) {
                    updatedDeudas.push({
                        id_deuda: det.id_deuda,
                        id_deuda_cuota: det.id_deuda_cuota,
                        total: det.monto || det.importe, // We might need more info here
                        servicio_descripcion: det.servicio_nombre || "Servicio",
                        anio: det.anio,
                        mes: det.mes,
                        a_cuenta: 0, // Since it's already in the payment
                        deuda: det.importe,
                        checked: true,
                    });
                }
            });

            setDeudas(updatedDeudas);
            calcularTotal(updatedDeudas);
        } catch (error) {
            console.error("Error al obtener las deudas", error);
        }
    };

    const handleCheckBoxChange = (checked: boolean, idDeudaCuota: number) => {
        const updated = deudas.map(d => d.id_deuda_cuota === idDeudaCuota ? { ...d, checked } : d);
        setDeudas(updated);
        calcularTotal(updated);
    };

    const actualizarMontoPagar = (idDeudaCuota: number, valor: number) => {
        const updated = deudas.map(d => d.id_deuda_cuota === idDeudaCuota ? { ...d, deuda: valor } : d);
        setDeudas(updated);
        calcularTotal(updated);
    };

    const calcularTotal = (listaDeudas: DeudaPendiente[]) => {
        const total = listaDeudas.filter(d => d.checked).reduce((sum, d) => sum + (parseFloat(String(d.deuda)) || 0), 0);
        setTotalPagar(total);
    };

    const handleUpdate = async () => {
        if (!pago) return;
        setLoading(true);
        const selectedDeudas = deudas.filter(d => d.checked).map(d => ({
            id_deuda_cuota: d.id_deuda_cuota,
            importe: parseFloat(String(d.deuda))
        }));

        try {
            await apiClient.put(Api_Global_Pagos.pagos.actualizar(pago.id_pago), {
                id_socio: idSocioSeleccionado,
                fecha_registro: fechaRegistro,
                deudas: selectedDeudas,
            });
            mostrarAlerta("Éxito", "El pago ha sido actualizado correctamente", "success");
            handleClose();
        } catch (error) {
            manejarError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ContenedorModal
            ancho="700px"
            alto="auto"
            abrir={open}
            cerrar={handleClose}
            loading={loading}
            titulo="Editar Pago"
            botones={
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, width: "100%", mt: 1 }}>
                    <Button
                        onClick={handleUpdate}
                        variant="contained"
                        sx={{
                            width: "200px",
                            height: "45px",
                            backgroundColor: "#008001",
                            "&:hover": { backgroundColor: "#006400" }
                        }}
                    >
                        Actualizar
                    </Button>
                    <Button
                        onClick={handleClose}
                        variant="contained"
                        sx={{
                            width: "200px",
                            height: "45px",
                            backgroundColor: "#202123",
                            "&:hover": { backgroundColor: "#3F4145" }
                        }}
                    >
                        Cerrar
                    </Button>
                </Box>
            }
        >
            <AvisoFormulario />
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid item xs={12} sm={6}>
                    <TxtFormulario
                        type="date"
                        label="Fecha de registro"
                        name="fecha_registro"
                        value={fechaRegistro}
                        onChange={(e) => setFechaRegistro(e.target.value)}
                        noMargin={true}
                        icono={<CalendarIcon sx={{ mr: 1, color: "gray" }} />}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <Autocomplete
                        value={valueSocioAC}
                        options={socios}
                        getOptionLabel={(option) => option.nombre_completo}
                        onChange={(e, newValue) => {
                            setValueSocioAC(newValue);
                            if (newValue) {
                                setIdSocioSeleccionado(String(newValue.id_socio));
                                // Load puestos for new socio
                                apiClient.get(Api_Global_Pagos.puestos.listarPorSocio(newValue.id_socio))
                                    .then(res => setPuestos(res.data.data));
                                setIdPuestoSeleccionado("");
                                setDeudas([]);
                            }
                        }}
                        renderInput={(params) => (
                            <TextField {...params} label="Socio" variant="outlined"
                                InputProps={{ ...params.InputProps, startAdornment: <Business sx={{ mr: 1, color: "gray" }} /> }}
                            />
                        )}
                    />
                </Grid>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                        <InputLabel>Puesto</InputLabel>
                        <Select
                            value={idPuestoSeleccionado}
                            label="Puesto"
                            onChange={(e) => {
                                const val = e.target.value as string;
                                setIdPuestoSeleccionado(val);
                                fetchDeudaPuesto(idSocioSeleccionado, val);
                            }}
                            startAdornment={<Business sx={{ mr: 1, color: "gray" }} />}
                        >
                            {puestos.map(p => (
                                <MenuItem key={p.id_puesto} value={String(p.id_puesto)}>
                                    {p.numero_puesto}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={12}>
                    <TableContainer component={Paper} sx={{ height: "200px", border: "1px solid #ccc", borderRadius: 2 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    {columns.map(col => (
                                        <TableCell key={col.id} align="center" sx={{ backgroundColor: "#202123", color: "white", fontWeight: "bold" }}>
                                            {col.label}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {deudas.map(deuda => (
                                    <TableRow key={deuda.id_deuda_cuota}>
                                        <TableCell align="center">{deuda.anio}</TableCell>
                                        <TableCell align="center">{deuda.mes}</TableCell>
                                        <TableCell align="center">{deuda.servicio_descripcion}</TableCell>
                                        <TableCell align="center">{deuda.total}</TableCell>
                                        <TableCell align="center">{deuda.a_cuenta}</TableCell>
                                        <TableCell align="center">
                                            <TextField
                                                type="number"
                                                size="small"
                                                value={deuda.deuda}
                                                disabled={!deuda.checked}
                                                onChange={(e) => actualizarMontoPagar(deuda.id_deuda_cuota, parseFloat(e.target.value) || 0)}
                                                sx={{ width: 80 }}
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Checkbox
                                                checked={deuda.checked}
                                                onChange={(e) => handleCheckBoxChange(e.target.checked, deuda.id_deuda_cuota)}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

                <Grid item xs={12} sm={6} sx={{ ml: "auto" }}>
                    <TextField
                        fullWidth
                        label="Monto Total a Pagar"
                        value={totalPagar.toFixed(2)}
                        InputProps={{ readOnly: true, startAdornment: <AttachMoney sx={{ mr: 1, color: "gray" }} /> }}
                    />
                </Grid>
            </Grid>
        </ContenedorModal>
    );
};

export default ModalEditarPago;
