import axios from "axios";
import Cookies from "js-cookie";

const apiClient = axios.create({
  // URL de Producción (Para ver todos tus datos reales)
  // baseURL: "https://intranet.mercadolasestrellas.org/api/v1",

  // URL Local (Usa esta para probar el nuevo IMPORTADOR de Excel)
  baseURL: "http://127.0.0.1:8000/api/v1",

  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor de Petición (Request)
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Respuesta (Response)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si error.response no existe, es un error de red (CORS o servidor apagado)
    if (!error.response) {
      console.error("Error de red: Verifica que el backend esté corriendo y CORS configurado.");
    }
    return Promise.reject(error);
  }
);

export default apiClient;