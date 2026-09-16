export interface UsuarioAdmin {
  id_usuario: number;
  nombre_usuario: string;
  id_rol: number;
  rol: string | null;
  estado: string;
  bloqueado: boolean;
  debe_cambiar_password: boolean;
  ultimo_acceso: string | null;
  fecha_registro: string;
  estado_cuenta: "activo" | "inactivo" | "bloqueado" | "pendiente";
  nombre_completo: string | null;
  dni: string | null;
  nombre: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  sexo: string | null;
  direccion: string | null;
  telefono: string | null;
  correo: string | null;
}

export interface Rol {
  id_rol: number;
  nombre: string;
  codigo: string;
  es_administrador: string;
  modulos: number[];
}

export interface SocioSinCuenta {
  id_socio: number;
  dni: string;
  nombre_completo: string;
}

export interface ResultadoGenerarCuentas {
  total_creadas: number;
  total_salteadas: number;
  creadas: Array<{ id_socio: number; nombre_usuario: string; password_temporal: string }>;
  salteadas: Array<{ id_socio: number; motivo: string }>;
}

export interface Modulo {
  id_modulo: number;
  nombre: string;
  url: string;
  url_foco: string;
  url_activa: string;
  icon: string;
  estado: string;
  id_modulo_parent: number | null;
  orden: number;
}

export interface ModuloWeb {
  id_modulo: number;
  nombre: string;
  url: string;
  url_activa: string;
  icon: string;
  estado: string;
  id_modulo_parent: number | null;
  orden: number;
  modulos: Array<{
    id_modulo: number;
    nombre: string;
    url: string;
    url_activa: string;
    icon: string;
    estado: string;
    id_modulo_parent: number | null;
    orden: number;
    url_foco: string;
  }>;
}
