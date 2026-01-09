import React, { useEffect, useState } from "react";
import {
    Button,
    Grid,
    Box,
    Typography,
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
    TextField,
} from "@mui/material";
import { CalendarIcon } from "@mui/x-date-pickers";
import { AttachMoney, Bolt, Delete } from "@mui/icons-material";
import ContenedorModal from "../Shared/ContenedorModal";
import { TxtFormulario, AvisoFormulario } from "../Shared/ElementosFormulario";
import apiClient from "../../Utils/apliClient";
import { Api_Global_Cuotas } from "../../service/CuotaApi";
import { mostrarAlerta, manejarError } from "../Alerts/Registrar";
import { Cuotas, ColumnServicios } from "../../interface/Cuota";
import { Servicio } from "../../interface/Servicios";

interface Props {
    open: boolean;
    handleClose: () => void;
    cuota: Cuotas | null;
}

const columns: readonly ColumnServicios[] = [
    { id: "nombre", label: "Servicio", minWidth: 50, align: "center" },
    { id: "costo_unitario", label: "Monto", minWidth: 50, align: "center" },
    { id: "accion", label: "", minWidth: 50, align: "center" },
];

const ModalEditarCuota: React.FC<Props> = ({ open, handleClose, cuota }) => {
    const [fechaEmision, setFechaEmision] = useState("");
    const [fechaVencimiento, setFechaVencimiento] = useState("");
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [servicioSeleccionado, setServicioSeleccionado] = useState<string>("");
    const [serviciosAgregados, setServiciosAgregados] = useState<Servicio[]>([]);
    const [importeTotal, setImporteTotal] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchServicios = async () => {
            try {
                const response = await apiClient.get(Api_Global_Cuotas.servicio.listar());
                setServicios(response.data.data);
            } catch (error) {
                console.error("Error fetching servicios", error);
            }
        };
        fetchServicios();
    }, []);

    useEffect(() => {
        if (cuota && open) {
            const formatToInputDate = (dateStr: string) => {
                if (!dateStr) return "";
                const parts = dateStr.split("/");
                if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
                return dateStr;
            };

            setFechaEmision(formatToInputDate(cuota.fecha_emision));
            setFechaVencimiento(formatToInputDate(cuota.fecha_vencimiento));
            setServiciosAgregados(cuota.servicios || []);
        }
    }, [cuota, open]);

    useEffect(() => {
        const total = serviciosAgregados.reduce((sum, servicio) => {
            const cost = parseFloat(servicio.costo_unitario);
            return sum + (isNaN(cost) ? 0 : cost);
        }, 0);
        setImporteTotal(total);
    }, [serviciosAgregados]);

    const handleServicioChange = (event: SelectChangeEvent<string>) => {
        const servicioId = event.target.value;
        setServicioSeleccionado(servicioId);
        const servicio = servicios.find((s) => String(s.id_servicio) === String(servicioId));
        if (servicio) {
            if (!serviciosAgregados.some((s) => s.id_servicio === servicio.id_servicio)) {
                setServiciosAgregados([...serviciosAgregados, servicio]);
            }
        }
    };

    const handleServicioDelete = (id: string) => {
        setServiciosAgregados(serviciosAgregados.filter((s) => s.id_servicio !== id));
    };

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
        setFechaVencimiento(fecha.toISOString().split('T')[0]);
    };

    const handleUpdate = async () => {
        if (!cuota) return;
        setLoading(true);
        try {
            const serviciosIds = serviciosAgregados.map(s => s.id_servicio);
            await apiClient.put(Api_Global_Cuotas.cuotas.actualizar(cuota.id_cuota), {
                fecha_emision: fechaEmision,
                fecha_vencimiento: fechaVencimiento,
                servicios: serviciosIds,
            });
            mostrarAlerta("Éxito", "La cuota ha sido actualizada correctamente", "success");
            handleClose();
        } catch (error) {
            manejarError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ContenedorModal
            ancho="650px"
            alto="auto"
            abrir={open}
            cerrar={handleClose}
            loading={loading}
            titulo="Editar Cuota"
            botones={
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, width: "100%", mt: 2 }}>
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
            <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
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
                <Grid item xs={12}>
                    <FormControl fullWidth required>
                        <InputLabel id="edit-servicio-label">Seleccionar Servicio</InputLabel>
                        <Select
                            labelId="edit-servicio-label"
                            label="Seleccionar servicio"
                            value={servicioSeleccionado}
                            onChange={handleServicioChange}
                            startAdornment={<Bolt sx={{ mr: 1, color: "gray" }} />}
                            MenuProps={{ PaperProps: { style: { maxHeight: 200 } } }}
                        >
                            {servicios.map((servicio) => (
                                <MenuItem key={servicio.id_servicio} value={String(servicio.id_servicio)}>
                                    {`${servicio.nombre} - S/ ${servicio.costo_unitario}`}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12}>
                    <Paper sx={{ width: "100%", overflow: "hidden", boxShadow: "none" }}>
                        <TableContainer sx={{ maxHeight: 220, borderRadius: "10px", border: "1px solid #202123" }}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow>
                                        {columns.map((column) => (
                                            <TableCell
                                                key={column.id}
                                                align={column.align}
                                                style={{ minWidth: column.minWidth }}
                                                sx={{ backgroundColor: "#202123", color: "white" }}
                                            >
                                                {column.label}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {serviciosAgregados.map((servicio) => (
                                        <TableRow hover key={servicio.id_servicio}>
                                            <TableCell align="center">{servicio.nombre}</TableCell>
                                            <TableCell align="center">{servicio.costo_unitario}</TableCell>
                                            <TableCell align="center">
                                                <IconButton
                                                    sx={{ color: "#840202" }}
                                                    onClick={() => handleServicioDelete(servicio.id_servicio)}
                                                >
                                                    <Delete />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>
                </Grid>
                <Grid item xs={12} sm={6} sx={{ m: "0 auto" }}>
                    <TextField
                        fullWidth
                        label="Importe Total (S/)"
                        value={importeTotal.toFixed(2)}
                        InputProps={{
                            readOnly: true,
                            startAdornment: <AttachMoney sx={{ mr: 1, color: "gray" }} />,
                        }}
                    />
                </Grid>
            </Grid>
        </ContenedorModal>
    );
};

export default ModalEditarCuota;
