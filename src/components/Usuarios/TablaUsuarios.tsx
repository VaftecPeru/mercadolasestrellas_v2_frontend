import React, { useEffect, useState } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Box,
  Pagination,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
} from "@mui/material";
import {
  SaveAs,
  Search,
  CheckCircleOutline,
  HighlightOff,
  LockOpen,
  Block,
  VpnKey,
  ManageAccounts,
} from "@mui/icons-material";
import Contenedor from "../Shared/Contenedor";
import ContenedorBotones from "../Shared/ContenedorBotones";
import BotonAgregar from "../Shared/BotonAgregar";
import LoadingSpinner from "../PogressBar/ProgressBarV1";
import ModalCredenciales, { CredencialSocio } from "../Asociados/ModalCredenciales";
import RegistrarUsuario, { CredencialUsuario } from "./RegistrarUsuario";
import ModalPermisosRol from "./ModalPermisosRol";
import ModalGenerarCuentas from "./ModalGenerarCuentas";
import { ResultadoGenerarCuentas, UsuarioAdmin } from "../../interface/Usuarios";
import { Api_Global_Usuarios } from "../../service/UsuarioApi";
import { manejarError, mostrarAlerta, mostrarAlertaConfirmacion } from "../Alerts/Registrar";
import { useAuth } from "../../context/AuthContext";
import { ID_ROL } from "../../Utils/roles";
import apiClient from "../../Utils/apliClient";

