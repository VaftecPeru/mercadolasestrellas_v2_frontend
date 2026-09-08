import { Column } from "../interface/Cuota";

export const columns: readonly Column[] = [
  { id: "fecha_emision", label: "Fecha Emisión", minWidth: 50 },
  { id: "fecha_vencimiento", label: "Fecha Vencimiento", minWidth: 50 },
  { id: "importe", label: "Importe", minWidth: 50 },
  { id: "puestos_asignados", label: "Puestos asignados", minWidth: 50 },
  { id: "servicios", label: "Servicios (Nombre + Costo unitario)", minWidth: 50 },
  { id: "accion", label: "Acción", minWidth: 20 }, // Acciones
];
