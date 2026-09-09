export interface Socio {
  id_socio: string;
  nombre_completo: string;
}

export interface Puesto {
  id_puesto: string;
  numero_puesto: string;
}

export interface Column {
  // Ajustado para coincidir con los IDs reales de la tabla
  id: "id_pago" | "serie_numero" | "fecha" | "aporte" | "total" | "detalle_pagos" | "accion" | "anio" | "mes" | "servicios" | "montos" | "periodo";
  label: string;
  minWidth?: number;
  align?: "center" | "left" | "right";
}

export interface DetallePago {
  descripcion: string;
  importe: string;
  puesto?: string;
}

export interface Data {
  id_pago: string;
  numero: string;
  serie: string;
  serie_numero: string;
  aporte: string;
  total: string;
  fecha: string;
  anio: string;
  mes: string;
  // Corregido: Ahora es un arreglo para permitir el .map() en el frontend
  detalle_pagos: DetallePago[];
}