import {
  Box,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { manejarError, mostrarAlerta } from "../Alerts/Registrar";
import BotonesModal from "../Shared/BotonesModal";
import ContenedorModal from "../Shared/ContenedorModal";
import apiClient from "../../Utils/apliClient";
import { Api_Global_Usuarios } from "../../service/UsuarioApi";
import { ResultadoGenerarCuentas, SocioSinCuenta } from "../../interface/Usuarios";

interface ModalGenerarCuentasProps {
  open: boolean;
  handleClose: () => void;
  onGenerado: (resultado: ResultadoGenerarCuentas) => void;
}

const ModalGenerarCuentas: React.FC<ModalGenerarCuentasProps> = ({ open, handleClose, onGenerado }) => {
  const [socios, setSocios] = useState<SocioSinCuenta[]>([]);
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [usernames, setUsernames] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const cargar = async () => {
      setLoading(true);
      try {
        const response = await apiClient.get(Api_Global_Usuarios.usuarios.sociosSinCuenta());
        setSocios(response.data);
        setSeleccionados([]);
        setUsernames({});
      } catch (error) {
        manejarError(error);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [open]);

  const toggleSeleccion = (socio: SocioSinCuenta) => {
    if (seleccionados.includes(socio.id_socio)) {
      setSeleccionados(seleccionados.filter((id) => id !== socio.id_socio));
      setUsernames((prev) => {
        const next = { ...prev };
        delete next[socio.id_socio];
        return next;
      });
    } else {
      setSeleccionados([...seleccionados, socio.id_socio]);
      setUsernames((prev) => ({
        ...prev,
        [socio.id_socio]: prev[socio.id_socio] ?? (/^\d{8}$/.test(socio.dni) ? socio.dni : ""),
      }));
    }
  };

  const cambiarUsername = (idSocio: number, value: string) => {
    setUsernames((prev) => ({ ...prev, [idSocio]: value }));
  };

  const generar = async () => {
    if (seleccionados.length === 0) {
      mostrarAlerta("Atención", "Seleccione al menos un socio.", "info");
      return;
    }

    setLoading(true);
    try {
      const payload = seleccionados.map((idSocio) => ({
        id_socio: idSocio,
        nombre_usuario: usernames[idSocio] ?? "",
      }));

      const response = await apiClient.post(Api_Global_Usuarios.usuarios.generarCuentasSocios(), {
        socios: payload,
      });

      if (response.status === 200) {
        onGenerado(response.data);
        handleClose();
      }
    } catch (error) {
      manejarError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContenedorModal
      ancho="640px"
      alto="auto"
      abrir={open}
      cerrar={handleClose}
      titulo="Generar cuentas de socios"
      loading={loading}
      botones={
        <BotonesModal
          loading={loading}
          action={generar}
          close={handleClose}
          textoAccion="Generar"
          disabledAccion={seleccionados.length === 0}
        />
      }
    >
      {socios.length === 0 ? (
        <Typography sx={{ textAlign: "center", color: "#757575", my: 3 }}>
          No hay socios pendientes de cuenta.
        </Typography>
      ) : (
        <>
          <Typography sx={{ mb: 2, fontSize: "0.85rem", color: "#333" }}>
            Seleccione los socios para generar su cuenta de acceso. Puede personalizar el nombre de usuario antes de generar.
          </Typography>

          <List dense sx={{ maxHeight: 400, overflowY: "auto" }}>
            {socios.map((socio) => {
              const seleccionado = seleccionados.includes(socio.id_socio);
              return (
                <Box key={socio.id_socio}>
                  <ListItem disablePadding>
                    <ListItemButton role={undefined} onClick={() => toggleSeleccion(socio)} dense>
                      <Checkbox edge="start" checked={seleccionado} tabIndex={-1} disableRipple />
                      <ListItemText
                        primary={socio.nombre_completo}
                        secondary={`DNI: ${socio.dni || "-"}`}
                      />
                    </ListItemButton>
                  </ListItem>
                  {seleccionado && (
                    <Box sx={{ pl: 6, pr: 2, pb: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Nombre de usuario"
                        value={usernames[socio.id_socio] ?? ""}
                        onChange={(e) => cambiarUsername(socio.id_socio, e.target.value)}
                      />
                    </Box>
                  )}
                </Box>
              );
            })}
          </List>
        </>
      )}
    </ContenedorModal>
  );
};

export default ModalGenerarCuentas;
