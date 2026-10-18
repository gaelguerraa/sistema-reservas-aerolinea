import { Pasajero } from "../entities/Pasajero";
import { IReservaRepositorio } from "../puertos/IReservaRepositorio";
import { IUsuarioRepositorio } from "../puertos/IUsuarioRepositorio";
import { Usuario } from "../seguridad/Usuario";
import { ConflictoError } from "../http/errores/AppError";

export class UsuarioRepositorioEnMemoria implements IUsuarioRepositorio {
  private usuarios = new Map<string, Usuario>();
  constructor(private reservas: IReservaRepositorio, iniciales: Usuario[] = []) {
    for (const u of iniciales) this.usuarios.set(u.id, { ...u });
  }
  async buscarPorEmail(email: string) {
    const u = [...this.usuarios.values()].find(u => u.email === email);
    return u ? { ...u } : undefined;
  }
  async buscarPorId(id: string) {
    const u = this.usuarios.get(id);
    return u ? { ...u } : undefined;
  }
  async crearCliente(u: Usuario, nombre: string) {
    // Se reserva el email antes del primer await para evitar duplicados concurrentes.
    if ([...this.usuarios.values()].some(x => x.email === u.email))
      throw new ConflictoError("EMAIL_DUPLICADO", "El correo ya está registrado.");
    this.usuarios.set(u.id, { ...u });
    try {
      await this.reservas.guardarPasajero(new Pasajero(u.pasajeroId!, nombre, u.email));
    } catch (error) { this.usuarios.delete(u.id); throw error; }
  }
  async listar() { return [...this.usuarios.values()].map(u => ({ ...u })); }
}
