/**
 * API 客户端
 * 封装所有 API 调用，提供统一的错误处理和类型支持
 */

export interface ApiError {
  detail?: string
  errorMessage?: string
  message?: string
}

/**
 * 获取 API 基础地址
 * 优先级：环境变量 > 相对路径（开发环境）
 */
function getApiBaseUrl(): string {
  // 如果配置了环境变量，使用环境变量
  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl) {
    return envUrl
  }
  
  // 开发环境使用相对路径（通过 Vite 代理）
  // 生产环境如果使用 Cloudflare Workers 代理，也使用相对路径
  return ''
}

/**
 * 构建完整的 API 地址
 */
export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl()
  // 如果 endpoint 已经是完整 URL，直接返回
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint
  }
  // 确保 endpoint 以 / 开头
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return baseUrl ? `${baseUrl}${normalizedEndpoint}` : normalizedEndpoint
}

/**
 * 通用 API 请求函数
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const fullUrl = buildApiUrl(endpoint)
  console.log('🌐 发起HTTP请求:', fullUrl, options.method || 'GET')
  const response = await fetch(fullUrl, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  console.log('📡 HTTP响应状态:', response.status, response.statusText)

  // 尝试解析 JSON，如果失败则返回文本错误
  let data: unknown
  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')

  try {
    if (isJson) {
      data = await response.json()
    } else {
      const text = await response.text()
      // 如果不是 JSON，尝试解析为错误对象
      data = { detail: text || `HTTP ${response.status} ${response.statusText}` }
    }
  } catch (parseError) {
    // JSON 解析失败，返回通用错误
    const text = await response.text().catch(() => '')
    data = {
      detail: text || `HTTP ${response.status} ${response.statusText}`,
    }
  }

  if (!response.ok) {
    const error: ApiError = data as ApiError
    throw new Error(
      error.detail || error.errorMessage || error.message || `请求失败 (${response.status})`
    )
  }

  return data as T
}

/**
 * GET 请求
 */
export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET' })
}

/**
 * POST 请求（JSON）
 */
export async function apiPost<T>(
  endpoint: string,
  body: unknown
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * POST 请求（FormData，用于文件上传）
 */
export async function apiPostFormData<T>(
  endpoint: string,
  formData: FormData
): Promise<T> {
  const fullUrl = buildApiUrl(endpoint)
  const response = await fetch(fullUrl, {
    method: 'POST',
    body: formData,
  })

  // 尝试解析 JSON，如果失败则返回文本错误
  let data: unknown
  const contentType = response.headers.get('content-type')
  const isJson = contentType?.includes('application/json')

  try {
    if (isJson) {
      data = await response.json()
    } else {
      const text = await response.text()
      data = { detail: text || `HTTP ${response.status} ${response.statusText}` }
    }
  } catch (parseError) {
    // JSON 解析失败，返回通用错误
    const text = await response.text().catch(() => '')
    data = {
      detail: text || `HTTP ${response.status} ${response.statusText}`,
    }
  }

  if (!response.ok) {
    const error: ApiError = data as ApiError
    throw new Error(
      error.detail || error.errorMessage || error.message || `请求失败 (${response.status})`
    )
  }

  return data as T
}

