/**
 * 格式化工具函数
 */

/**
 * 将值转换为字符串（用于 JSON 序列化）
 */
export function stringifyResult(value: unknown): string {
  if (value === undefined || value === null) return 'null'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/**
 * 截断文本
 */
export function truncate(text: string, max = 1000): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/**
 * 格式化时长（秒 -> MM:SS）
 */
export function formatDuration(seconds: number): string {
  const mm = Math.floor(seconds / 60)
  const ss = seconds % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

