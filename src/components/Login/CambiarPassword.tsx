import { Box, Button, Container, TextField, Typography } from '@mui/material';
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import useResponsive from '../../hooks/Responsive/useResponsive';
import { manejarError, mostrarAlerta } from "../Alerts/Registrar";
import apiClient from "../../Utils/apliClient";
import { ID_ROL } from "../../Utils/roles";

const CambiarPassword: React.FC = () => {
  const [passwordActual, setPasswordActual] = useState<string>("");
  const [passwordNueva, setPasswordNueva] = useState<string>("");
  const [confirmarPassword, setConfirmarPassword] = useState<string>("");

  const { login } = useAuth();
  const navigate = useNavigate();
  const { isLaptop, isTablet, isMobile, isSmallMobile } = useResponsive();

  const cambiarContrasenia = async () => {
    if (!passwordActual || !passwordNueva || !confirmarPassword) {
      mostrarAlerta("Formulario incompleto", "Por favor completa todos los campos.", "warning");
      return;
    }

    if (passwordNueva !== confirmarPassword) {
      mostrarAlerta("Contraseñas no coinciden", "La nueva contraseña y su confirmación deben ser iguales.", "warning");
      return;
    }

    apiClient.post("/cambiar-password", { password_actual: passwordActual, password_nueva: passwordNueva })
      .then((response) => {
        if (response?.data?.usuario) {
          login(response.data.usuario);
        }
        const destino = response.data?.usuario?.id_rol === ID_ROL.SOCIO ? "/home/reporte-deudas" : "/home";
        mostrarAlerta('Contraseña actualizada', 'Su contraseña fue cambiada correctamente.', 'success');
        navigate(destino);
      })
      .catch((error) => {
        if (error.response?.data) {
          manejarError(error.response.data);
        } else {
          mostrarAlerta('Error', 'No se pudo conectar con el servidor. Verifique su conexión.', 'error');
        }
      });
  };

  return (
    <Container component="main" sx={{ maxWidth: "100vw", maxHeight: "100vh" }}>
      <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Box sx={{
          boxSizing: isSmallMobile || isLaptop ? "border-box" : "content-box",
          width: isSmallMobile ? "100%" : isMobile ? "280px" : isTablet ? "50%" : isLaptop ? "35%" : "400px",
          height: "auto",
          maxHeight: "680px",
          border: "1px solid",
          borderRadius: "15px",
          p: isSmallMobile ? "30px" : isLaptop ? "30px 35px" : "50px 35px",
          display: "flex",
          flexDirection: "column",
        }}>
          <Typography
            component="h1"
            sx={{
              textAlign: "center",
              fontSize: isSmallMobile ? "20px" : isLaptop ? "22px" : isMobile ? "24px" : "28px",
              fontWeight: "bold",
              mb: 1
            }}
          >
            Cambio de contraseña
          </Typography>

          <Typography sx={{ textAlign: "center", color: "#9C9C9C", mb: 3 }}>
            Por seguridad, debe cambiar su contraseña temporal antes de continuar.
          </Typography>

          <Box component="form">
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ mb: "2px", fontWeight: "bold", fontSize: isSmallMobile || isLaptop ? "14px" : "auto", color: "#0AB544" }}>
                Contraseña actual
              </Typography>
              <TextField
                fullWidth
                required
                type="password"
                placeholder="Ingrese su contraseña actual"
                InputProps={{ style: { height: "3rem" } }}
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography sx={{ mb: "2px", fontWeight: "bold", fontSize: isSmallMobile || isLaptop ? "14px" : "auto", color: "#0AB544" }}>
                Nueva contraseña
              </Typography>
              <TextField
                fullWidth
                required
                type="password"
                placeholder="Ingrese su nueva contraseña"
                InputProps={{ style: { height: "3rem" } }}
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography sx={{ mb: "2px", fontWeight: "bold", fontSize: isSmallMobile || isLaptop ? "14px" : "auto", color: "#0AB544" }}>
                Confirmar nueva contraseña
              </Typography>
              <TextField
                fullWidth
                required
                type="password"
                placeholder="Confirme su nueva contraseña"
                InputProps={{ style: { height: "3rem" } }}
                value={confirmarPassword}
                onChange={(e) => setConfirmarPassword(e.target.value)}
              />
            </Box>

            <Button
              variant="contained"
              type="button"
              sx={{
                width: isLaptop || isSmallMobile ? "100%" : "260px",
                mt: 1,
                mb: 3,
                p: "10px 50px",
                textTransform: "inherit",
                fontSize: "16px",
                fontWeight: "500",
                color: "white",
                bgcolor: "#0AB544",
                whiteSpace: "nowrap",
                "&:hover": { bgcolor: "#388E3C" }
              }}
              onClick={cambiarContrasenia}
            >
              Cambiar contraseña
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  )
}

export default CambiarPassword;
