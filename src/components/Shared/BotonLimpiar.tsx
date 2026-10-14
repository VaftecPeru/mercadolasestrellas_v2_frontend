import { Button } from '@mui/material';
import React from 'react';
import useResponsive from '../../hooks/Responsive/useResponsive';
import { RestartAlt } from '@mui/icons-material';

interface BotonLimpiarProps {
  handleAction: (e: React.MouseEvent<HTMLButtonElement>) => void;
  texto?: string;
  disabled?: boolean;
}

const BotonLimpiar: React.FC<BotonLimpiarProps> = ({
  handleAction,
  texto = 'Limpiar',
  disabled = false,
}) => {
  const { isTablet, isMobile } = useResponsive();

  return (
    <Button
      variant="contained"
      startIcon={<RestartAlt />}
      disabled={disabled}
      sx={{
        backgroundColor: '#202123',
        color: '#fff',
        '&:hover': {
          backgroundColor: '#3F4145',
        },
        height: '50px',
        width: isTablet || isMobile ? '100%' : '150px',
        marginBottom: isTablet || isMobile ? '1em' : '0',
        borderRadius: '30px',
      }}
      onClick={handleAction}
    >
      {texto}
    </Button>
  );
};

export default BotonLimpiar;
