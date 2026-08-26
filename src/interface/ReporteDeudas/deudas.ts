export interface Puesto {
  id_puesto: string;
  numero_puesto: string;
}

export interface Column {
  id: keyof Data | "accion";
  label: string;
  minWidth?: number;
  align?: "center" | "left";
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
