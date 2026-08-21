import React, { useState, useEffect } from 'react';
import {
    Modal,
    Box,
    Typography,
    Button,
    IconButton,
    LinearProgress,
    Alert,
    Stepper,
    Step,
    StepLabel,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Paper,
    Autocomplete
} from '@mui/material';
import { Close, CloudUpload, Storage } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import apiClient from '../../Utils/apliClient';
import { Api_Global_Pagos } from '../../service/PagoApi';
import { mostrarAlerta, manejarError } from '../Alerts/Registrar';

interface ImportPagosModalProps {
    open: boolean;
    handleClose: () => void;
    onSuccess: () => void;
}

const SYSTEM_FIELDS = [
    { key: 'id', label: '#ID', width: 60 },
    { key: 'puesto', label: 'N° Puesto', width: 100 },
    { key: 'socio_nombre', label: 'Socio', width: 300 },
    { key: 'dni', label: 'DNI', width: 110 },
    { key: 'fecha_operacion', label: 'Fecha', width: 110 },
    { key: 'concepto', label: 'Concepto / Servicio', width: 250 },
    { key: 'telefono', label: 'Teléfono', width: 120 },
    { key: 'correo', label: 'Correo', width: 180 },
    { key: 'importe', label: 'A Cuenta', width: 110 },
    { key: 'monto_actual', label: 'Monto Actual', width: 120 },
];

