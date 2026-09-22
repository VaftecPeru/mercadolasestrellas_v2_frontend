import {
  Checkbox,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { manejarError, mostrarAlerta } from "../Alerts/Registrar";
import BotonesModal from "../Shared/BotonesModal";
import ContenedorModal from "../Shared/ContenedorModal";
import apiClient from "../../Utils/apliClient";
import { Api_Global_Usuarios } from "../../service/UsuarioApi";
import { Modulo, Rol } from "../../interface/Usuarios";

interface ModalPermisosRolProps {
  open: boolean;
  handleClose: () => void;
  onGuardado: () => void;
}

const ModalPermisosRol: React.FC<ModalPermisosRolProps> = ({ open, handleClose, onGuardado }) => {
  const [roles, setRoles] = useState<Rol[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [rolSeleccionado, setRolSeleccionado] = useState<string>("");
  const [modulosSeleccionados, setModulosSeleccionados] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const cargar = async () => {
      try {
        const [respRoles, respModulos] = await Promise.all([
          apiClient.get(Api_Global_Usuarios.roles.listar()),
          apiClient.get(Api_Global_Usuarios.modulos.listar()),
        ]);
        setRoles(respRoles.data);
        setModulos(respModulos.data);
      } catch (error) {
        manejarError(error);
      }
    };

    cargar();
  }, [open]);

  const manejarCambioRol = (idRol: string) => {
    setRolSeleccionado(idRol);
    const rol = roles.find((r) => String(r.id_rol) === String(idRol));
    setModulosSeleccionados(rol ? rol.modulos : []);
  };

  const toggleModulo = (idModulo: number) => {
    const estaSeleccionado = modulosSeleccionados.includes(idModulo);
    let nuevos = [...modulosSeleccionados];

    if (estaSeleccionado) {
      nuevos = nuevos.filter((id) => id !== idModulo);
      // Al desmarcar un padre, se desmarcan sus hijos
      nuevos = nuevos.filter((id) => {
        const m = modulos.find((mm) => mm.id_modulo === id);
        return !(m && m.id_modulo_parent === idModulo);
      });
    } else {
      nuevos.push(idModulo);
      // Al marcar un hijo, se marca automáticamente su padre
      const modulo = modulos.find((m) => m.id_modulo === idModulo);
      if (modulo?.id_modulo_parent && !nuevos.includes(modulo.id_modulo_parent)) {
        nuevos.push(modulo.id_modulo_parent);
      }
    }

    setModulosSeleccionados(nuevos);
  };

  const esAdministrador = rolSeleccionado === "1";

  const guardar = async () => {
    if (!rolSeleccionado) {
      mostrarAlerta("Atención", "Seleccione un rol.", "info");
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.put(
        Api_Global_Usuarios.roles.actualizarModulos(Number(rolSeleccionado)),
        { id_modulos: modulosSeleccionados }
      );
      if (response.status === 200) {
        mostrarAlerta("Permisos", response.data.message || "Permisos actualizados correctamente.", "success");
        onGuardado();
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
      ancho="520px"
      alto="auto"
      abrir={open}
      cerrar={handleClose}
      titulo="Permisos por rol"
      loading={loading}
      botones={
        <BotonesModal
          loading={loading}
          action={guardar}
          close={handleClose}
          textoAccion="Guardar"
          disabledAccion={esAdministrador || !rolSeleccionado}
        />
      }
    >
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="rol-permisos-label">Rol</InputLabel>
        <Select
          labelId="rol-permisos-label"
          label="Rol"
          value={rolSeleccionado}
          onChange={(e) => manejarCambioRol(e.target.value as string)}
        >
          {roles.map((rol) => (
            <MenuItem key={rol.id_rol} value={String(rol.id_rol)}>
              {rol.nombre}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {!rolSeleccionado && (
        <Typography sx={{ textAlign: "center", color: "#757575", my: 3 }}>
          Seleccione un rol para ver y modificar sus permisos.
        </Typography>
      )}

      {rolSeleccionado && esAdministrador && (
        <Typography sx={{ mb: 2, color: "#757575", textAlign: "center" }}>
          No se pueden modificar los permisos del rol Administrador.
        </Typography>
      )}

      {rolSeleccionado && (
        <List dense>
          {modulos.map((modulo) => {
            const esPadre = modulo.id_modulo_parent === null;
            return (
              <ListItem
                key={modulo.id_modulo}
                disablePadding
                sx={{ pl: esPadre ? 0 : 3 }}
              >
                <ListItemButton
                  role={undefined}
                  onClick={() => !esAdministrador && toggleModulo(modulo.id_modulo)}
                  dense
                  disabled={esAdministrador}
                >
                  <Checkbox
                    edge="start"
                    checked={modulosSeleccionados.includes(modulo.id_modulo)}
                    tabIndex={-1}
                    disableRipple
                  />
                  <ListItemText
                    primary={modulo.nombre}
                    primaryTypographyProps={{
                      sx: { fontWeight: esPadre ? "bold" : "normal" },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      )}
    </ContenedorModal>
  );
};

export default ModalPermisosRol;
