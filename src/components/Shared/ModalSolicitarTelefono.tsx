import { Typography } from "@mui/material";
import { Phone } from "@mui/icons-material";
import React, { useEffect, useState } from "react";
import { mostrarAlerta } from "../Alerts/Registrar";
import BotonesModal from "./BotonesModal";
import ContenedorModal from "./ContenedorModal";
import { TxtFormulario } from "./ElementosFormulario";

interface ModalSolicitarTelefonoProps {
  open: boolean;
  onClose: () => void;
  onGuardar: (telefono: string) => void;
  loading?: boolean;
  nombre?: string;
}

const ModalSolicitarTelefono: React.FC<ModalSolicitarTelefonoProps> = ({
  open,
  onClose,
  onGuardar,
  loading = false,
  nombre,
}) => {
  const [telefono, setTelefono] = useState("");

  useEffect(() => {
    if (open) {
      setTelefono("");
    }
  }, [open]);

  const guardar = () => {
    const numero = telefono.trim();

    if (!/^\d{9}$/.test(numero)) {
      mostrarAlerta("Teléfono inválido", "Ingrese un número de 9 dígitos.", "warning");
      return;
    }

    onGuardar(numero);
  };

  return (
    <ContenedorModal
      ancho="420px"
      alto="auto"
      abrir={open}
      cerrar={onClose}
      titulo="Número de WhatsApp"
      loading={loading}
      zIndex={1400}
      botones={
        <BotonesModal
          loading={loading}
          action={guardar}
          close={onClose}
          textoAccion="Enviar"
        />
      }
    >
      <Typography sx={{ mb: 2, color: "#333", textAlign: "center", fontSize: "0.85rem" }}>
        {nombre ? `"${nombre}" no tiene un número de teléfono registrado. ` : "El usuario no tiene un número de teléfono registrado. "}
        Ingrese el número de WhatsApp para enviar las credenciales.
      </Typography>

      <TxtFormulario
        label="Nro. Teléfono (*)"
        name="telefono"
        value={telefono}
        onChange={(e) => setTelefono(e.target.value)}
        icono={<Phone sx={{ mr: 1, color: "gray" }} />}
      />
    </ContenedorModal>
  );
};

export default ModalSolicitarTelefono;
