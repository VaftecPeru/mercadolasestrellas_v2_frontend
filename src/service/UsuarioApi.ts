export const Api_Global_Usuarios = {
  usuarios: {
    listar: (page: number, buscar: string, idRol: string, estado: string) =>
      `/usuarios?page=${page}&buscar=${buscar}&id_rol=${idRol}&estado=${estado}`,
    registrar: () => `/usuarios`,
    editar: (id_usuario: number) => `/usuarios/${id_usuario}`,
    activar: (id_usuario: number) => `/usuarios/${id_usuario}/activar`,
    desactivar: (id_usuario: number) => `/usuarios/${id_usuario}/desactivar`,
    bloquear: (id_usuario: number) => `/usuarios/${id_usuario}/bloquear`,
    desbloquear: (id_usuario: number) => `/usuarios/${id_usuario}/desbloquear`,
    generarPasswordTemporal: (id_usuario: number) => `/usuarios/${id_usuario}/generar-password-temporal`,
    estadisticas: () => `/usuarios/estadisticas`,
    sociosSinCuenta: () => `/usuarios/socios-sin-cuenta`,
    generarCuentasSocios: () => `/usuarios/generar-cuentas-socios`,
  },
  roles: {
    listar: () => `/roles`,
    actualizarModulos: (id_rol: number) => `/roles/${id_rol}/modulos`,
  },
  modulos: {
    listar: () => `/modulos`,
  },
};
