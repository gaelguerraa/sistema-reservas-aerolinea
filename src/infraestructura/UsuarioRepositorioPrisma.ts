import { PrismaClient } from "../generated/prisma/client";
import { IUsuarioRepositorio } from "../puertos/IUsuarioRepositorio";
import { Usuario } from "../seguridad/Usuario";

export class UsuarioRepositorioPrisma implements IUsuarioRepositorio {
  constructor(private prisma: PrismaClient) {}
  async buscarPorEmail(email: string): Promise<Usuario | undefined> {
    return (await this.prisma.usuario.findUnique({ where: { email } })) ?? undefined;
  }
  async buscarPorId(id: string): Promise<Usuario | undefined> {
    return (await this.prisma.usuario.findUnique({ where: { id } })) ?? undefined;
  }
  async crearCliente(u: Usuario, nombre: string) {
    await this.prisma.$transaction(async tx => {
      await tx.pasajero.create({ data: { id: u.pasajeroId!, nombre, contacto: u.email } });
      await tx.usuario.create({ data: u });
    });
  }
  async listar(): Promise<Usuario[]> { return this.prisma.usuario.findMany(); }
}
