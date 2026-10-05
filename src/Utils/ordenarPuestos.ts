interface ConNumeroPuesto {
  numero_puesto?: string | number;
}

// Orden natural (alfabético + numérico): A1, A2, A10, A11, B1, B2 ...
export const ordenarPuestosPorNumero = <T extends ConNumeroPuesto>(puestos: T[]): T[] => {
  return [...puestos].sort((a, b) =>
    String(a.numero_puesto ?? "").localeCompare(String(b.numero_puesto ?? ""), undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
};
