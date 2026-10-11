import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client";

/** Crea el cliente de Prisma leyendo DATABASE_URL (mysql://usuario:clave@host:puerto/base). */
export function crearPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta la variable DATABASE_URL en el .env");

  const u = new URL(url);
  const adapter = new PrismaMariaDb({
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace("/", ""),
    connectionLimit: 5,
  });
  return new PrismaClient({ adapter });
}