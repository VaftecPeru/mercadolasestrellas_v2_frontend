import React, { useEffect, useState } from 'react';
import { Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ContenedorModal from '../Shared/ContenedorModal';
import useReporteSocio from '../../hooks/Socios/useReporteSocio';
import SocioReporteDeudas from './SocioReporteDeudas';
import SocioReportePagos from './SocioReportePagos';
import useResponsive from '../../hooks/Responsive/useResponsive';
import { Socio } from '../../interface/Socios';

interface ModalReporteSocioProps {
  open: boolean;
  socio: Socio | null;
  tabInicial: number;
  onClose: () => void;
}

const ModalReporteSocio: React.FC<ModalReporteSocioProps> = ({ open, socio, tabInicial, onClose }) => {
  const navigate = useNavigate();
  const { isTablet, isMobile } = useResponsive();
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

  const tienePuesto = !!(socio?.puestos && socio.puestos.length > 0);

  return (
    <ContenedorModal
      ancho="860px"
      alto="560px"
      abrir={open}
      cerrar={() => handleClose()}
      loading={false}
      titulo={socio ? `Reporte del socio - ${socio.nombre_completo}` : "Reporte del socio"}
      activeTab={activeTab}
      handleTabChange={cambiarTab}
      tabs={["Deudas pendientes", "Pagos realizados"]}
      botones={
        <Box
          sx={{
            display: "flex",
            justifyContent: isTablet || isMobile ? "center" : "flex-end",
            mt: "auto",
            p: isTablet || isMobile ? "20px 0px 0px 0px" : "20px 58px 0 58px",
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Button
            variant="contained"
            sx={{
              width: "140px",
              height: "45px",
              backgroundColor: "#202123",
              color: "#fff",
              mr: 1,
              "&:hover": {
                backgroundColor: "#3F4145",
              },
            }}
            onClick={handleClose}
          >
            Cerrar
          </Button>
          <Button
            variant="contained"
            disabled={!tienePuesto}
            onClick={abrirReporteCompleto}
            sx={{
              height: "45px",
              padding: "0 20px",
              backgroundColor: "#008001",
              color: "#fff",
              "&:hover": {
                backgroundColor: "#388E3C",
              },
            }}
          >
            {activeTab === 0 ? "Abrir reporte de deudas completo" : "Abrir reporte de pagos completo"}
          </Button>
        </Box>
      }
    >
      {activeTab === 0 ? (
        <SocioReporteDeudas deudas={deudas} isLoading={isLoading} error={error} />
      ) : (
        <SocioReportePagos pagos={pagos} isLoading={isLoading} error={error} />
      )}
    </ContenedorModal>
  );
};

export default ModalReporteSocio;
