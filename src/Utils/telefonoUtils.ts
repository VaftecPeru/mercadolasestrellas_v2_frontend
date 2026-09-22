// Utilidades para validar/normalizar números de teléfono (Perú, 9 dígitos).


export const esTelefonoValido = (telefono?: string | null): boolean =>
  typeof telefono === "string" && /^\d{9}$/.test(telefono.trim());

export const normalizarTelefono = (telefono?: string | null): string | undefined =>
  esTelefonoValido(telefono) ? (telefono as string).trim() : undefined;
