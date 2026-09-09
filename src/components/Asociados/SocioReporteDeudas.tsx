import React from 'react';
import LoadingSpinner from '../PogressBar/ProgressBarV1';
import ListaDeudasPendientes from '../ReporteDeudas/ListaDeudasPendientes';
import { DeudaPendiente } from '../../interface/ReporteDeudas/deudas';

interface SocioReporteDeudasProps {
  deudas: DeudaPendiente[];
  isLoading?: boolean;
  error?: string | null;
}

const SocioReporteDeudas: React.FC<SocioReporteDeudasProps> = ({ deudas, isLoading = false, error = null }) => {
  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div style={{ padding: 16, textAlign: 'center', color: '#b00020' }}>{error}</div>;
  }

  return (
    <ListaDeudasPendientes
      deudas={deudas}
      mostrarPuesto
      tituloMovil=""
      mensajeVacio="El socio no tiene deudas pendientes."
    />
  );
};

export default SocioReporteDeudas;
