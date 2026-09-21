import React, { useEffect, useState } from "react";
import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import {
  AccountCircle,
  Badge,
  Email,
  Event,
  Home,
  ManageAccounts,
  Person,
  Phone,
  Wc,
} from "@mui/icons-material";
import { SelectChangeEvent } from "@mui/material/Select";
import { manejarError, mostrarAlerta, mostrarAlertaConfirmacion } from "../Alerts/Registrar";
import BotonesModal from "../Shared/BotonesModal";
import ContenedorModal from "../Shared/ContenedorModal";
import { AvisoFormulario, SeparadorBloque, TxtFormulario } from "../Shared/ElementosFormulario";
import apiClient from "../../Utils/apliClient";
import { Api_Global_Usuarios } from "../../service/UsuarioApi";
import { UsuarioAdmin } from "../../interface/Usuarios";

export interface CredencialUsuario {
  nombre_usuario: string;
  password_temporal: string;
  id_usuario?: number;
  telefono?: string;
}

interface RegistrarUsuarioProps {
  open: boolean;
  usuario: UsuarioAdmin | null;
  handleClose: () => void;
  onCreado: (credencial: CredencialUsuario | null) => void;
}

const hoyISO = () => new Date().toISOString().slice(0, 10);

const formInicial = {
  nombre_usuario: "",
  id_rol: "",
  nombre: "",
  apellido_paterno: "",
  apellido_materno: "",
  dni: "",
  correo: "",
  telefono: "",
  direccion: "",
  sexo: "",
  estado: "1",
  fecha_registro: hoyISO(),
};

