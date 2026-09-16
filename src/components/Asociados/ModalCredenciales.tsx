import {
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import React from "react";
import { mostrarAlerta } from "../Alerts/Registrar";
import BotonesModal from "../Shared/BotonesModal";
import ContenedorModal from "../Shared/ContenedorModal";

export interface CredencialSocio {
  nombre_usuario: string;
  password_temporal: string;
}

interface ModalCredencialesProps {
  open: boolean;
  onClose: () => void;
  titulo: string;
  credenciales: CredencialSocio[];
  resumen?: string;
}

const ModalCredenciales: React.FC<ModalCredencialesProps> = ({ open, onClose, titulo, credenciales, resumen }) => {
  const copiar = (texto: string) => {
    navigator.clipboard.writeText(texto).then(
      () => mostrarAlerta("Copiado", "Credenciales copiadas al portapapeles.", "success"),
      () => mostrarAlerta("Error", "No se pudo copiar al portapapeles.", "error")
    );
  };

  const copiarTodas = () => {
    const texto = credenciales
      .map((c) => `Usuario: ${c.nombre_usuario}\nContraseña temporal: ${c.password_temporal}`)
      .join("\n\n");
    copiar(texto);
  };

  return (
    <ContenedorModal
      ancho="520px"
      alto="auto"
      abrir={open}
      cerrar={() => onClose()}
      titulo={titulo}
      loading={false}
      botones={
        <BotonesModal
          loading={false}
          action={copiarTodas}
          close={onClose}
          textoAccion="Copiar"
        />
      }
    >
      {resumen && (
        <Typography sx={{ mb: 2, fontSize: "0.85rem", color: "#333", textAlign: "center" }}>
          {resumen}
        </Typography>
      )}

      <Typography sx={{ fontSize: "0.85rem", color: "#c62828", mb: 2, textAlign: "center" }}>
        Guarde estas credenciales ahora. La contraseña temporal se muestra únicamente esta vez.
      </Typography>

      <List sx={{ bgcolor: "#fafafa", borderRadius: "8px" }}>
        {credenciales.map((c, index) => (
          <ListItem
            key={index}
            divider
            secondaryAction={
              <IconButton
                edge="end"
                aria-label="copiar"
                onClick={() => copiar(`Usuario: ${c.nombre_usuario}\nContraseña temporal: ${c.password_temporal}`)}
              >
                <ContentCopyIcon />
              </IconButton>
            }
          >
            <ListItemText
              primary={`Usuario: ${c.nombre_usuario}`}
              secondary={`Contraseña temporal: ${c.password_temporal}`}
            />
          </ListItem>
        ))}
      </List>
    </ContenedorModal>
  );
};

export default ModalCredenciales;
