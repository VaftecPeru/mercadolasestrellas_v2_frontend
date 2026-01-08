export interface Pagos {
  id_pago: string;
  puesto: string;
  socio: string;
  dni: string;
  telefono: string;
  correo: string;
  total_pago: string;
  total_deuda: string;
  id_socio: string;
  pago_banco?: any;
  fecha_registro: string;
  serie_numero: string;
}

export interface AgregarProps {
  open: boolean;
  handleClose: () => void;
  pago?: Data | null;
}

export interface Column {
  id: keyof Data | "accion";
  label: string;
  minWidth?: number;
  align?: "center";
}

export interface Data {
  id_pago: string;
  puesto: string;
  socio: string;
  dni: string;
  telefono: string;
  correo: string;
  total_pago: string;
  total_deuda: string;
  id_socio: string;
  pago_banco?: any;
  fecha_registro: string;
  serie_numero: string;
}