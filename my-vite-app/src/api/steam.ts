const BASE_URL = 'https://steam.tomthurston.dev'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${BASE_URL}${normalizedPath}`
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(buildUrl(path), {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Steam API request failed (${response.status}): ${errorText || response.statusText}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await response.text()
    throw new Error(`Steam API returned a non-JSON response: ${text.slice(0, 200)}`)
  }

  return (await response.json()) as T
}

export function getSteamHealth() {
  return request<{ status?: string; message?: string }>('/health')
}

export function getSteamData<T>(path: string) {
  return request<T>(path)
}

export function postSteamData<T>(path: string, body: unknown, options: RequestOptions = {}) {
  return request<T>(path, {
    ...options,
    method: 'POST',
    body,
  })
}
