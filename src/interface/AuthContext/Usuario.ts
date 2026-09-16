export interface Usuario {
  id_usuario: number;
  nombre_usuario: string;
  id_rol: number;
  estado?: string;
  debe_cambiar_password?: boolean;
}
