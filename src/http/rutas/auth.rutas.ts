import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { AutenticacionService } from "../../seguridad/AutenticacionService";
import { asyncHandler } from "../asyncHandler";
import { enviarCreado, enviarError, enviarOk } from "../respuestas";
import { validar } from "../middlewares/validar";
import { registroBody, loginBody } from "../validacion/esquemas";
import { Seguridad } from "../seguridad";

export function rutasAuth(auth: AutenticacionService, seguridad: Seguridad) {
  const r = Router();
  const limite = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false,
    handler: (_req, res) => enviarError(res, 429, "DEMASIADOS_INTENTOS", "Espera unos minutos antes de intentarlo de nuevo.") });
  r.post("/registro", limite, validar({ body: registroBody }), asyncHandler(async (_req, res) => {
    const { nombre, email, password } = res.locals.validado.body;
    enviarCreado(res, await auth.registrar(nombre, email, password));
  }));
  r.post("/login", limite, validar({ body: loginBody }), asyncHandler(async (_req, res) => {
    const { email, password } = res.locals.validado.body;
    enviarOk(res, await auth.login(email, password));
  }));
  r.get("/me", seguridad.autenticar, (_req, res) => enviarOk(res, res.locals.usuario));
  return r;
}
