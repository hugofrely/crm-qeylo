import Cookies from "js-cookie"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"

interface FetchOptions extends RequestInit {
  json?: unknown
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { json, headers: customHeaders, ...rest } = options
  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  }

  const token = Cookies.get("access_token")
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  if (json) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers,
    body: json ? JSON.stringify(json) : rest.body,
  })

  if (response.status === 401) {
    const refreshed = await refreshToken()
    if (refreshed) {
      headers.Authorization = `Bearer ${Cookies.get("access_token")}`
      const retryResponse = await fetch(`${API_URL}${path}`, {
        ...rest,
        headers,
        body: json ? JSON.stringify(json) : rest.body,
      })
      if (!retryResponse.ok)
        throw new Error(`API error: ${retryResponse.status}`)
      if (retryResponse.status === 204) return undefined as T
      return retryResponse.json()
    }
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(JSON.stringify(error))
  }

  if (response.status === 204) return undefined as T
  return response.json()
}

export async function refreshToken(): Promise<boolean> {
  const refresh = Cookies.get("refresh_token")
  if (!refresh) return false
  try {
    const response = await fetch(`${API_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    })
    if (!response.ok) return false
    const data = await response.json()
    Cookies.set("access_token", data.access, { expires: 1 / 24 })
    return true
  } catch {
    return false
  }
}

export function setTokens(access: string, refresh: string) {
  Cookies.set("access_token", access, { expires: 1 / 24 })
  Cookies.set("refresh_token", refresh, { expires: 7 })
}

export function clearTokens() {
  Cookies.remove("access_token")
  Cookies.remove("refresh_token")
}

export async function apiUploadImage(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("file", file)

  const token = Cookies.get("access_token")
  const res = await fetch(`${API_URL}/upload/image/`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })

  if (res.status === 401) {
    const refreshed = await refreshToken()
    if (refreshed) {
      const retryRes = await fetch(`${API_URL}/upload/image/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${Cookies.get("access_token")}` },
        body: formData,
      })
      if (!retryRes.ok) {
        const err = await retryRes.json().catch(() => ({}))
        throw new Error(err.detail || "Upload failed")
      }
      const data = await retryRes.json()
      return data.url
    }
    throw new Error("Unauthorized")
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || "Upload failed")
  }

  const data = await res.json()
  return data.url
}
