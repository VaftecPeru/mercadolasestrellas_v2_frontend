export interface PersonaConsultada {
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  sexo?: string;
}

export interface ConsultaDniResponse {
  success: boolean;
  fuente: "reniec" | "local";
  data: PersonaConsultada;
}

export interface ContribuyenteConsultado {
  ruc: string;
  razon_social: string;
  estado: string;
  condicion: string;
  direccion?: string;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  ubigeo?: string;
}

export interface ConsultaRucResponse {
  success: boolean;
  fuente: "sunat";
  data: ContribuyenteConsultado;
}
