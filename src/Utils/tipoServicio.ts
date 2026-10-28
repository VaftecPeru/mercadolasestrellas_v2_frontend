export const getNombreTipoServicio = (tipo?: string | number | null): string => {
  if (tipo === undefined || tipo === null || tipo === "") return "-";
  const num = Number(tipo);
  switch (num) {
    case 1:
      return "Ordinario";
    case 2:
      return "Extraordinario";
    case 3:
      return "Por metro cuadrado";
    case 4:
      return "Cuota Extraordinaria";
    default:
      return typeof tipo === "string" ? tipo : "-";
  }
};
