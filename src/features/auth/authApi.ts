import { api } from '../../shared/http/client'
import { tokenStorage } from '../../shared/http/tokenStorage'
import type { LoginBody, LoginRespuesta, RegistroBody, Usuario } from '../../shared/types/api'

export const authApi = {
  /** Guarda el token; desde ese momento el interceptor lo envía solo. */
  async login(body: LoginBody, signal?: AbortSignal): Promise<LoginRespuesta> {
    const sesion = await api.post<LoginRespuesta>('/auth/login', body, { skipAuth: true, signal })
    tokenStorage.set(sesion.accessToken)
    return sesion
  },
  registro(body: RegistroBody, signal?: AbortSignal): Promise<Usuario> {
    return api.post<Usuario>('/auth/registro', body, { skipAuth: true, signal })
  },
  /** Para restaurar la sesión al recargar. */
  me(signal?: AbortSignal): Promise<Usuario> {
    return api.get<Usuario>('/auth/me', { signal })
  },
  logout(): void {
    tokenStorage.clear()
  },
}