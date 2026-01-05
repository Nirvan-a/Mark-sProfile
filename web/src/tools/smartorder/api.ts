/**
 * 智能点单 API 调用模块
 */

import { apiPost } from '../../shared/api/client'
import type {
  DashScopeRequest,
  DashScopeResponse,
  AIResponse,
} from './types'

// ========== API 配置 ==========

const PROXY_URL = '/api/smartorder/recommend'
const DASHSCOPE_MODEL = 'qwen-plus'

const DASH_PARAMETERS = {
  result_format: 'message',
  top_p: 0.8,
  top_k: 0,
  seed: 1234,
  repetition_penalty: 1.1,
  max_tokens: 16000,
  think_content: false,
}

// ========== API 调用函数 ==========

/**
 * 调用 DashScope API（通过后端代理）
 */
export async function callDashscope(
  messages: Array<{ role: string; content: string }>
): Promise<DashScopeResponse> {
  const payload: DashScopeRequest = {
    model: DASHSCOPE_MODEL,
    input: { messages },
    parameters: DASH_PARAMETERS,
  }

  try {
    console.log('🔗 准备发送请求到:', PROXY_URL)
    console.log('📦 请求载荷:', JSON.stringify(payload, null, 2))
    const result = await apiPost<DashScopeResponse>(PROXY_URL, payload)
    console.log('✅ API调用成功:', result)
    return result
  } catch (error) {
    console.error('❌ API调用失败:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new Error(`API 请求失败: ${errorMessage}`)
  }
}

/**
 * 从响应中提取 AI 内容
 */
export function extractAssistantContent(response: DashScopeResponse): string {
  const output = response?.output
  const choices = output?.choices
  const message = choices?.[0]?.message
  const content = message?.content

  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((seg: any) => seg?.text || seg?.content || '')
      .join('')
  }

  if (output && typeof (output as any).text === 'string') {
    return (output as any).text
  }

  throw new Error('无法解析模型返回 content')
}

/**
 * 安全解析 JSON
 */
export function safeParseJSON<T = AIResponse>(str: string): T | null {
  try {
    return JSON.parse(str) as T
  } catch (e) {
    return null
  }
}

/**
 * 格式化货币
 */
export function formatCurrency(amount: number): string {
  return '¥' + amount.toFixed(1).replace(/\.0$/, '.0')
}

/**
 * 计算总金额
 */
export function calculateTotal(items: Array<{ unit_price: number; qty: number }>): number {
  return items.reduce((total, item) => total + item.unit_price * item.qty, 0)
}

/**
 * 计算总数量
 */
export function calculateCount(items: Array<{ qty: number }>): number {
  return items.reduce((total, item) => total + item.qty, 0)
}

