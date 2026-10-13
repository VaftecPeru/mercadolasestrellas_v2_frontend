interface ConSocioAsignado {
  id_socio?: number | string | null;
}

// El id_socio es el criterio autoritativo: el nombre no es único (pueden existir homónimos).
export const puestoPerteneceASocio = (puesto: ConSocioAsignado, idSocio: number | string): boolean =>
  Boolean(puesto.id_socio) && Number(puesto.id_socio) === Number(idSocio);

// Socio propietario de un puesto, identificado por id_socio.
export const buscarSocioDelPuesto = <S extends { id_socio: number | string }>(
  socios: S[],
  puesto: ConSocioAsignado
): S | undefined =>
  puesto.id_socio ? socios.find((s) => Number(s.id_socio) === Number(puesto.id_socio)) : undefined;
