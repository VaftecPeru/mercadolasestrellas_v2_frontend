import React, { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ContenedorModal from '../Shared/ContenedorModal';
import useReporteSocio from '../../hooks/Socios/useReporteSocio';
import SocioReporteDeudas from './SocioReporteDeudas';
import SocioReportePagos from './SocioReportePagos';
import { Socio } from '../../interface/Socios';

interface ModalReporteSocioProps {
  open: boolean;
  socio: Socio | null;
  tabInicial: number;
  onClose: () => void;
}

const ModalReporteSocio: React.FC<ModalReporteSocioProps> = ({ open, socio, tabInicial, onClose }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);
  const { deudas, pagos, isLoading, error, cargarDeudas, cargarPagos, reset } = useReporteSocio(
    socio ? Number(socio.id_socio) : null
  );

  useEffect(() => {
    if (!open || !socio) return;
    reset();
    setActiveTab(tabInicial);
    if (tabInicial === 0) {
      cargarDeudas();
    } else {
      cargarPagos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, socio]);

  const cambiarTab = (_event: React.SyntheticEvent, nuevoTab: number) => {
    setActiveTab(nuevoTab);
    if (nuevoTab === 0) {
      cargarDeudas();
    } else {
      cargarPagos();
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const abrirReporteCompleto = () => {
    const idPuesto = socio?.puestos && socio.puestos.length > 0 ? socio.puestos[0].id_puesto : null;
    if (!idPuesto) return;
    const ruta = activeTab === 0 ? `/home/reporte-deudas?puesto=${idPuesto}` : `/home/reporte-pagos?puesto=${idPuesto}`;
    handleClose();
    navigate(ruta);
  };

  return (
    <ContenedorModal
      ancho="860px"
      alto="520px"
      abrir={open}
      cerrar={() => handleClose()}
      loading={false}
      titulo={socio ? `Reporte del socio - ${socio.nombre_completo}` : "Reporte del socio"}
      activeTab={activeTab}
      handleTabChange={cambiarTab}
      tabs={["Deudas pendientes", "Pagos realizados"]}
      botones={null}
    >
      {activeTab === 0 ? (
        <SocioReporteDeudas deudas={deudas} isLoading={isLoading} error={error} />
      ) : (
        <SocioReportePagos pagos={pagos} isLoading={isLoading} error={error} />
      )}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button
          variant="contained"
          disabled={!socio?.puestos || socio.puestos.length === 0}
          onClick={abrirReporteCompleto}
          sx={{
            backgroundColor: "#008001",
            "&:hover": { backgroundColor: "#2c6d33" },
            height: "42px",
            borderRadius: "30px",
            textTransform: "none",
          }}
        >
          {activeTab === 0 ? "Abrir reporte de deudas completo" : "Abrir reporte de pagos completo"}
        </Button>
      </Box>
    </ContenedorModal>
  );
};

export default ModalReporteSocio;
