/**
 * 智能点单类型定义
 */

// ========== 商品相关类型 ==========

/** 商品属性（辣度、葱花、香菜等） */
export interface ItemAttributes {
  spicy?: '不辣' | '微辣' | '中辣' | '重辣'
  scallion?: boolean
  coriander?: boolean
}

/** 商品基础信息 */
export interface MenuItem {
  name: string
  price: number
  qty: number
  img?: string
  attrs?: ItemAttributes
}

/** 订单商品（用于显示） */
export interface OrderItem extends MenuItem {
  unit_price: number
}

// ========== 订单相关类型 ==========

/** 订单信息 */
export interface Order {
  store: string
  items: OrderItem[]
}

// ========== 分类相关类型 ==========

/** 商品分类 */
export type CategoryType = 'new' | 'popular' | 'regular' | 'regional'

/** 商品目录 */
export interface Catalog {
  [key: string]: {
    store: string
    items: MenuItem[]
  }
}

// ========== AI 响应相关类型 ==========

/** AI 回复内容 */
export interface AIReply {
  title?: string
  intro_html?: string
  praise?: string
  text?: string
}

/** 产品推荐响应 */
export interface ProductRecommendation {
  type: 'product_recommendation'
  version: string
  intent: string
  scenario_tags: string[]
  reply: AIReply
  order: Order
  suggested_chips: string[]
}

/** 普通对话响应 */
export interface GeneralChat {
  type: 'general_chat'
  reply: {
    text: string
  }
}

/** AI 响应类型 */
export type AIResponse = ProductRecommendation | GeneralChat

// ========== 聊天相关类型 ==========

/** 消息角色 */
export type MessageRole = 'user' | 'assistant'

/** 聊天消息 */
export interface ChatMessage {
  role: MessageRole
  content: string
  data?: any
}

/** 聊天历史记录 */
export interface ChatHistory {
  role: MessageRole
  data: any
}

// ========== 用户相关类型 ==========

/** 历史订单 */
export interface HistoryOrder {
  date: string
  items: Array<{
    name: string
    qty: number
    price: number
    attrs: ItemAttributes
  }>
  total: number
}

// ========== 页面状态类型 ==========

/** 页面类型 */
export type PageType = 'home' | 'ai' | 'chat' | 'checkout' | 'user'

/** 输入模式 */
export type InputMode = 'voice' | 'keyboard'

// ========== API 相关类型 ==========

/** DashScope API 请求参数 */
export interface DashScopeParameters {
  result_format: string
  top_p: number
  top_k: number
  seed: number
  repetition_penalty: number
  max_tokens: number
  think_content: boolean
}

/** DashScope API 请求 */
export interface DashScopeRequest {
  model: string
  input: {
    messages: Array<{
      role: string
      content: string
    }>
  }
  parameters: DashScopeParameters
}

/** DashScope API 响应 */
export interface DashScopeResponse {
  output: {
    choices: Array<{
      message: {
        content: string
      }
    }>
  }
}

// ========== 候选池类型 ==========

/** 候选商品池 */
export interface CandidatePool {
  store: string
  categories: {
    [key: string]: Array<{
      name: string
      price: number
      img?: string
    }>
  }
}

