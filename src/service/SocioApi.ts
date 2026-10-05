
export const Api_Global_Socios = {
  socios: {
    fetch: (page: number, nombreSocio: string, numeroPuesto: string, estado: string = "todos") =>
      `/socios?page=${page}&nombre_socio=${nombreSocio}&numero_puesto=${numeroPuesto}${estado && estado !== "todos" ? `&estado=${estado}` : ""}`,
    exportar: () => `/socios/exportar`,
    eliminar: (id_socio: number) => `/socios/${id_socio}`, 
    registrar:()=> `/socios`,
    editar: (id_socio: number | undefined) => `/socios/${id_socio}`, 
    buscar:(page: number, per_page: number) => `/socios?page=${page}&per_page=${per_page}`,
    buscarActivos:(page: number, per_page: number) => `/socios?page=${page}&per_page=${per_page}&estado=1`,
    seleccionar: () => `/socios/seleccionar`,
    toggleAcceso: (id_socio: number) => `/socios/${id_socio}/toggle-acceso`,
    regenerarCredenciales: (id_socio: number) => `/socios/${id_socio}/regenerar-credenciales`,
    activar: (id_socio: number) => `/socios/${id_socio}/activar`,
    desactivar: (id_socio: number) => `/socios/${id_socio}/desactivar`,
  },
  bloques:{
    obtenerBloques:()=> `/blocks`,
  },
  puestos:{
    obtenerPuestos:(id_block: number)=> `/puestos/sin-socio?id_block=${id_block}`,
  }
};
