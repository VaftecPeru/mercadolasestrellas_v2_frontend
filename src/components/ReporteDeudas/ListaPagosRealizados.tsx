import { Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import React, { useState } from 'react';
import useResponsive from '../../hooks/Responsive/useResponsive';
import { Data as DataPago } from '../../interface/ReportePagos/pagos';

const soloFecha = (fecha: string) => (fecha ? String(fecha).split(" ")[0] : "");

interface ListaPagosRealizadosProps {
  pagos: DataPago[];
  tituloMovil?: string;
  mensajeVacio?: React.ReactNode;
  mostrarPuesto?: boolean;
}

const ListaPagosRealizados: React.FC<ListaPagosRealizadosProps> = ({
  pagos,
  tituloMovil = "Pagos Realizados",
  mensajeVacio = "No hay pagos realizados.",
  mostrarPuesto = false,
}) => {
  const { isTablet, isMobile } = useResponsive();
  const [mostrarDetalles, setMostrarDetalles] = useState<string | null>(null);

  const columnasPagos = mostrarPuesto
    ? ["Fecha Pago", "Puesto", "Comprobante", "Concepto", "Monto (S/)"]
    : ["Fecha Pago", "Comprobante", "Concepto", "Monto (S/)"];

  const indiceConcepto = columnasPagos.length - 2;
  const indiceMonto = columnasPagos.length - 1;

  const totalMonto = pagos.reduce((acc, pago) =>
    acc + pago.detalle_pagos.reduce((a, detalle) => a + Number(detalle.importe || 0), 0), 0);

  return (
    <Paper sx={{ width: "100%", overflow: "hidden", boxShadow: "none" }}>
      <TableContainer sx={{ maxHeight: "100%", borderRadius: "5px", border: "none" }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {(isTablet || isMobile) && tituloMovil
                ? <TableCell colSpan={columnasPagos.length}>
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
                : columnasPagos.map((label, index) => (
                  <TableCell
                    key={label}
                    align={index === indiceConcepto ? "left" : index === indiceMonto ? "right" : "center"}
                    sx={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}
                  >
                    {label}
                  </TableCell>
                ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {pagos.length > 0
              ? (isTablet || isMobile
                ? pagos.map((pago) => (
                  <TableRow key={pago.id_pago} hover tabIndex={-1}>
                    <TableCell>
                      <Box
                        onClick={() => setMostrarDetalles(mostrarDetalles === String(pago.id_pago) ? null : String(pago.id_pago))}
                        sx={{ cursor: 'pointer', py: 1 }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: '500' }}>
                          Fecha: {soloFecha(pago.fecha)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                          Comprobante: {pago.serie_numero}
                        </Typography>
                        {mostrarPuesto && (
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                            Puesto: {pago.detalle_pagos[0]?.puesto ?? ""}
                          </Typography>
                        )}
                        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
                          Total Pago: S/ {Number(pago.total).toFixed(2)}
                        </Typography>
                        {mostrarDetalles === String(pago.id_pago) && (
                          <Box sx={{ mt: 1, pl: 2, borderLeft: '3px solid #1976d2', bgcolor: '#fafafa', p: 1 }}>
                            <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Conceptos:</Typography>
                            {pago.detalle_pagos.map((detalle, i) => (
                              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption">• {detalle.descripcion}</Typography>
                                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>S/ {Number(detalle.importe).toFixed(2)}</Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
                : pagos.map((pago) => (
                  <React.Fragment key={pago.id_pago}>
                    {pago.detalle_pagos.map((detalle, detIdx) => (
                      <TableRow key={`${pago.id_pago}-${detIdx}`} hover tabIndex={-1}>
                        <TableCell align="center">{detIdx === 0 ? soloFecha(pago.fecha) : ""}</TableCell>
                        {mostrarPuesto && <TableCell align="center">{detIdx === 0 ? (detalle.puesto ?? "") : ""}</TableCell>}
                        <TableCell align="center">{detIdx === 0 ? pago.serie_numero : ""}</TableCell>
                        <TableCell>{detalle.descripcion}</TableCell>
                        <TableCell align="right">{detIdx === pago.detalle_pagos.length - 1 ? `S/ ${Number(pago.total).toFixed(2)}` : Number(detalle.importe).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                )))
              : <TableRow>
                <TableCell colSpan={columnasPagos.length} align="center">
                  {mensajeVacio}
                </TableCell>
              </TableRow>
            }
          </TableBody>
          {!isTablet && !isMobile && pagos.length > 0 && (
            <TableHead>
              <TableRow>
                <TableCell colSpan={columnasPagos.length - 1} align="right" sx={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                  TOTAL:
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold", backgroundColor: "#e3f2fd", fontSize: '1rem', borderTop: '2px solid #1976d2' }}>
                  S/ {Number(totalMonto || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableHead>
          )}
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default ListaPagosRealizados;
