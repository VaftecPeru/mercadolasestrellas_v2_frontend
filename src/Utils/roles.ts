export const ID_ROL = {
  ADMINISTRADOR: 1,
  SOCIO: 2,
  CAJERO: 3,
} as const;

export type IdRol = (typeof ID_ROL)[keyof typeof ID_ROL];
