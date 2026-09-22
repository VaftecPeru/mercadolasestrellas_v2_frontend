import React from 'react';
import LoadingSpinner from '../PogressBar/ProgressBarV1';
import ListaPagosRealizados from '../ReporteDeudas/ListaPagosRealizados';
import { Data as DataPago } from '../../interface/ReportePagos/pagos';

interface SocioReportePagosProps {
  pagos: DataPago[];
  isLoading?: boolean;
  error?: string | null;
}

const SocioReportePagos: React.FC<SocioReportePagosProps> = ({ pagos, isLoading = false, error = null }) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div style={{ padding: 16, textAlign: 'center', color: '#b00020' }}>{error}</div>;
  }

  return (
    <ListaPagosRealizados
      pagos={pagos}
      tituloMovil=""
      mensajeVacio="El socio no tiene pagos realizados."
      mostrarPuesto
    />
  );
};

export default SocioReportePagos;
