import {
  IconButton,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import React, { useState } from "react";
import { manejarError, mostrarAlerta } from "../Alerts/Registrar";
import BotonesModal from "../Shared/BotonesModal";
import ContenedorModal from "../Shared/ContenedorModal";
import ModalSolicitarTelefono from "../Shared/ModalSolicitarTelefono";
import { normalizarTelefono } from "../../Utils/telefonoUtils";

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
  telefono?: string;
  onGuardarTelefono?: (telefono: string) => Promise<void> | void;
}

const ModalCredenciales: React.FC<ModalCredencialesProps> = ({ open, onClose, titulo, credenciales, resumen, telefono, onGuardarTelefono }) => {
  const [openTelefono, setOpenTelefono] = useState(false);
  const [guardandoTelefono, setGuardandoTelefono] = useState(false);

  const telefonoValido = normalizarTelefono(telefono);

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

  const abrirWhatsApp = (numero: string) => {
    const cuentas = credenciales
      .map((c) => `👤 Usuario: ${c.nombre_usuario}\n🔑 Contraseña: ${c.password_temporal}`)
      .join("\n\n");
    const texto = [
      "🔐 Credenciales de acceso – SYSTEM MERCADO",
      "",
      "Hola, le compartimos sus datos para ingresar al sistema:",
      "",
      cuentas,
      "",
      "Puede utilizar estas credenciales para iniciar sesión en el sistema.",
      "",
      "Por seguridad, recomendamos no compartir estos datos con otras personas.",
    ].join("\n");
    const encodedText = encodeURIComponent(texto);
    const phone = numero.startsWith("+51") ? numero : `+51${numero}`;
    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`;
    window.open(url, "_blank");
  };

  const enviarWhatsApp = () => {
    if (telefonoValido) {
      abrirWhatsApp(telefonoValido);
      return;
    }

    if (onGuardarTelefono) {
      setOpenTelefono(true);
      return;
    }

    mostrarAlerta("Sin teléfono", "No se dispone del número de teléfono para enviar por WhatsApp.", "warning");
  };

  const confirmarTelefono = async (numero: string) => {
    if (!onGuardarTelefono) return;

    setGuardandoTelefono(true);
    try {
      await onGuardarTelefono(numero);
      setOpenTelefono(false);
      abrirWhatsApp(numero);
    } catch (error) {
      manejarError(error);
    } finally {
      setGuardandoTelefono(false);
    }
  };

  return (
    <>
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
            textoWhatsapp="Enviar"
            actionWhatsapp={(telefonoValido || onGuardarTelefono) ? enviarWhatsApp : undefined}
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

      <ModalSolicitarTelefono
        open={openTelefono}
        onClose={() => setOpenTelefono(false)}
        onGuardar={confirmarTelefono}
        loading={guardandoTelefono}
        nombre={credenciales[0]?.nombre_usuario}
      />
    </>
  );
};

export default ModalCredenciales;
