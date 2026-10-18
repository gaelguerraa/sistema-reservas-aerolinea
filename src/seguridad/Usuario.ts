export type Rol = "ADMIN" | "CLIENTE";
export interface Usuario {
  id: string;
  email: string;
  passwordHash: string;
  rol: Rol;
  activo: boolean;
  pasajeroId: string | null;
}
export function usuarioPublico(u: Usuario) {
  return { id: u.id, email: u.email, rol: u.rol, pasajeroId: u.pasajeroId };
}
