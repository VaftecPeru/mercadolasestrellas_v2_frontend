import axios from "axios";
import Cookies from "js-cookie";

const API_URL = (
  process.env.REACT_APP_API_URL ||
  "https://intranet.mercadolasestrellas.org/api/v1"
).replace(/\/+$/, "");

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.error("Error de red: verifica la URL del backend, conectividad y CORS.");
    }
    return Promise.reject(error);
  }
);

export default apiClient;
