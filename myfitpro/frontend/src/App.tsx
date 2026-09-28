export type User = {
  id: number
  name: string
  email: string
  role: 'academy' | 'trainer' | 'student'
  created_at: string
}

export type Student = {
  id: number
  trainer_id: number
  name: string
  email: string
  goal: string
  active: boolean
  birth_date?: string | null
  weight?: number | null
  height?: number | null
  created_at: string
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers })
  const text = await response.text()

  if (!response.ok) {
    try {
      const payload = JSON.parse(text)
      throw new Error(payload.detail ?? 'Erro na API')
    } catch {
      throw new Error('Erro na API')
    }
  }

  return text ? (JSON.parse(text) as T) : (undefined as T)
}

export async function login(email: string, password: string) {
  const body = new URLSearchParams({ username: email, password })
  const response = await fetch(`${API_URL}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    throw new Error('E-mail ou senha incorretos')
  }

  return response.json() as Promise<{ access_token: string; token_type: string }>
}

export const getMe = (token: string) => request<User>('/api/v1/me', {}, token)
export const getStudents = (token: string) => request<Student[]>('/api/v1/students', {}, token)
export const createStudent = (token: string, data: Pick<Student, 'name' | 'email' | 'goal'>) =>
  request<Student>('/api/v1/students', { method: 'POST', body: JSON.stringify(data) }, token)
