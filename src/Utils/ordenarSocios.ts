interface ConNombreCompleto {
  nombre_completo?: string;
}

// Orden alfabético de socios por nombre completo
export const ordenarSociosPorNombre = <T extends ConNombreCompleto>(socios: T[]): T[] => {
  return [...socios].sort((a, b) =>
    String(a.nombre_completo ?? "").localeCompare(String(b.nombre_completo ?? ""), undefined, {
      sensitivity: "base",
    })
  );
};