const RegistrarUsuario: React.FC<RegistrarUsuarioProps> = ({ open, usuario, handleClose, onCreado }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(formInicial);

  useEffect(() => {
    if (usuario) {
      setFormData({
        nombre_usuario: usuario.nombre_usuario || "",
        id_rol: usuario.id_rol ? String(usuario.id_rol) : "",
        nombre: usuario.nombre || "",
        apellido_paterno: usuario.apellido_paterno || "",
        apellido_materno: usuario.apellido_materno || "",
        dni: usuario.dni || "",
        correo: usuario.correo || "",
        telefono: usuario.telefono || "",
        direccion: usuario.direccion || "",
        sexo:
          usuario.sexo === "1"
            ? "Masculino"
            : usuario.sexo === "2"
              ? "Femenino"
              : usuario.sexo || "",
        estado: usuario.estado || "1",
        fecha_registro: usuario.fecha_registro ? usuario.fecha_registro.slice(0, 10) : hoyISO(),
      });
    } else {
      setFormData(formInicial);
    }
  }, [usuario]);

  const manejarCambio = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const registrarUsuario = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiClient.post(Api_Global_Usuarios.usuarios.registrar(), formData);
      if (response.status === 200) {
        onCreado({
          nombre_usuario: response.data.usuario.nombre_usuario,
          password_temporal: response.data.password_temporal,
          id_usuario: response.data.usuario.id_usuario,
          telefono: formData.telefono,
        });
      }
    } catch (error) {
      manejarError(error);
    } finally {
      setLoading(false);
    }
  };

  const editarUsuario = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await apiClient.put(
        Api_Global_Usuarios.usuarios.editar(usuario!.id_usuario),
        { ...formData, id_rol: Number(formData.id_rol) }
      );
      if (response.status === 200) {
        mostrarAlerta("Actualización exitosa", response.data.message || "El usuario se actualizó correctamente.", "success");
        onCreado(null);
      }
    } catch (error) {
      manejarError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ContenedorModal
      ancho="740px"
      alto="auto"
      abrir={open}
      cerrar={handleClose}
      titulo={usuario ? "Editar usuario" : "Registrar usuario"}
      loading={loading}
      botones={
        <BotonesModal
          loading={loading}
          obj={usuario}
          action={async (e) => {
            const result = await mostrarAlertaConfirmacion(
              usuario ? "¿Está seguro de actualizar el usuario?" : "¿Está seguro de registrar un nuevo usuario?"
            );
            if (result.isConfirmed) {
              if (usuario) {
                editarUsuario(e);
              } else {
                registrarUsuario(e);
              }
            }
          }}
          close={handleClose}
        />
      }
    >
      <AvisoFormulario />

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}>
          <SeparadorBloque nombre="Datos personales" />

          <TxtFormulario
            label="Nombre (*)"
            name="nombre"
            value={formData.nombre}
            onChange={manejarCambio}
            icono={<AccountCircle sx={{ mr: 1, color: "gray" }} />}
          />
          <TxtFormulario
            label="Apellido Paterno (*)"
            name="apellido_paterno"
            value={formData.apellido_paterno}
            onChange={manejarCambio}
            icono={<AccountCircle sx={{ mr: 1, color: "gray" }} />}
          />
          <TxtFormulario
            label="Apellido Materno (*)"
            name="apellido_materno"
            value={formData.apellido_materno}
            onChange={manejarCambio}
            icono={<AccountCircle sx={{ mr: 1, color: "gray" }} />}
          />

          <FormControl fullWidth required>
            <InputLabel id="sexo-label">Sexo</InputLabel>
            <Select
              labelId="sexo-label"
              fullWidth
              label="Sexo (*)"
              name="sexo"
              value={formData.sexo}
              onChange={manejarCambio}
              sx={{ mb: 2 }}
              startAdornment={<Wc sx={{ mr: 1, color: "gray" }} />}
            >
              <MenuItem value="Masculino">Masculino</MenuItem>
              <MenuItem value="Femenino">Femenino</MenuItem>
            </Select>
          </FormControl>

          <TxtFormulario
            label="DNI (*)"
            name="dni"
            value={formData.dni}
            onChange={manejarCambio}
            icono={<Badge sx={{ mr: 1, color: "gray" }} />}
          />
          <TxtFormulario
            label="Dirección (*)"
            name="direccion"
            value={formData.direccion}
            onChange={manejarCambio}
            icono={<Home sx={{ mr: 1, color: "gray" }} />}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <SeparadorBloque nombre="Contacto" />

          <TxtFormulario
            label="Nro. Teléfono (*)"
            name="telefono"
            value={formData.telefono}
            onChange={manejarCambio}
            icono={<Phone sx={{ mr: 1, color: "gray" }} />}
          />
          <TxtFormulario
            label="Correo (*)"
            name="correo"
            value={formData.correo}
            onChange={manejarCambio}
            icono={<Email sx={{ mr: 1, color: "gray" }} />}
          />

          <SeparadorBloque nombre="Acceso" />

          <TxtFormulario
            label="Nombre de usuario (*)"
            name="nombre_usuario"
            value={formData.nombre_usuario}
            onChange={manejarCambio}
            icono={<Badge sx={{ mr: 1, color: "gray" }} />}
          />

          <FormControl fullWidth required>
            <InputLabel id="id-rol-label">Rol</InputLabel>
            <Select
              labelId="id-rol-label"
              fullWidth
              label="Rol (*)"
              name="id_rol"
              value={formData.id_rol}
              onChange={manejarCambio}
              sx={{ mb: 2 }}
              startAdornment={<ManageAccounts sx={{ mr: 1, color: "gray" }} />}
            >
              <MenuItem value="1">Administrador</MenuItem>
              <MenuItem value="3">Cajero</MenuItem>
            </Select>
          </FormControl>

          <SeparadorBloque nombre="Información de registro" />

          <FormControl fullWidth required sx={{ mb: 2 }}>
            <InputLabel id="estado-label">Estado</InputLabel>
            <Select
              labelId="estado-label"
              label="Estado"
              name="estado"
              value={formData.estado}
              onChange={manejarCambio}
              startAdornment={<Person sx={{ mr: 1, color: "gray" }} />}
            >
              <MenuItem value="1">Activo</MenuItem>
              <MenuItem value="0">Inactivo</MenuItem>
            </Select>
          </FormControl>

          <TxtFormulario
            type="date"
            label="Fecha de Registro"
            name="fecha_registro"
            value={formData.fecha_registro}
            onChange={manejarCambio}
            icono={<Event sx={{ mr: 1, color: "gray" }} />}
          />
        </Grid>
      </Grid>
    </ContenedorModal>
  );
};

export default RegistrarUsuario;
