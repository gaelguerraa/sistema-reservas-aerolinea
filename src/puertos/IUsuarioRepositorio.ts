import { Usuario } from "../seguridad/Usuario";
export interface IUsuarioRepositorio {
  buscarPorEmail(email: string): Promise<Usuario | undefined>;
  buscarPorId(id: string): Promise<Usuario | undefined>;
  // El usuario y su pasajero se crean juntos, o no se crea ninguno.
  crearCliente(usuario: Usuario, nombre: string): Promise<void>;
  listar(): Promise<Usuario[]>;
}
