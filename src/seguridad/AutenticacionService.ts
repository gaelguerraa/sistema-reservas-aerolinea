import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { IUsuarioRepositorio } from "../puertos/IUsuarioRepositorio";
import { ConflictoError, NoAutenticadoError } from "../http/errores/AppError";
import { ConfiguracionJwt } from "./configuracion";
import { Usuario, usuarioPublico } from "./Usuario";

export const EMISOR = "reservas-aerolinea";
export const AUDIENCIA = "clientes-reservas";
export class AutenticacionService {
  constructor(private usuarios: IUsuarioRepositorio, private config: ConfiguracionJwt) {}
  async registrar(nombre: string, email: string, password: string) {
    if (await this.usuarios.buscarPorEmail(email))
      throw new ConflictoError("EMAIL_DUPLICADO", "El correo ya está registrado.");
    const usuario: Usuario = {
      id: randomUUID(), email, passwordHash: await bcrypt.hash(password, 12),
      rol: "CLIENTE", activo: true, pasajeroId: `pas-${randomUUID()}`
    };
    // El rol jamás se toma del cuerpo que manda el cliente.
    await this.usuarios.crearCliente(usuario, nombre);
    return usuarioPublico(usuario);
  }
  async login(email: string, password: string) {
    const u = await this.usuarios.buscarPorEmail(email);
    if (!u || !u.activo || !(await bcrypt.compare(password, u.passwordHash)))
      throw new NoAutenticadoError("Correo o contraseña incorrectos.");
    const accessToken = jwt.sign({}, this.config.secreto, {
      algorithm: "HS256", subject: u.id, issuer: EMISOR, audience: AUDIENCIA,
      expiresIn: this.config.duracionSegundos
    });
    return { accessToken, tokenType: "Bearer", expiresIn: this.config.duracionSegundos, usuario: usuarioPublico(u) };
  }
  async verificar(token: string) {
    let id: string;
    try {
      const p = jwt.verify(token, this.config.secreto, {
        algorithms: ["HS256"], issuer: EMISOR, audience: AUDIENCIA
      });
      if (typeof p === "string" || typeof p.sub !== "string" || typeof p.exp !== "number")
        throw new Error("Credencial sin sujeto o vencimiento");
      id = p.sub;
    } catch { throw new NoAutenticadoError("La credencial no es válida o ya venció."); }
    // El usuario y su rol se releen: no basta con decodificar el token.
    const usuario = await this.usuarios.buscarPorId(id);
    if (!usuario || !usuario.activo) throw new NoAutenticadoError();
    return usuarioPublico(usuario);
  }
  async listarUsuarios() { return (await this.usuarios.listar()).map(usuarioPublico); }
}
