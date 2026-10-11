import { ReservaRepositorioEnMemoria } from "./infraestructura/ReservaRepositorioEnMemoria";
import { ReservaRepositorioPrisma } from "./infraestructura/ReservaRepositorioPrisma";
import { crearPrisma } from "./infraestructura/prisma/cliente";
import { IReservaRepositorio } from "./puertos/IReservaRepositorio";
import { ReservaService } from "./servicios/ReservaService";

/**
 * ÚNICO lugar donde se decide qué implementación del repositorio se usa
 * (variable PERSISTENCIA = "memoria" | "mysql"). El servicio de dominio solo
 * recibe un IReservaRepositorio y no sabe cuál es.
 */
export function crearRepositorio(): { repositorio: IReservaRepositorio; cerrar: () => Promise<void> } {
  if (process.env.PERSISTENCIA === "mysql") {
    const prisma = crearPrisma();
    return { repositorio: new ReservaRepositorioPrisma(prisma), cerrar: () => prisma.$disconnect() };
  }
  return { repositorio: new ReservaRepositorioEnMemoria(), cerrar: async () => {} };
}

export function crearServicio() {
  const { repositorio, cerrar } = crearRepositorio();
  return { repositorio, servicio: new ReservaService(repositorio), cerrar };
}