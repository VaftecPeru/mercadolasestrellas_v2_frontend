import { Usuario } from "./Usuario";

export interface AuthContextType {
  autenticado: boolean;
  usuario: Usuario | null;
  login: (user: Usuario) => void;
  logout: () => Promise<void>;
  getDataSesion: () => Promise<Usuario | undefined>;
}
