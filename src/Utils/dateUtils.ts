export const formatDate = (fecha: string | null | undefined): string => {
  // retornar un texto por defecto
  if (!fecha || fecha === "null" || fecha === "undefined") {
    return "Sin registro";
  }

  const fechaObj = new Date(fecha);
  
  // si la fecha es válida
  if (isNaN(fechaObj.getTime())) {
    return "Fecha inválida";
  }

  const dia = fechaObj.getDate();
  const mes = fechaObj.getMonth() + 1;
  const año = fechaObj.getFullYear();

  const diaFormateado = dia.toString().padStart(2, "0");
  const mesFormateado = mes.toString().padStart(2, "0");

  return `${diaFormateado}/${mesFormateado}/${año}`;
};

export const reFormatDate = (fecha: string) => {
  const [dia, mes, anio] = fecha.split("/");
  return `${anio}-${mes}-${dia}`;
};

export const nombreMes = (mes: number) => {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", 
    "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return meses[mes];
}