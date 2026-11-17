import { api } from '../../shared/http/client'
import type { LoginBody, LoginRespuesta, Usuario } from '../../shared/types/api'

export const authApi = {
  login: (body: LoginBody) => api.post<LoginRespuesta>('/auth/login', body, { skipAuth: true }),
  me: (signal?: AbortSignal) => api.get<Usuario>('/auth/me', { signal }),
}
