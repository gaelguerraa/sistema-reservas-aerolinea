import { CatalogoService } from "./aplicacion/CatalogoService";
import { Seguridad, seguridadAbierta } from "./http/seguridad";
import { ReservaRepositorioEnMemoria } from "./infraestructura/ReservaRepositorioEnMemoria";
import { ReservaRepositorioPrisma } from "./infraestructura/ReservaRepositorioPrisma";
import { crearPrisma } from "./infraestructura/prisma/cliente";
import { IReservaRepositorio } from "./puertos/IReservaRepositorio";
import { ReservaService } from "./servicios/ReservaService";

export type Persistencia = "memoria" | "mysql";

/** Lee PERSISTENCIA del .env. Si no viene, usa memoria; si trae otro valor, falla en vez de adivinar. */
function leerPersistencia(): Persistencia {
  const valor = process.env.PERSISTENCIA ?? "memoria";
  if (valor !== "memoria" && valor !== "mysql") {
    throw new Error(`PERSISTENCIA debe ser "memoria" o "mysql" (llegó "${valor}").`);
  }
  return valor;
}

/**
 * ÚNICO lugar donde se decide qué implementación del repositorio se usa
 * (variable PERSISTENCIA = "memoria" | "mysql"). El servicio de dominio solo
 * recibe un IReservaRepositorio y no sabe cuál es.
 */
export function crearRepositorio(
  persistencia: Persistencia = leerPersistencia()
): { repositorio: IReservaRepositorio; cerrar: () => Promise<void> } {
  if (persistencia === "mysql") {
    const prisma = crearPrisma();
    return { repositorio: new ReservaRepositorioPrisma(prisma), cerrar: () => prisma.$disconnect() };
  }
  return { repositorio: new ReservaRepositorioEnMemoria(), cerrar: async () => {} };
}

export function crearServicio() {
  const persistencia = leerPersistencia();
  const { repositorio, cerrar } = crearRepositorio(persistencia);
  const servicio = new ReservaService(repositorio);
  const catalogo = new CatalogoService(repositorio, servicio);
  return { persistencia, repositorio, servicio, catalogo, cerrar };
}

/** Todo lo que necesita el servicio HTTP, armado en este único lugar. */
export function crearDependencias() {
  const { persistencia, servicio, catalogo, cerrar } = crearServicio();

  // Autenticación y roles: cambiar seguridadAbierta por la implementación real.
  const seguridad: Seguridad = seguridadAbierta;

  return { persistencia, reservas: servicio, catalogo, seguridad, cerrar };
}

export type Dependencias = ReturnType<typeof crearDependencias>;
