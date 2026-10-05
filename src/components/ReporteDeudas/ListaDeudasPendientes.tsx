import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import React, { useState } from 'react';
import useResponsive from '../../hooks/Responsive/useResponsive';
import { Column, DeudaPendiente } from '../../interface/ReporteDeudas/deudas';

const soloFecha = (fecha: string) => (fecha ? String(fecha).split(" ")[0] : "");

interface ListaDeudasPendientesProps {
  deudas: DeudaPendiente[];
  mostrarPuesto?: boolean;
  tituloMovil?: string;
  mensajeVacio?: React.ReactNode;
  mostrarColumnasCompletas?: boolean;
}

const ListaDeudasPendientes: React.FC<ListaDeudasPendientesProps> = ({
  deudas,
  mostrarPuesto = false,
  tituloMovil = "Deudas Pendientes",
  mensajeVacio = "No hay deudas pendientes.",
  mostrarColumnasCompletas = true,
}) => {
  const { isTablet, isMobile } = useResponsive();
  const [mostrarDetalles, setMostrarDetalles] = useState<string | null>(null);

  const columns: Column[] = [];
  columns.push({ id: "fecha", label: "Fecha Pago", minWidth: 90, align: "center" });
  if (mostrarPuesto) {
    columns.push({ id: "numero_puesto", label: "Puesto", minWidth: 70, align: "center" });
  }
  columns.push({ id: "nombre_servicio", label: "Servicios", minWidth: 200, align: "left" });
  if (mostrarColumnasCompletas) {
    columns.push({ id: "total", label: "Total (S/)", minWidth: 100, align: "right" });
    columns.push({ id: "a_cuenta", label: "Imp. Pagado (S/)", minWidth: 110, align: "right" });
  }
  columns.push({ id: "por_pagar", label: "Imp. Por pagar (S/)", minWidth: 120, align: "right" });

  const totalGeneral = deudas.reduce((acc, row) => ({
    total: acc.total + parseFloat(row.total || "0"),
    a_cuenta: acc.a_cuenta + parseFloat(row.a_cuenta || "0"),
    por_pagar: acc.por_pagar + parseFloat(row.por_pagar || "0"),
  }), { total: 0, a_cuenta: 0, por_pagar: 0 });

  return (
    <Paper sx={{ width: "100%", overflow: "hidden", boxShadow: "none" }}>
      <TableContainer sx={{ maxHeight: "100%", borderRadius: "5px", border: "none" }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {(isTablet || isMobile) && tituloMovil
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
                    {tituloMovil}
                  </Typography>
                </TableCell>
                : columns.map((column) => (
                  <TableCell
                    key={column.id}
                    align={column.align}
                    style={{ minWidth: column.minWidth }}
                    sx={{
                      fontWeight: "bold",
                      backgroundColor: "#f5f5f5",
                    }}
                  >
                    {column.label}
                  </TableCell>
                ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {deudas.length > 0
              ? deudas
                .map((deuda) => (
                  <TableRow key={`${deuda.id_deuda}-${deuda.id_deuda_cuota}`} hover role="checkbox" tabIndex={-1}>
                    {isTablet || isMobile
                      ? <TableCell padding="checkbox" colSpan={columns.length}>
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                          <Typography
                            sx={{
                              p: 2,
                              bgcolor: mostrarDetalles === String(deuda.id_deuda_cuota) ? "#f0f0f0" : "inherit",
                              "&:hover": {
                                cursor: "pointer",
                                bgcolor: "#f0f0f0",
                              }
                            }}
                            onClick={() => setMostrarDetalles(
                              mostrarDetalles === String(deuda.id_deuda_cuota) ? null : String(deuda.id_deuda_cuota)
                            )}
                          >
                            {soloFecha(deuda.fecha)} - {deuda.nombre_servicio} - S/{deuda.por_pagar}
                          </Typography>
                          {mostrarDetalles === String(deuda.id_deuda_cuota) && (
                            <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                              {columns.map((column) => (
                                <Box key={column.id}>
                                  <Typography sx={{ fontWeight: "bold", mb: 1 }}>{column.label}</Typography>
                                  <Typography>{(deuda as any)[column.id]}</Typography>
                                </Box>
                              ))}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                      : columns.map((column) => (
                        <TableCell key={column.id} align={column.align}>
                          {(deuda as any)[column.id]}
                        </TableCell>
                      ))}
                  </TableRow>
                ))
              : <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  {mensajeVacio}
                </TableCell>
              </TableRow>
            }
          </TableBody>
          {!isTablet && !isMobile && deudas.length > 0 && (
            <TableHead>
              <TableRow>
                <TableCell
                  colSpan={mostrarColumnasCompletas ? columns.length - 3 : columns.length - 1}
                  align="right"
                  sx={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}
                >
                  TOTAL:
                </TableCell>
                {mostrarColumnasCompletas && (
                  <TableCell align="right" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd", fontSize: '1rem', borderTop: '2px solid #1976d2' }}>
                    S/ {Number(totalGeneral.total || 0).toFixed(2)}
                  </TableCell>
                )}
                {mostrarColumnasCompletas && (
                  <TableCell align="right" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd", fontSize: '1rem', borderTop: '2px solid #1976d2' }}>
                    S/ {Number(totalGeneral.a_cuenta || 0).toFixed(2)}
                  </TableCell>
                )}
                <TableCell align="right" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd", fontSize: '1rem', borderTop: '2px solid #1976d2' }}>
                  S/ {Number(totalGeneral.por_pagar || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableHead>
          )}
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ListaDeudasPendientes;
