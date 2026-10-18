import { CatalogoService } from "./aplicacion/CatalogoService";
import { crearSeguridad } from "./http/seguridad";
import { ReservaRepositorioEnMemoria } from "./infraestructura/ReservaRepositorioEnMemoria";
import { ReservaRepositorioPrisma } from "./infraestructura/ReservaRepositorioPrisma";
import { UsuarioRepositorioEnMemoria } from "./infraestructura/UsuarioRepositorioEnMemoria";
import { UsuarioRepositorioPrisma } from "./infraestructura/UsuarioRepositorioPrisma";
import { crearPrisma } from "./infraestructura/prisma/cliente";
import { ReservaService } from "./servicios/ReservaService";
import { AutenticacionService } from "./seguridad/AutenticacionService";
import { leerConfiguracionJwt } from "./seguridad/configuracion";
export type Persistencia = "memoria" | "mysql";
function leerPersistencia(): Persistencia {
  const valor = process.env.PERSISTENCIA ?? "memoria";
  if (valor !== "memoria" && valor !== "mysql") throw new Error("PERSISTENCIA debe ser memoria o mysql.");
  return valor;
}
export function crearRepositorio(persistencia: Persistencia = leerPersistencia()) {
  if (persistencia === "mysql") {
    const prisma = crearPrisma();
    return { repositorio: new ReservaRepositorioPrisma(prisma), usuarios: new UsuarioRepositorioPrisma(prisma), cerrar: () => prisma.$disconnect() };
  }
  const repositorio = new ReservaRepositorioEnMemoria();
  return { repositorio, usuarios: new UsuarioRepositorioEnMemoria(repositorio), cerrar: async () => {} };
}
export function crearServicio() {
  const persistencia = leerPersistencia();
  const { repositorio, usuarios, cerrar } = crearRepositorio(persistencia);
  const servicio = new ReservaService(repositorio);
  return { persistencia, repositorio, usuarios, servicio, catalogo: new CatalogoService(repositorio, servicio), cerrar };
}
export function crearDependencias() {
  const config = leerConfiguracionJwt();
  const { persistencia, servicio, usuarios, catalogo, cerrar } = crearServicio();
  const auth = new AutenticacionService(usuarios, config);
  return { persistencia, reservas: servicio, catalogo, auth, seguridad: crearSeguridad(auth), cerrar };
}
export type Dependencias = ReturnType<typeof crearDependencias>;