const TablaUsuarios: React.FC = () => {
  const { usuario } = useAuth();

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [paginaActual, setPaginaActual] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [buscar, setBuscar] = useState("");
  const [idRol, setIdRol] = useState("");
  const [estado, setEstado] = useState("");

  const [sociosSinCuenta, setSociosSinCuenta] = useState(0);

  const [openRegistrar, setOpenRegistrar] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<UsuarioAdmin | null>(null);

  const [openPermisos, setOpenPermisos] = useState(false);
  const [openGenerarCuentas, setOpenGenerarCuentas] = useState(false);

   const [credenciales, setCredenciales] = useState<CredencialSocio[]>([]);
   const [resumenCredenciales, setResumenCredenciales] = useState("");
   const [openCredenciales, setOpenCredenciales] = useState(false);
   const [telefonoCredenciales, setTelefonoCredenciales] = useState<string | undefined>(undefined);

  const fetchEstadisticas = async () => {
    try {
      const response = await apiClient.get(Api_Global_Usuarios.usuarios.estadisticas());
      setSociosSinCuenta(response.data.socios_sin_cuenta ?? 0);
    } catch (error) {
      manejarError(error);
    }
  };

  const fetchUsuarios = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(
        Api_Global_Usuarios.usuarios.listar(page, buscar, idRol, estado)
      );
      setUsuarios(response.data.data);
      setTotalPages(response.data.meta.last_page);
      setPaginaActual(response.data.meta.current_page);
    } catch (error) {
      manejarError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const esPrimerRender = React.useRef(true);
  useEffect(() => {
    if (esPrimerRender.current) {
      esPrimerRender.current = false;
      return;
    }
    fetchUsuarios(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscar, idRol, estado]);

  useEffect(() => {
    fetchUsuarios(1);
    fetchEstadisticas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenRegistrar = (usuario?: UsuarioAdmin) => {
    setUsuarioSeleccionado(usuario || null);
    setOpenRegistrar(true);
  };

  const handleCloseRegistrar = () => {
    setUsuarioSeleccionado(null);
    setOpenRegistrar(false);
  };

  const handleCreado = (credencial: CredencialUsuario | null) => {
    if (credencial) {
      setResumenCredenciales("");
      setCredenciales([
        { nombre_usuario: credencial.nombre_usuario, password_temporal: credencial.password_temporal },
      ]);
      setOpenCredenciales(true);
    }
    handleCloseRegistrar();
    fetchUsuarios(paginaActual);
  };

  const handleGeneradas = (resultado: ResultadoGenerarCuentas) => {
    const creadas: CredencialSocio[] = (resultado.creadas || []).map((c) => ({
      nombre_usuario: c.nombre_usuario,
      password_temporal: c.password_temporal,
    }));
    setResumenCredenciales(
      `Cuentas creadas: ${resultado.total_creadas}. Socios omitidos: ${resultado.total_salteadas}.`
    );
    setCredenciales(creadas);
    setOpenCredenciales(true);
    fetchEstadisticas();
    fetchUsuarios(paginaActual);
  };

  const accionEstado = async (tipo: "activar" | "desactivar", usuario: UsuarioAdmin) => {
    const confirmacion = await mostrarAlertaConfirmacion(
      tipo === "activar" ? "Activar usuario" : "Desactivar usuario",
      tipo === "activar"
        ? "¿Desea activar este usuario?"
        : "El usuario no podrá iniciar sesión. ¿Desea continuar?",
      "Confirmar",
      "Cancelar"
    );
    if (!confirmacion.isConfirmed) return;

    try {
      const url =
        tipo === "activar"
          ? Api_Global_Usuarios.usuarios.activar(usuario.id_usuario)
          : Api_Global_Usuarios.usuarios.desactivar(usuario.id_usuario);
      const response = await apiClient.post(url);
      mostrarAlerta("Acción realizada", response.data.message, "success");
      fetchUsuarios(paginaActual);
    } catch (error) {
      manejarError(error);
    }
  };

  const accionBloqueo = async (tipo: "bloquear" | "desbloquear", usuario: UsuarioAdmin) => {
    const confirmacion = await mostrarAlertaConfirmacion(
      tipo === "bloquear" ? "Bloquear usuario" : "Desbloquear usuario",
      tipo === "bloquear"
        ? "El usuario no podrá iniciar sesión. ¿Desea continuar?"
        : "¿Desea desbloquear este usuario?",
      "Confirmar",
      "Cancelar"
    );
    if (!confirmacion.isConfirmed) return;

    try {
      const url =
        tipo === "bloquear"
          ? Api_Global_Usuarios.usuarios.bloquear(usuario.id_usuario)
          : Api_Global_Usuarios.usuarios.desbloquear(usuario.id_usuario);
      const response = await apiClient.post(url);
      mostrarAlerta("Acción realizada", response.data.message, "success");
      fetchUsuarios(paginaActual);
    } catch (error) {
      manejarError(error);
    }
  };

   const generarPasswordTemporal = async (usuario: UsuarioAdmin) => {
     const confirmacion = await mostrarAlertaConfirmacion(
       "Generar contraseña temporal",
       `Se generará una nueva contraseña temporal para "${usuario.nombre_usuario}" y deberá cambiarla al iniciar sesión. ¿Desea continuar?`,
       "Generar",
       "Cancelar"
     );
     if (!confirmacion.isConfirmed) return;

     try {
       const response = await apiClient.post(
         Api_Global_Usuarios.usuarios.generarPasswordTemporal(usuario.id_usuario)
       );
       setResumenCredenciales("");
       setCredenciales([
         { nombre_usuario: response.data.nombre_usuario, password_temporal: response.data.password_temporal },
       ]);
       setTelefonoCredenciales(usuario.telefono ?? undefined);
       setOpenCredenciales(true);
       fetchUsuarios(paginaActual);
     } catch (error) {
       manejarError(error);
     }
   };

  const labelEstado = (estadoCuenta: string) => {
    switch (estadoCuenta) {
      case "activo":
        return "Activo";
      case "inactivo":
        return "Inactivo";
      case "bloqueado":
        return "Bloqueado";
      case "pendiente":
        return "Pendiente de activación";
      default:
        return estadoCuenta;
    }
  };

  const esMismoUsuario = (u: UsuarioAdmin) => usuario?.id_usuario === u.id_usuario;

  return (
    <Contenedor>
      <ContenedorBotones>
        <BotonAgregar handleAction={() => handleOpenRegistrar()} texto="Agregar Usuario" />

        <Button
          variant="contained"
          startIcon={<ManageAccounts />}
          sx={{
            backgroundColor: "#008001",
            "&:hover": { backgroundColor: "#2c6d33" },
            height: "50px",
            width: "230px",
            borderRadius: "30px",
          }}
          onClick={() => setOpenPermisos(true)}
        >
          Permisos por rol
        </Button>
      </ContenedorBotones>

      {/* Socios sin cuenta */}
      <Box
        sx={{
          padding: "15px 35px",
          borderTop: "1px solid rgba(0, 0, 0, 0.25)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography sx={{ fontWeight: "bold" }}>
          Socios sin cuenta: {sociosSinCuenta}
        </Typography>

        <Button
          variant="contained"
          startIcon={<VpnKey />}
          sx={{
            backgroundColor: "#008001",
            "&:hover": { backgroundColor: "#2c6d33" },
            height: "50px",
            borderRadius: "30px",
          }}
          disabled={sociosSinCuenta === 0}
          onClick={() => setOpenGenerarCuentas(true)}
        >
          Generar cuentas pendientes
        </Button>
      </Box>

      {/* Filtros */}
      <Box
        sx={{
          padding: "15px 35px",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography sx={{ fontWeight: "bold" }}>Buscar por:</Typography>

        <TextField
          sx={{ width: "280px" }}
          label="Nombre de usuario - DNI"
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
        />

        <FormControl sx={{ width: "180px" }}>
          <InputLabel id="filtro-rol-label">Rol</InputLabel>
          <Select
            labelId="filtro-rol-label"
            label="Rol"
            value={idRol}
            onChange={(e) => setIdRol(e.target.value as string)}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="1">Administrador</MenuItem>
            <MenuItem value="2">Socio</MenuItem>
            <MenuItem value="3">Cajero</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ width: "200px" }}>
          <InputLabel id="filtro-estado-label">Estado</InputLabel>
          <Select
            labelId="filtro-estado-label"
            label="Estado"
            value={estado}
            onChange={(e) => setEstado(e.target.value as string)}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="activo">Activo</MenuItem>
            <MenuItem value="inactivo">Inactivo</MenuItem>
            <MenuItem value="bloqueado">Bloqueado</MenuItem>
            <MenuItem value="pendiente">Pendiente de activación</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="contained"
          startIcon={<Search />}
          sx={{
            backgroundColor: "#008001",
            "&:hover": { backgroundColor: "#2c6d33" },
            height: "50px",
            width: "140px",
            borderRadius: "30px",
          }}
          onClick={() => fetchUsuarios(1)}
        >
          Buscar
        </Button>
      </Box>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <Paper sx={{ width: "100%", overflow: "hidden", boxShadow: "none" }}>
          <TableContainer sx={{ maxHeight: "100%", borderRadius: "5px" }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>Usuario</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>Nombre Completo</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>DNI</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>Rol</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>Estado</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>Último acceso</TableCell>
                  <TableCell align="center" sx={{ fontWeight: "bold" }}>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id_usuario} hover>
                    <TableCell align="left">{u.nombre_usuario}</TableCell>
                    <TableCell align="left">{u.nombre_completo ?? "-"}</TableCell>
                    <TableCell align="left">{u.dni ?? "-"}</TableCell>
                    <TableCell align="left">{u.rol ?? "-"}</TableCell>
                    <TableCell align="left">{labelEstado(u.estado_cuenta)}</TableCell>
                    <TableCell align="left">{u.ultimo_acceso ? u.ultimo_acceso : "-"}</TableCell>
                    <TableCell align="left">
                      <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                        {u.id_rol !== ID_ROL.SOCIO && (
                          <IconButton
                            aria-label="editar"
                            sx={{ color: "#0478E3" }}
                            onClick={() => handleOpenRegistrar(u)}
                          >
                            <SaveAs />
                          </IconButton>
                        )}

                        {!esMismoUsuario(u) &&
                          (u.estado_cuenta === "inactivo" ? (
                            <IconButton
                              aria-label="activar"
                              sx={{ color: "#008001" }}
                              onClick={() => accionEstado("activar", u)}
                            >
                              <CheckCircleOutline />
                            </IconButton>
                          ) : (
                            <IconButton
                              aria-label="desactivar"
                              sx={{ color: "red" }}
                              onClick={() => accionEstado("desactivar", u)}
                            >
                              <HighlightOff />
                            </IconButton>
                          ))}

                        {!esMismoUsuario(u) &&
                          (u.bloqueado ? (
                            <IconButton
                              aria-label="desbloquear"
                              sx={{ color: "#008001" }}
                              onClick={() => accionBloqueo("desbloquear", u)}
                            >
                              <LockOpen />
                            </IconButton>
                          ) : (
                            <IconButton
                              aria-label="bloquear"
                              sx={{ color: "red" }}
                              onClick={() => accionBloqueo("bloquear", u)}
                            >
                              <Block />
                            </IconButton>
                          ))}

                        <IconButton
                          aria-label="generar-password-temporal"
                          sx={{ color: "black" }}
                          onClick={() => generarPasswordTemporal(u)}
                        >
                          <VpnKey />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "center", marginTop: 3 }}>
            <Pagination
              count={totalPages}
              page={paginaActual}
              onChange={(_event, value) => fetchUsuarios(value)}
              color="primary"
            />
          </Box>
        </Paper>
      )}

      <RegistrarUsuario
        open={openRegistrar}
        usuario={usuarioSeleccionado}
        handleClose={handleCloseRegistrar}
        onCreado={handleCreado}
      />

      <ModalPermisosRol open={openPermisos} handleClose={() => setOpenPermisos(false)} onGuardado={() => {}} />

      <ModalGenerarCuentas
        open={openGenerarCuentas}
        handleClose={() => setOpenGenerarCuentas(false)}
        onGenerado={handleGeneradas}
      />

      <ModalCredenciales
        open={openCredenciales}
        onClose={() => setOpenCredenciales(false)}
        titulo="Credenciales de acceso"
        credenciales={credenciales}
        resumen={resumenCredenciales}
        telefono={telefonoCredenciales}
      />
    </Contenedor>
  );
};

export default TablaUsuarios;
