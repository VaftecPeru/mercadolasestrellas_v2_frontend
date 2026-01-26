export const Api_Global_Pagos = {
  pagos: {
    listar: (page: number = 1) => `/pagos?page=${page}`,
    exportar: () => `/pagos/exportar`,
    registrar: () => `/pagos`,
    registrarPorBanco: () => `/pagos/por-bancos`,
    editar: (id_pago: string | number | undefined) => `/pagos/${id_pago}`,
    eliminar: (id_pago: string | number | undefined) => `/pagos/${id_pago}`,
    importar: () => `/procesar-importacion-pagos`,
  },
  socios: {
    listar: (perPage: number = 1000) => `/socios?per_page=${perPage}`,
  },
  puestos: {
    listarPorSocio: (idSocio: number | string, perPage: number = 50) =>
      `/puestos?per_page=${perPage}&id_socio=${idSocio}`,
  },
  cuotas: {
    pendientesPorPuesto: (
      idSocio: number | string,
      idPuesto: number | string,
      perPage: number = 50
      // ) =>`/cuotas/pendientes?per_page=${perPage}&id_socio=${idSocio}&id_puesto=${idPuesto}`,
    ) => `/deudas/pendientes?per_page=${perPage}&id_socio=${idSocio}&id_puesto=${idPuesto}`,
  },
};
