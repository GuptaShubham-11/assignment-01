export const BASE_URL = (import.meta.env.VITE_BASE_URL || import.meta.env.PUBLIC_API_URL).replace(/\/+$/, '')

if (!BASE_URL) throw new Error('Missing API URL')

const DEFAULT_TIMEOUT = 30_000

type ResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer'

const ACCEPT: Record<ResponseType, string> = {
  json: 'application/json',
  text: 'text/plain, */*',
  blob: '*/*',
  arrayBuffer: '*/*'
}

// Dev-only identity header; replace with a real token getter.
function getAuthHeader(): string | undefined {
  const { VITE_TENANT_ID: t, VITE_USER_ID: u, VITE_ROLE: r } = import.meta.env
  return t && u && r ? `tenantId=${t}&user=${u}&role=${r}` : undefined
}

export class ApiError extends Error {
  status: number
  body: string
  constructor(status: number, body: string, statusText: string) {
    super(`HTTP ${status}: ${body || statusText}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

export type FetcherOptions = RequestInit & {
  responseType?: ResponseType
  /** ms; 0 disables the timeout */
  timeout?: number
}

async function fetcher<T>(endpoint: string, config: FetcherOptions = {}): Promise<T> {
  const {
    responseType = 'json',
    headers: customHeaders,
    timeout = DEFAULT_TIMEOUT,
    signal: callerSignal,
    ...requestConfig
  } = config

  // AbortSignal.timeout needs no manual cleanup; AbortSignal.any needs
  // Chrome 116+/Safari 17.4+ (fall back to a manual controller if older).
  const timeoutSignal = timeout > 0 ? AbortSignal.timeout(timeout) : undefined
  const signals = [callerSignal, timeoutSignal].filter(Boolean) as AbortSignal[]
  const signal = signals.length ? AbortSignal.any(signals) : undefined

  const url = /^https?:\/\//i.test(endpoint) ? endpoint : `${BASE_URL}/${endpoint.replace(/^\/+/, '')}`

  const headers = new Headers({ Accept: ACCEPT[responseType] })
  const auth = getAuthHeader()
  if (auth) headers.set('Authorization', auth)
  new Headers(customHeaders).forEach((v, k) => headers.set(k, v))

  const body = requestConfig.body
  if (body != null && typeof body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(url, { ...requestConfig, headers, signal })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new ApiError(response.status, text, response.statusText)
    }

    if (response.status === 204 || response.status === 205) {
      return undefined as T
    }

    switch (responseType) {
      case 'text':
        return (await response.text()) as T
      case 'blob':
        return (await response.blob()) as T
      case 'arrayBuffer':
        return (await response.arrayBuffer()) as T
      default:
        return (await response.json()) as T
    }
  } catch (err) {
    if (timeoutSignal?.aborted && !callerSignal?.aborted) {
      throw new Error(`Request timed out after ${timeout}ms`, { cause: err })
    }
    throw err // ApiError, caller aborts, network and parse errors pass through
  }
}

// Strings/FormData/Blob/etc. pass through untouched; plain objects get JSON-encoded.
function encodeBody(body: unknown): BodyInit | undefined {
  if (body == null) return undefined
  if (
    typeof body === 'string' ||
    body instanceof FormData ||
    body instanceof Blob ||
    body instanceof URLSearchParams ||
    body instanceof ArrayBuffer
  )
    return body as BodyInit
  return JSON.stringify(body)
}

type Opts = Omit<FetcherOptions, 'method' | 'body'>

export const get = <T>(url: string, c: Opts = {}) => fetcher<T>(url, { ...c, method: 'GET' })

export const post = <T>(url: string, body?: unknown, c: Opts = {}) =>
  fetcher<T>(url, { ...c, method: 'POST', body: encodeBody(body) })

export const put = <T>(url: string, body?: unknown, c: Opts = {}) =>
  fetcher<T>(url, { ...c, method: 'PUT', body: encodeBody(body) })

export const patch = <T>(url: string, body?: unknown, c: Opts = {}) =>
  fetcher<T>(url, { ...c, method: 'PATCH', body: encodeBody(body) })

export const del = <T>(url: string, c: Opts = {}) => fetcher<T>(url, { ...c, method: 'DELETE' })
