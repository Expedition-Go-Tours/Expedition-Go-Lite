import { getAuthToken, getApiBaseUrl } from './auth'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getApiBaseUrl()
  const token = await getAuthToken()

  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string>),
    },
  })

  const payload = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(payload.message || `Request failed (${res.status})`, res.status)
  }

  return payload.data ?? payload
}
