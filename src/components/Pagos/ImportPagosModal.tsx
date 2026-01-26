import React, { useState, useRef } from 'react';
import {
    Modal,
    Box,
    Typography,
    Button,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    Divider,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Alert,
    Stepper,
    Step,
    StepLabel,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow
} from '@mui/material';
import { Close, CloudUpload, FileDownload, ArrowBack, Storage } from '@mui/icons-material';
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
    { key: 'dni', label: 'DNI / RUC' },
    { key: 'importe', label: 'A Cuenta / Pago (S/.)' },
    { key: 'puesto', label: 'N° Puesto' },
    { key: 'fecha_operacion', label: 'Fecha' },
    { key: 'numero_operacion', label: 'N° Operación / #ID' },
    { key: 'socio_nombre', label: 'Socio (Nombre)' },
    { key: 'id_socio', label: 'ID Socio (Técnico)' },
    { key: 'id_deuda_cuota', label: 'ID Cuota/Deuda (Técnico)' },
];

const ImportPagosModal: React.FC<ImportPagosModalProps> = ({ open, handleClose, onSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<{ [key: string]: string }>({});
    const [rawData, setRawData] = useState<any[]>([]);
    const [activeStep, setActiveStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [importResult, setImportResult] = useState<{ imported_count: number; errors: string[] } | null>(null);

    const steps = ['Subir Archivo', 'Mapear Columnas', 'Vista Previa', 'Importar'];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const uploadedFile = e.target.files[0];
            setFile(uploadedFile);
            setImportResult(null);

            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                if (data.length > 0) {
                    const excelHeaders = (data[0] as string[]).map(h => String(h).trim());
                    setHeaders(excelHeaders);
                    setRawData(XLSX.utils.sheet_to_json(ws));

                    // Auto-mapping logic
                    const newMapping: { [key: string]: string } = {};
                    excelHeaders.forEach(h => {
                        const lowerH = h.toLowerCase();
                        if (lowerH === 'dni') newMapping['dni'] = h;
                        if (lowerH.includes('cuenta') || lowerH.includes('pago') || lowerH.includes('monto')) newMapping['importe'] = h;
                        if (lowerH.includes('puesto') || lowerH === 'n° puesto') newMapping['puesto'] = h;
                        if (lowerH === 'fecha') newMapping['fecha_operacion'] = h;
                        if (lowerH.includes('operacion') || lowerH === '#id' || lowerH === 'id') newMapping['numero_operacion'] = h;
                        if (lowerH === 'socio') newMapping['socio_nombre'] = h;
                        if (lowerH === 'id_socio') newMapping['id_socio'] = h;
                        if (lowerH === 'id_deuda_cuota') newMapping['id_deuda_cuota'] = h;
                    });
                    setMapping(newMapping);
                    setActiveStep(1);
                }
            };
            reader.readAsBinaryString(uploadedFile);
        }
    };

    const handleMappingChange = (systemKey: string, excelHeader: string) => {
        setMapping(prev => ({ ...prev, [systemKey]: excelHeader }));
    };

    const handleImport = async () => {
        setLoading(true);

        // Transform data using mapping
        const transformedData = rawData.map(row => {
            const newRow: any = {};
            Object.entries(mapping).forEach(([sysKey, excelKey]) => {
                if (excelKey) newRow[sysKey] = row[excelKey];
            });
            return newRow;
        });

        // Crear un nuevo Excel con los datos mapeados
        const ws = XLSX.utils.json_to_sheet(transformedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Pagos");
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });

        const finalFile = new File([blob], "importacion_mapeada.xlsx", { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const formData = new FormData();
        formData.append('file', finalFile);

        try {
            const response = await apiClient.post(Api_Global_Pagos.pagos.importar(), formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            setImportResult(response.data);
            if (response.data.imported_count > 0) {
                mostrarAlerta("Éxito", `Se importaron ${response.data.imported_count} pagos correctamente.`, "success");
                onSuccess();
                setActiveStep(3);
            } else if (response.data.errors.length > 0) {
                mostrarAlerta("Advertencia", "No se importaron pagos. Revisa los errores.", "warning");
            }
        } catch (error) {
            manejarError(error);
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const templateData = [
            {
                dni: '12345678',
                puesto: 'E-1',
                importe: 50.00,
                fecha_operacion: '2024-01-20',
                numero_operacion: 'OPER-123',
                id_socio: '',
                id_deuda_cuota: ''
            }
        ];

        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla Importacion");
        XLSX.writeFile(wb, "plantilla_importar_pagos.xlsx");
    };

    const renderMappingStep = () => (
        <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
                Relaciona las columnas de tu Excel con los campos del sistema.
            </Alert>
            <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
                {SYSTEM_FIELDS.map((field) => (
                    <ListItem key={field.key} divider>
                        <ListItemText
                            primary={field.label}
                            secondary={field.key.includes('id') ? '(ID técnico)' : '(Campo requerido para búsqueda)'}
                        />
                        <FormControl sx={{ minWidth: 200, ml: 2 }}>
                            <InputLabel>Columna Excel</InputLabel>
                            <Select
                                value={mapping[field.key] || ''}
                                label="Columna Excel"
                                onChange={(e) => handleMappingChange(field.key, e.target.value)}
                            >
                                <MenuItem value=""><em>-- Ninguna --</em></MenuItem>
                                {headers.map(h => (
                                    <MenuItem key={h} value={h}>{h}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </ListItem>
                ))}
            </List>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setActiveStep(0)}>Atrás</Button>
                <Button
                    variant="contained"
                    onClick={() => setActiveStep(2)}
                    disabled={!mapping['dni'] || !mapping['importe']}
                >
                    Siguiente (Vista Previa)
                </Button>
            </Box>
        </Box>
    );

    const renderPreviewStep = () => (
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Vista previa de los primeros 5 registros:</Typography>
            <TableContainer component={Paper} sx={{ maxHeight: 300, mb: 2 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            {SYSTEM_FIELDS.map(f => (
                                <TableCell key={f.key} sx={{ backgroundColor: '#f5f5f5', fontWeight: 'bold' }}>
                                    {f.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rawData.slice(0, 5).map((row, i) => (
                            <TableRow key={i}>
                                {SYSTEM_FIELDS.map(f => (
                                    <TableCell key={f.key}>
                                        {row[mapping[f.key]] || '-'}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                <Button onClick={() => setActiveStep(1)}>Atrás</Button>
                <Button
                    variant="contained"
                    color="success"
                    startIcon={<Storage />}
                    onClick={handleImport}
                    disabled={loading}
                >
                    {loading ? 'Procesando...' : 'Confirmar e Importar Ahora'}
                </Button>
            </Box>
        </Box>
    );

    const renderUploadStep = () => (
        <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                Sube tu archivo para comenzar el mapeo de columnas. No te preocupes si tus encabezados son distintos.
            </Typography>
            <Button
                variant="outlined"
                startIcon={<FileDownload />}
                onClick={downloadTemplate}
                sx={{ mb: 3 }}
                fullWidth
            >
                Descargar Plantilla Base
            </Button>
            <Box sx={{ border: '2px dashed #ccc', p: 5, borderRadius: 2, mb: 3 }}>
                <input
                    accept=".xlsx, .xls, .csv"
                    style={{ display: 'none' }}
                    id="import-file-upload-mapper"
                    type="file"
                    onChange={handleFileChange}
                />
                <label htmlFor="import-file-upload-mapper">
                    <Button variant="contained" component="span" startIcon={<CloudUpload />}>
                        Cargar Excel para Mapear
                    </Button>
                </label>
            </Box>
        </Box>
    );

    return (
        <Modal open={open} onClose={handleClose}>
            <Box sx={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: { xs: '95%', sm: 800 }, bgcolor: 'background.paper', boxShadow: 24, p: 4,
                borderRadius: 2, maxHeight: '90vh', overflowY: 'auto'
            }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                        Importador Inteligente de Pagos
                    </Typography>
                    <IconButton onClick={handleClose}><Close /></IconButton>
                </Box>

                <Stepper activeStep={activeStep} sx={{ mb: 4 }} alternativeLabel>
                    {steps.map((label) => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                </Stepper>

                {activeStep === 0 && renderUploadStep()}
                {activeStep === 1 && renderMappingStep()}
                {activeStep === 2 && renderPreviewStep()}

                {activeStep === 3 && importResult && (
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
                        <Button fullWidth variant="contained" sx={{ mt: 3 }} onClick={handleClose}>Finalizar</Button>
                    </Box>
                )}

                {loading && <LinearProgress sx={{ mt: 2 }} />}
            </Box>
        </Modal>
    );
};

export default ImportPagosModal;
