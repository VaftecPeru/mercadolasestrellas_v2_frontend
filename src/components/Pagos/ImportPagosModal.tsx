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
    { key: 'telefono', label: 'Teléfono', width: 120 },
    { key: 'correo', label: 'Correo', width: 180 },
    { key: 'importe', label: 'A Cuenta', width: 110 },
    { key: 'monto_actual', label: 'Monto Actual', width: 120 },
];

const ImportPagosModal: React.FC<ImportPagosModalProps> = ({ open, handleClose, onSuccess }) => {

    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [importResult, setImportResult] = useState<{ imported_count: number; errors: string[] } | null>(null);
    const [socios, setSocios] = useState<Array<{ id_socio: number; nombre_completo: string; dni?: string }>>([]);
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
                    console.log('Socios fetched from /socios/seleccionar:', response.data.data);
                    setSocios(response.data.data || []);
                })
                .catch(error => {
                    console.error('Error fetching socios:', error);
                    mostrarAlerta("Error", "No se pudieron cargar los socios para la selección manual.", "error");
                });

            // Fetch last pago to determine next ID
            apiClient.get('/pagos?per_page=1')
                .then(response => {
                    console.log('Last pago fetched from /pagos:', response.data.data);
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
                .catch(error => {
                    console.error('Error fetching last pago:', error);
                    setNextPagoId(1);
                });
        }
    }, [open]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            // const uploadedFile = e.target.files[0];
            setImportResult(null);

            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Get raw data as array of arrays
                const rawGrid = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                // 1. Detect "Statement Mode"
                let statementMode = false;
                let detectedPuesto = "";
                let headerRowIndex = -1;

                for (let r = 0; r < Math.min(10, rawGrid.length); r++) {
                    const row = rawGrid[r];
                    for (let c = 0; c < row.length; c++) {
                        const cellVal = String(row[c] || "").toUpperCase();
                        if (cellVal.includes("PUESTO:")) {
                            statementMode = true;
                            if (cellVal.replace("PUESTO:", "").trim().length > 0) {
                                detectedPuesto = cellVal.replace("PUESTO:", "").trim();
                            } else if (c + 1 < row.length) {
                                detectedPuesto = String(row[c + 1] || "").trim();
                            }
                        }
                    }
                    if (statementMode && headerRowIndex === -1) {
                        const joinedRow = Array.from(row || []).map(x => String(x || "").toUpperCase()).join(" ");
                        if (joinedRow.includes("CUOTAS EXTRAORDINARIAS") || joinedRow.includes("IMPORTE")) {
                            headerRowIndex = r;
                        }
                    }
                }

                let processedData: any[] = [];

                if (statementMode && headerRowIndex !== -1 && detectedPuesto) {
                    // *** PARSE STATEMENT FORMAT ***
                    const headersRow = Array.from(rawGrid[headerRowIndex] || []).map(h => String(h || "").trim());
                    const idxConcepto = headersRow.findIndex(h => {
                        const val = (h || "").toUpperCase();
                        return val.includes("CUOTA") || val.includes("CONCEPTO") || val.includes("DESCRIPCIÓN") || val.includes("DESCRIPCION");
                    });
                    const idxImporte = headersRow.findIndex(h => {
                        const val = (h || "").toUpperCase();
                        return val.includes("IMPORTE") || val.includes("CUENTA") || val.includes("MONTO") || val.includes("SALDO") || val.includes("TOTAL") || val.includes("PAGADO") || val === "S/";
                    });

                    // Sum all importes for this puesto
                    let totalImporte = 0;
                    for (let r = headerRowIndex + 1; r < rawGrid.length; r++) {
                        const row = rawGrid[r];
                        if (!row || row.length === 0) continue;
                        const concepto = idxConcepto !== -1 ? String(row[idxConcepto] || "").trim() : "";
                        const importeRaw = idxImporte !== -1 ? row[idxImporte] : 0;
                        const numericImporte = parseFloat(String(importeRaw).replace(/,/g, ''));

                        if (concepto && !isNaN(numericImporte)) {
                            totalImporte += numericImporte;
                        }
                    }

                    // Create ONE row with the total
                    if (totalImporte > 0 || detectedPuesto) {
                        processedData.push({
                            id: `0000-${nextPagoId}`,
                            puesto: detectedPuesto,
                            socio_nombre: '',
                            dni: '',
                            fecha_operacion: new Date().toISOString().split('T')[0],
                            telefono: '',
                            correo: '',
                            importe: totalImporte,
                            monto_actual: ''
                        });
                    }
                } else {
                    // *** FALLBACK TO STANDARD LOGIC (Auto-Map) ***
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                    if (data.length > 1) { // At least header + 1 row
                        const excelHeaders = (data[0] as string[]).map(h => String(h).trim());
                        const rows = XLSX.utils.sheet_to_json(ws);

                        // Auto-mapping logic
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

                            // Amount-related columns
                            if (lowerH.includes('cuenta') || lowerH.includes('pago') || lowerH.includes('importe') || lowerH.includes('total') || lowerH.includes('recibido') || lowerH.includes('pagado')) tempMapping['importe'] = h;
                            if (lowerH.includes('monto') || lowerH.includes('actual') || lowerH.includes('saldo')) tempMapping['monto_actual'] = h;

                            // Special logic for "ordenes extraordinarias" and other fees
                            if (lowerH.includes('extraordinaria') || lowerH.includes('extra') || lowerH.includes('multa') || lowerH.includes('penal') || lowerH.includes('orden') || lowerH.includes('ext') || lowerH.includes('cargo') || lowerH.includes('deuda') || lowerH.includes('cuota')) {
                                amountCols.push(h);
                            }
                        });

                        // If we didn't find a primary 'importe' but we have extra files, use the first extra
                        if (!tempMapping['importe'] && amountCols.length > 0) {
                            tempMapping['importe'] = amountCols[0];
                        }

                        // Transform immediately with auto-generated IDs
                        processedData = rows.map((row: any, index: number) => {
                            const newRow: any = {};
                            SYSTEM_FIELDS.forEach(field => {
                                const excelCol = tempMapping[field.key];
                                if (field.key === 'id') {
                                    newRow[field.key] = `0000-${nextPagoId + index}`;
                                } else if (field.key === 'importe') {
                                    // SUM Logic: Main importe + all extra columns
                                    const mainCol = tempMapping['importe'];
                                    let total = 0;

                                    const parseAmt = (val: any) => {
                                        if (!val) return 0;
                                        let str = String(val).trim();
                                        // Handle (123.00) as negative or just clean it
                                        if (str.startsWith('(') && str.endsWith(')')) str = str.slice(1, -1);
                                        // Robust parsing: remove non-numeric chars except . and ,
                                        const cleanStr = str.replace(/[^\d.,]/g, '').replace(/,/g, '');
                                        return parseFloat(cleanStr) || 0;
                                    };

                                    if (mainCol && row[mainCol]) total += parseAmt(row[mainCol]);

                                    amountCols.forEach(col => {
                                        if (col !== mainCol && row[col]) total += parseAmt(row[col]);
                                    });

                                    newRow[field.key] = total > 0 ? total.toFixed(2) : "";
                                } else if (field.key === 'monto_actual') {
                                    // Special case for monto_actual to avoid showing 0 if not present
                                    newRow[field.key] = excelCol ? row[excelCol] : "";
                                } else {
                                    newRow[field.key] = excelCol ? row[excelCol] : "";
                                }
                            });

                            // Ensure we capture identifiers for the initial match
                            const socioMatch = socios.find(s =>
                                (newRow.dni && s.dni === String(newRow.dni)) ||
                                (newRow.socio_nombre && s.nombre_completo === newRow.socio_nombre) ||
                                (newRow.id_socio && s.id_socio === newRow.id_socio)
                            );
                            if (socioMatch) {
                                newRow.id_socio = socioMatch.id_socio;
                                if (!newRow.dni) newRow.dni = socioMatch.dni;
                            }

                            return newRow;
                        });
                    }
                }

                if (processedData.length > 0) {
                    // Normalize text for robust matching (remove accents and case)
                    const normalizeStr = (t: string) => (t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();

                    // Improve matching using normalized names
                    processedData = processedData.map(row => {
                        if (row.socio_nombre && !row.id_socio) {
                            const searchName = normalizeStr(row.socio_nombre);
                            const match = socios.find(s => normalizeStr(s.nombre_completo) === searchName);
                            if (match) {
                                return {
                                    ...row,
                                    socio_nombre: match.nombre_completo,
                                    dni: match.dni || row.dni
                                };
                            }
                        }
                        return row;
                    });

                    setPreviewData(processedData);
                    setActiveStep(1); // Jump to Verify/Edit
                } else {
                    mostrarAlerta("Error", "No se pudieron detectar datos válidos en el Excel.", "error");
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

    const handleImport = async () => {
        setLoading(true);
        // Ensure all identification fields are sent
        const finalData = previewData.map(row => {
            const socioMatch = socios.find(s =>
                (row.id_socio && s.id_socio === row.id_socio) ||
                (row.dni && s.dni === String(row.dni)) ||
                (s.nombre_completo === row.socio_nombre)
            );
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

    const handleDeleteRow = (index: number) => {
        const newData = [...previewData];
        newData.splice(index, 1);
        setPreviewData(newData);
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
                            const socioMatch = socios.find(s =>
                                (row.id_socio && s.id_socio === row.id_socio) ||
                                (row.dni && s.dni === String(row.dni)) ||
                                (s.nombre_completo === row.socio_nombre)
                            );
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
