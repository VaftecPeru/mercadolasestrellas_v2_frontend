export const Api_Global_ConsultaDocumento = {
  consultas: {
    dni: (numero: string) => `/consultas/dni/${numero}`,
    ruc: (numero: string) => `/consultas/ruc/${numero}`,
  },
};
