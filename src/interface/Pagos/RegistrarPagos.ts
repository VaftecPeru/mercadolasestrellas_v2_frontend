import type { Dispatch, SetStateAction } from "react";

export interface AgregarProps {
  open: boolean;
  handleClose: () => void;
  pago?: any | null;
}

export interface Socio {
  id_socio: number;
  nombre_completo: string;
}

export interface Puesto {
  id_puesto: number;
  numero_puesto: string;
  block: {
    nombre: string;
  };
}

export interface Deuda {
  id_deuda_cuota: number,
  id_deuda: number;
  total: string;
  por_pagar: string;
  servicio_descripcion: string;
  nombre_servicio: string;
  anio: string;
  mes: string;
  a_cuenta: string;
  deuda: string;
}

export interface Column {
  id: keyof Data | "accion";
  label: string;
  minWidth?: number;
  align?: "center";
}

export interface Data {
  id_deuda: number;
  total: string;
  servicio_descripcion: string;
  anio: string;
  mes: string;
  a_cuenta: string;
  deuda: string;
  pago: string;
}

export interface DeudaPendiente {
  id_deuda_cuota: number,
  id_deuda: number;
  total: string;
  servicio_descripcion: string;
  anio: string;
  mes: string;
  a_cuenta: string;
  deuda: any;
  pago: string;
  checked: boolean;
}

export interface Banco {
  id_banco: number;
  siglas_nombre: string;
}
export interface BancoCuenta {
  id_bancocuenta: number;
  numero_cuenta: string;
}

export interface FormDeuda {
  id_deuda_cuota: number;
  importe: number;
  servicio: string;
}

export interface FormRegistroBase {
  id_socio: string;
  nombre_socio: string;
  nombre_block: string;
  numero_puesto: string;
  deudas: FormDeuda[];
}

export interface FormRegistroBanco extends FormRegistroBase {
  id_banco: string;
  id_bancocuenta: string;
  numero_operacion: string;
  fecha_operacion: string;
}

export interface RegistroPagoCompartido {
  socios: Socio[];
  setSocios: Dispatch<SetStateAction<Socio[]>>;
  puestos: Puesto[];
  setPuestos: Dispatch<SetStateAction<Puesto[]>>;
  idSocioSeleccionado: string;
  setIdSocioSeleccionado: Dispatch<SetStateAction<string>>;
  idPuestoSeleccionado: string;
  setIdPuestoSeleccionado: Dispatch<SetStateAction<string>>;
  valueAC: Socio | null;
  setValueAC: Dispatch<SetStateAction<Socio | null>>;
  deudas: DeudaPendiente[];
  setDeudas: Dispatch<SetStateAction<DeudaPendiente[]>>;
  filasSeleccionadas: { [key: string]: boolean };
  setFilasSeleccionadas: Dispatch<SetStateAction<{ [key: string]: boolean }>>;
  montoPagar: { [key: number]: number };
  setMontoPagar: Dispatch<SetStateAction<{ [key: number]: number }>>;
  totalPagar: number;
  setTotalPagar: Dispatch<SetStateAction<number>>;
  fechaPago: string;
  setFechaPago: Dispatch<SetStateAction<string>>;
  formData: FormRegistroBase;
  setFormData: Dispatch<SetStateAction<FormRegistroBase>>;
  fetchPuestos: (idSocio: string) => Promise<void>;
  fetchDeudaPuesto: (idSocio: string, idPuesto: string) => Promise<void>;
  handleCheckBoxChange: (
    seleccionado: boolean,
    idDeuda: number,
    idDeudaCuota: number,
    servicioDescripcion: string,
    montoPagar: number,
    montoInicial: number
  ) => void;
  actualizarMontoPagar: (idDeudaCuota: number, nuevoMonto: number, montoInicial: number) => void;
  calcularTotalSeleccionado: () => void;
  limpiarCampos: () => void;
  handleCloseModal: () => void;
}