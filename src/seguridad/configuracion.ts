export interface ConfiguracionJwt { secreto: string; duracionSegundos: number; }
export function leerConfiguracionJwt(): ConfiguracionJwt {
  const secreto = process.env.JWT_SECRET ?? "";
  if (Buffer.byteLength(secreto, "utf8") < 32 || secreto.includes("REEMPLAZAR"))
    throw new Error("JWT_SECRET debe ser un secreto propio de al menos 32 bytes.");
  const duracionSegundos = Number(process.env.JWT_TTL_SECONDS ?? 900);
  if (!Number.isInteger(duracionSegundos) || duracionSegundos < 1 || duracionSegundos > 86400)
    throw new Error("JWT_TTL_SECONDS debe estar entre 1 y 86400.");
  return { secreto, duracionSegundos };
}
