export interface Puesto {
  id_puesto: string;
  numero_puesto: string;
}

export interface Socio {
  id_socio: string;
  nombre_completo: string;
}

export interface Column {
  id: keyof Data | keyof DeudaPendiente | "accion";
  label: string;
  minWidth?: number;
  align?: "center" | "left" | "right";
}

export interface Data {
  id_cuota: string;
  anio: string;
  mes: string;
  fecha: string;
  servicio_descripcion: string;
  total: string;
  importe_pagado: string;
  importe_por_pagar: string;
}

export interface DeudaPendiente {
  id_deuda: number;
  id_deuda_cuota: number;
  nombre_servicio: string;
  fecha: string;
  anio: string;
  mes: string;
  numero_puesto?: string;
  total: string;
  a_cuenta: string;
  por_pagar: string;
}