const ImportPagosModal: React.FC<ImportPagosModalProps> = ({ open, handleClose, onSuccess }) => {

    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [importResult, setImportResult] = useState<{ imported_count: number; errors: string[] } | null>(null);
    const [socios, setSocios] = useState<Array<{ id_socio: number; nombre_completo: string; dni?: string; telefono?: string; correo?: string }>>([]);
    const [nextPagoId, setNextPagoId] = useState<number>(1);

    const steps = ['Cargar Excel', 'Verificar y Editar', 'Finalizar'];

    const resetModal = () => {
        setActiveStep(0);
        setPreviewData([]);
        setImportResult(null);
    };

    const handleModalClose = () => {
        resetModal();
        handleClose();
    };

    // Fetch socios and last pago ID when modal opens
    useEffect(() => {
        if (open) {
            resetModal(); // Start fresh when opening
            // Fetch socios list
            apiClient.get('/socios/seleccionar')
                .then(response => {
                    setSocios(response.data.data || []);
                })
                .catch(() => {
                    mostrarAlerta("Error", "No se pudieron cargar los socios para la selección manual.", "error");
                });

            // Fetch last pago to determine next ID
            apiClient.get('/pagos?per_page=1')
                .then(response => {
                    const pagos = response.data.data || [];
                    if (pagos.length > 0) {
                        // Extract number from ID format like "0000-45"
                        const lastId = pagos[0].id_pago || pagos[0].id || "0000-0";
                        const lastNumber = parseInt(String(lastId).split('-').pop() || '0');
                        setNextPagoId(lastNumber + 1);
                    } else {
                        setNextPagoId(1);
                    }
                })
                .catch(() => {
                    setNextPagoId(1);
                });
        }
    }, [open]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImportResult(null);
            const reader = new FileReader();
            reader.onload = (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    
                    let processedData: any[] = [];
                    let localNextId = nextPagoId;

                    let globalPuesto = "";
                    let globalSocio = "";

                    // Pre-build socio lookup map for O(1) access (avoid socios.find per row)
                    const normalizeStr = (t: string) => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
                    const socioByName = new Map<string, any>();
                    socios.forEach(s => socioByName.set(normalizeStr(s.nombre_completo), s));

                    wb.SheetNames.forEach((wsname) => {
                        const ws = wb.Sheets[wsname];
                        const rawGrid = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                        if (rawGrid.length === 0) return;

                        let detectedPuesto = "";
                        let detectedSocio = "";
                        let headerRowIndex = -1;

                        // Scan first 15 rows for puesto/socio metadata and header row
                        for (let r = 0; r < Math.min(15, rawGrid.length); r++) {
                            const row = rawGrid[r] || [];

                            // Detect header row by FIRST occurrence only
                            if (headerRowIndex === -1) {
                                const joinedRow = row.map(x => String(x || "").toUpperCase()).join(" ");
                                if (joinedRow.includes("TODOS LOS SERVICIOS")) {
                                    headerRowIndex = r;
                                }
                            }

                            for (let c = 0; c < row.length; c++) {
                                const cellVal = String(row[c] || "").toUpperCase().trim();
                                if (cellVal.startsWith("PUESTO:")) {
                                    // Extract puesto code after "PUESTO:" 
                                    const raw = String(row[c] || "").replace(/PUESTO:\s*/i, "").replace(/[^a-zA-Z0-9\-]/g, "").trim();
                                    if (raw) detectedPuesto = raw;
                                }
                                // Only match cells that START with "SOCIO:" (avoids "ESTADO DE SOCIO:")
                                if (cellVal.startsWith("SOCIO:")) {
                                    const originalCell = String(row[c] || "");
                                    const val = originalCell.replace(/SOCIO:\s*/i, "").trim();
                                    if (val) {
                                        detectedSocio = val;
                                    }
                                }
                            }
                        }

                        if (detectedPuesto) globalPuesto = detectedPuesto;
                        if (detectedSocio) globalSocio = detectedSocio;

                        const activePuesto = detectedPuesto || globalPuesto;
                        const activeSocio = detectedSocio || globalSocio;

                        // Resolve socio once per sheet — exact normalized name match only
                        let socioMatchObj: any = null;
                        if (activeSocio) {
                            socioMatchObj = socioByName.get(normalizeStr(activeSocio)) || null;
                        }

                        if (headerRowIndex !== -1) {
                            const headersRow = Array.from(rawGrid[headerRowIndex] || []).map(h => String(h || "").trim().toUpperCase());

                            // Find column indices
                            const idxAnioCol = headersRow.findIndex(h => h === "AÑO" || h === "ANIO");
                            const idxConcepto = headersRow.findIndex(h => h.includes("TODOS LOS SERVICIOS") || h.includes("CUOTA") || h.includes("CONCEPTO") || h.includes("SERVICIO"));
                            const idxImporteTotal = headersRow.findIndex(h => h.includes("IMPORTE TOTAL A PAGAR") || h.includes("TOTAL A PAGAR MERCADO"));
                            const idxImportePagado = headersRow.findIndex(h => h.includes("REALIZO PAGO") || h.includes("INGRESO EN SOLES") || h.includes("INGRESO X AÑO"));
                            const idxFecha = headersRow.findIndex(h => h.includes("FECHA DE PAGO") || (h.includes("FECHA") && !h.includes("RECEPCIÓN") && !h.includes("RECEPCION")));
                            const idxNumRecibo = headersRow.findIndex(h => h.includes("NÚMERO DE RECIBO") || h.includes("NUMERO DE RECIBO") || h.includes("RECIBO DE BANCO"));
                            const idxOperacion = headersRow.findIndex(h => {
                                const normalized = h.replace(/\s+/g, ' ');
                                return normalized.includes("N° OPERACIÓN") || normalized.includes("N° OPERACION") || normalized.includes("OPERACIÓN MERCADO") || normalized.includes("OPERACION MERCADO") || normalized.includes("N.° OPERACION") || normalized.includes("NRO OPERACION");
                            });
                            const idxReporte = headersRow.findIndex(h => h === "REPORTE" || h.startsWith("REPORTE"));
                            const idxDeuda = headersRow.findIndex(h => h.includes("DEUDA POR PAGAR") || (h.includes("DEUDA") && !h.includes("TOTAL")));

                            const parseAmt = (val: any): number => {
                                if (val === null || val === undefined || val === "" || val === "-") return 0;
                                const str = String(val).trim().replace(/,/g, '').replace(/[^\d.]/g, '');
                                return parseFloat(str) || 0;
                            };

                            for (let r = headerRowIndex + 1; r < rawGrid.length; r++) {
                                const row = rawGrid[r];
                                if (!row || row.length === 0) continue;

                                const concepto = idxConcepto !== -1 ? String(row[idxConcepto] || "").trim() : "";
                                if (!concepto) continue;
                                const conceptoUpper = concepto.toUpperCase();
                                if (conceptoUpper.includes("TODOS LOS SERVICIOS") || conceptoUpper === "TOTAL") continue;

                                const numOperacion = idxOperacion !== -1 ? String(row[idxOperacion] || "").trim() : "";
                                const reporte = idxReporte !== -1 ? String(row[idxReporte] || "").trim().toUpperCase() : "";

                                const hasOpNum = numOperacion && numOperacion !== "-";
                                const isDebe = reporte.includes("DEBE");
                                const isCancelado = reporte.includes("CANCELADO") || hasOpNum;

                                // Only import rows with a payment record or a pending debt
                                if (!hasOpNum && !isDebe && !isCancelado) continue;

                                // Determine year
                                let rowYear = idxAnioCol !== -1 && row[idxAnioCol] ? String(row[idxAnioCol]).trim() : "";
                                if (!rowYear && /^\d{4}$/.test(wsname.trim())) rowYear = wsname.trim();

                                // importe = lo que PAGÓ (REALIZO PAGO INGRESO EN SOLES), puede ser 0
                                const importe = idxImportePagado !== -1 ? parseAmt(row[idxImportePagado]) : 0;

                                // monto_actual = lo que AÚN DEBE (DEUDA POR PAGAR POR AÑO)
                                const deuda = idxDeuda !== -1 ? parseAmt(row[idxDeuda]) : 0;

                                // Parse fecha
                                let fechaOperacion = new Date().toISOString().split('T')[0];
                                if (idxFecha !== -1 && row[idxFecha] && row[idxFecha] !== '-') {
                                    const fVal = row[idxFecha];
                                    if (typeof fVal === 'number') {
                                        fechaOperacion = new Date((fVal - 25569) * 86400 * 1000).toISOString().split('T')[0];
                                    } else {
                                        const parts = String(fVal).split('/');
                                        if (parts.length === 3) {
                                            fechaOperacion = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                                        } else {
                                            try { fechaOperacion = new Date(String(fVal)).toISOString().split('T')[0]; } catch (e) {}
                                        }
                                    }
                                }

                                const conceptoFinal = (rowYear && !concepto.includes(rowYear)) ? `${concepto} - ${rowYear}` : concepto;
                                const numRecibo = idxNumRecibo !== -1 ? String(row[idxNumRecibo] || "").trim() : "";
                                const opNumber = hasOpNum ? numOperacion : (numRecibo || (isDebe ? 'PENDIENTE' : 'IMPORTADO'));

                                // Nombre del socio: usar el nombre detectado en el Excel (para que se muestre)
                                // Buscar match en sistema para precargar datos adicionales
                                const nombreSocioExcel = activeSocio || '';
                                const socioNombreFinal = socioMatchObj ? socioMatchObj.nombre_completo : nombreSocioExcel;

                                processedData.push({
                                    id: `0000-${localNextId++}`,
                                    puesto: activePuesto,
                                    socio_nombre: socioNombreFinal,
                                    id_socio: socioMatchObj ? socioMatchObj.id_socio : null,
                                    dni: socioMatchObj ? (socioMatchObj.dni || '') : '',
                                    fecha_operacion: fechaOperacion,
                                    concepto: conceptoFinal,
                                    numero_operacion: opNumber,
                                    telefono: socioMatchObj?.telefono || '',
                                    correo: socioMatchObj?.correo || '',
                                    importe: importe.toFixed(2),         // lo que pagó (puede ser 0)
                                    monto_actual: deuda > 0 ? deuda.toFixed(2) : '' // lo que debe
                                });
                            }
                        } else {
                            // *** FALLBACK TO STANDARD LOGIC (Auto-Map) ***
                            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                            if (data.length > 1) {
                                const excelHeaders = (data[0] as string[]).map(h => String(h).trim());
                                const rows = XLSX.utils.sheet_to_json(ws);

                                const tempMapping: { [key: string]: string } = {};
                                const amountCols: string[] = [];

                                excelHeaders.forEach(h => {
                                    const lowerH = h.toLowerCase();
                                    if (lowerH.includes('id') || lowerH.includes('#')) tempMapping['id'] = h;
                                    if (lowerH.includes('puesto') || lowerH.includes('n°')) tempMapping['puesto'] = h;
                                    if (lowerH.includes('socio') || lowerH.includes('nombre')) tempMapping['socio_nombre'] = h;
                                    if (lowerH.includes('dni') || lowerH.includes('ruc')) tempMapping['dni'] = h;
                                    if (lowerH.includes('fecha')) tempMapping['fecha_operacion'] = h;
                                    if (lowerH.includes('telefono') || lowerH.includes('teléfono') || lowerH.includes('celular')) tempMapping['telefono'] = h;
                                    if (lowerH.includes('correo') || lowerH.includes('email') || lowerH.includes('mail')) tempMapping['correo'] = h;
                                    if (lowerH.includes('cuenta') || lowerH.includes('pago') || lowerH.includes('importe') || lowerH.includes('total') || lowerH.includes('recibido') || lowerH.includes('pagado')) tempMapping['importe'] = h;
                                    if (lowerH.includes('monto') || lowerH.includes('actual') || lowerH.includes('saldo')) tempMapping['monto_actual'] = h;
                                    if (lowerH.includes('extraordinaria') || lowerH.includes('extra') || lowerH.includes('multa') || lowerH.includes('penal') || lowerH.includes('orden') || lowerH.includes('ext') || lowerH.includes('cargo') || lowerH.includes('deuda') || lowerH.includes('cuota')) {
                                        amountCols.push(h);
                                    }
                                });

                                if (!tempMapping['importe'] && amountCols.length > 0) {
                                    tempMapping['importe'] = amountCols[0];
                                }

                                const sheetProcessed = rows.map((row: any) => {
                                    const newRow: any = {};
                                    SYSTEM_FIELDS.forEach(field => {
                                        const excelCol = tempMapping[field.key];
                                        if (field.key === 'id') {
                                            newRow[field.key] = `0000-${localNextId++}`;
                                        } else if (field.key === 'importe') {
                                            const mainCol = tempMapping['importe'];
                                            let total = 0;
                                            const parseAmt = (val: any) => {
                                                if (!val) return 0;
                                                let str = String(val).trim();
                                                if (str.startsWith('(') && str.endsWith(')')) str = str.slice(1, -1);
                                                return parseFloat(str.replace(/[^\d.,]/g, '').replace(/,/g, '')) || 0;
                                            };
                                            if (mainCol && row[mainCol]) total += parseAmt(row[mainCol]);
                                            amountCols.forEach(col => { if (col !== mainCol && row[col]) total += parseAmt(row[col]); });
                                            newRow[field.key] = total > 0 ? total.toFixed(2) : "";
                                        } else {
                                            newRow[field.key] = excelCol ? row[excelCol] : "";
                                        }
                                    });

                                    const socioMatch = socios.find(s =>
                                        (newRow.dni && s.dni === String(newRow.dni)) ||
                                        (newRow.socio_nombre && s.nombre_completo === newRow.socio_nombre)
                                    );
                                    if (socioMatch) {
                                        newRow.id_socio = socioMatch.id_socio;
                                        if (!newRow.dni) newRow.dni = socioMatch.dni;
                                        newRow.telefono = socioMatch.telefono || newRow.telefono || "";
                                        newRow.correo = socioMatch.correo || newRow.correo || "";
                                    }
                                    return newRow;
                                });

                                processedData = [...processedData, ...sheetProcessed];
                            }
                        }
                    });

                    if (processedData.length > 0) {
                        // Enrich with socio data (normalize only once per row)
                        processedData = processedData.map(row => {
                            if (row.socio_nombre) {
                                const match = row.id_socio
                                    ? socios.find(s => s.id_socio === row.id_socio)
                                    : socioByName.get(normalizeStr(row.socio_nombre));
                                if (match) {
                                    return {
                                        ...row,
                                        socio_nombre: match.nombre_completo,
                                        dni: match.dni || row.dni,
                                        telefono: match.telefono || row.telefono || '',
                                        correo: match.correo || row.correo || ''
                                    };
                                }
                            }
                            return row;
                        });

                        setPreviewData(processedData);
                        setActiveStep(1);
                    } else {
                        mostrarAlerta("Error", "No se encontraron registros con pago o deuda en el Excel. Solo se importan filas con N° Operación o estado 'Debe'.", "error");
                    }
                } catch (err: any) {
                    mostrarAlerta("Error", "Ocurrió un error al leer el archivo Excel: " + (err?.message || ""), "error");
                }
            };
            reader.readAsBinaryString(e.target.files[0]);
        }
    };

    const [previewData, setPreviewData] = useState<any[]>([]);

    const handleCellEdit = (rowIndex: number, key: string, value: string) => {
        const newData = [...previewData];
        newData[rowIndex] = { ...newData[rowIndex], [key]: value };
        setPreviewData(newData);
    };

    const findSocioMatch = (row: any) =>
        socios.find(s =>
            (row.id_socio && s.id_socio === row.id_socio) ||
            (row.dni && s.dni === String(row.dni)) ||
            (s.nombre_completo === row.socio_nombre)
        );

    const handleImport = async () => {
        setLoading(true);
        // Ensure all identification fields are sent
        const finalData = previewData.map(row => {
            const socioMatch = findSocioMatch(row);
            return {
                ...row,
                id_socio: socioMatch?.id_socio || row.id_socio || null,
                dni: socioMatch?.dni || row.dni || null,
                id_puesto: row.id_puesto || null
            };
        });

        const ws = XLSX.utils.json_to_sheet(finalData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pagos");
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const finalFile = new File([blob], "importacion_mapeada.xlsx", { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const formData = new FormData();
        formData.append('file', finalFile);

        try {
            const response = await apiClient.post(Api_Global_Pagos.pagos.importar(), formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setImportResult(response.data);
            if (response.data.imported_count > 0) {
                mostrarAlerta("Éxito", `Se importaron ${response.data.imported_count} pagos correctamente.`, "success");
                onSuccess();
                setActiveStep(2); // Jump to Final 
            } else if (response.data.errors.length > 0) {
                mostrarAlerta("Advertencia", "No se importaron pagos. Revisa los errores.", "warning");
                setActiveStep(2);
            }
        } catch (error) {
            manejarError(error);
        } finally {
            setLoading(false);
        }
    };

    const renderPreviewStep = () => (
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Vista previa - Puedes editar los valores antes de importar:
            </Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 500, mb: 2 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold', width: 50 }}>
                                #
                            </TableCell>
                            {SYSTEM_FIELDS.map(f => (
                                <TableCell
                                    key={f.key}
                                    sx={{
                                        backgroundColor: '#f5f5f5',
                                        fontWeight: 'bold',
                                        width: f.width,
                                        minWidth: f.width
                                    }}
                                >
                                    {f.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {previewData.map((row, i) => {
                            const socioMatch = findSocioMatch(row);
                            const hasSocioError = row.socio_nombre && !socioMatch;

                            return (
                                <TableRow key={i} hover>
                                    <TableCell>{i + 1}</TableCell>
                                    {SYSTEM_FIELDS.map(f => (
                                        <TableCell key={f.key} sx={{ p: 1, width: f.width, minWidth: f.width }}>
                                            {f.key === 'socio_nombre' ? (
                                                <Autocomplete
                                                    options={socios}
                                                    getOptionLabel={(option) =>
                                                        typeof option === 'string' ? option : `${option?.nombre_completo || ''}`.trim()
                                                    }
                                                    isOptionEqualToValue={(option, value) => option?.id_socio === value?.id_socio}
                                                    disablePortal
                                                    value={socioMatch || null}
                                                    onChange={(_, newValue) => {
                                                        const socio = typeof newValue === 'string' ? null : newValue;
                                                        const newData = [...previewData];
                                                        newData[i] = {
                                                            ...newData[i],
                                                            socio_nombre: socio?.nombre_completo || (typeof newValue === 'string' ? newValue : ""),
                                                            dni: socio?.dni || newData[i].dni || "",
                                                            telefono: socio?.telefono || "",
                                                            correo: socio?.correo || "",
                                                            id_socio: socio?.id_socio || null
                                                        };
                                                        setPreviewData(newData);
                                                    }}
                                                    renderInput={(params) => (
                                                        <TextField
                                                            {...params}
                                                            variant="standard"
                                                            size="small"
                                                            placeholder="Seleccionar..."
                                                            InputProps={{
                                                                ...params.InputProps,
                                                                disableUnderline: true
                                                            }}
                                                            sx={{
                                                                bgcolor: hasSocioError ? '#fff5f5' : (i % 2 === 0 ? '#fff' : '#fafafa'),
                                                                border: hasSocioError ? '1px solid #ffcdd2' : '1px solid #e0e0e0',
                                                                borderRadius: 1,
                                                                px: 1,
                                                                '& .MuiInputBase-input': {
                                                                    fontSize: '0.875rem',
                                                                    color: hasSocioError ? '#c62828' : 'inherit'
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                    size="small"
                                                    fullWidth
                                                />
                                            ) : (
                                                <TextField
                                                    variant="standard"
                                                    fullWidth
                                                    size="small"
                                                    InputProps={{ disableUnderline: true }}
                                                    sx={{
                                                        bgcolor: (f.key === 'importe' && (!row[f.key] || parseFloat(String(row[f.key]).replace(/,/g, '')) < 0.01))
                                                            ? '#fff5f5'
                                                            : (i % 2 === 0 ? '#fff' : '#fafafa'),
                                                        border: (f.key === 'importe' && (!row[f.key] || parseFloat(String(row[f.key]).replace(/,/g, '')) < 0.01))
                                                            ? '1px solid #ffcdd2'
                                                            : '1px solid #e0e0e0',
                                                        borderRadius: 1,
                                                        px: 1,
                                                        '& .MuiInputBase-input': {
                                                            fontSize: '0.875rem',
                                                            color: (f.key === 'importe' && (!row[f.key] || parseFloat(String(row[f.key]).replace(/,/g, '')) < 0.01))
                                                                ? '#c62828'
                                                                : 'inherit'
                                                        }
                                                    }}
                                                    value={row[f.key] || ""}
                                                    onChange={(e) => handleCellEdit(i, f.key, e.target.value)}
                                                />
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                <Button color="inherit" onClick={() => setActiveStep(0)}>Atrás</Button>
                <Button
                    variant="contained"
                    color="success"
                    startIcon={<Storage />}
                    onClick={handleImport}
                    disabled={loading || previewData.length === 0}
                >
                    {loading ? 'Procesando...' : `Confirmar e Importar (${previewData.length})`}
                </Button>
            </Box>
        </Box>
    );

    const renderUploadStep = () => (
        <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                Sube tu archivo Excel (Estado de Cuenta o Formato Estándar). El sistema detectará automáticamente los datos.
            </Typography>
            <Box sx={{ border: '2px dashed #ccc', p: 5, borderRadius: 2, mb: 3 }}>
                <input
                    accept=".xlsx, .xls, .csv"
                    style={{ display: 'none' }}
                    id="import-file-upload-mapper"
                    type="file"
                    onChange={handleFileChange}
                />
                <label htmlFor="import-file-upload-mapper">
                    <Button variant="contained" color="success" component="span" startIcon={<CloudUpload />}>
                        Cargar Excel
                    </Button>
                </label>
            </Box>
        </Box>
    );

    return (
        <Modal open={open} onClose={handleModalClose}>
            <Box sx={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: { xs: '95%', sm: 1100 }, bgcolor: 'background.paper', boxShadow: 24, p: 4,
                borderRadius: 2, maxHeight: '95vh', overflowY: 'auto'
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                        Importador Inteligente de Pagos
                    </Typography>
                    <IconButton onClick={handleModalClose}><Close /></IconButton>
                </Box>

                <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
                    {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                </Stepper>

                {activeStep === 0 && renderUploadStep()}
                {activeStep === 1 && renderPreviewStep()}

                {activeStep === 2 && importResult && (
                    <Box sx={{ mt: 3 }}>
                        <Alert severity={importResult.errors.length > 0 ? "warning" : "success"}>
                            Importación completada: {importResult.imported_count} registros exitosos.
                        </Alert>
                        {importResult.errors.length > 0 && (
                            <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" color="error">Errores detectados:</Typography>
                                <Paper sx={{ p: 2, bgcolor: '#fff5f5', maxHeight: 200, overflow: 'auto' }}>
                                    {importResult.errors.map((err, i) => (
                                        <Typography key={i} variant="caption" display="block">• {err}</Typography>
                                    ))}
                                </Paper>
                            </Box>
                        )}
                        <Button fullWidth variant="contained" color="success" sx={{ mt: 3 }} onClick={handleModalClose}>Finalizar</Button>
                    </Box>
                )}

                {loading && <LinearProgress sx={{ mt: 2 }} />}
            </Box>
        </Modal>
    );
};

export default ImportPagosModal;
