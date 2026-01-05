/**
 * 智能报告工具 API
 * 封装该工具的所有 API 调用
 */

import { apiPost, apiGet, apiPostFormData } from '../../shared/api/client'

// ===== 知识库管理 API =====

export interface UploadDocumentResponse {
  doc_id: string
  filename: string
  chunks: number
  path: string
}

export interface ListDocumentsResponse {
  documents: Array<{
    doc_id: string
    filename: string
    chunks: number
    path: string
  }>
}

/**
 * 上传文档到知识库
 */
export async function uploadDocument(
  file: File
): Promise<UploadDocumentResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return apiPostFormData<UploadDocumentResponse>(
    '/api/smartreport/knowledge-base/upload',
    formData
  )
}

/**
 * 列出知识库中的所有文档
 */
export async function listDocuments(): Promise<ListDocumentsResponse> {
  return apiGet<ListDocumentsResponse>('/api/smartreport/knowledge-base/list')
}

/**
 * 清空知识库
 */
export async function clearKnowledgeBase(): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/api/smartreport/knowledge-base/clear', {})
}

export interface DeleteDocumentRequest {
  doc_id: string
}

/**
 * 删除文档
 */
export async function deleteDocument(request: DeleteDocumentRequest): Promise<{ message: string }> {
  return apiPost<{ message: string }>('/api/smartreport/knowledge-base/delete', request)
}

export interface ChunkInfo {
  chunk_id: string
  content: string
  source: string
  filename: string
  metadata: Record<string, any>
}

export interface ListChunksResponse {
  chunks: ChunkInfo[]
  total: number
}

/**
 * 列出所有片段
 */
export async function listChunks(): Promise<ListChunksResponse> {
  return apiGet<ListChunksResponse>('/api/smartreport/knowledge-base/chunks')
}

// ===== 知识库检索 API =====

export interface SearchRequest {
  query: string
  k?: number
}

export interface SearchResult {
  content: string
  source: string
  filename: string
  relevance: number
  score: number
}

export interface SearchResponse {
  results: SearchResult[]
  query: string
  total: number
}

export interface InitializeKnowledgeBaseRequest {
  force_rebuild?: boolean
}

export interface InitializeKnowledgeBaseResponse {
  message: string
  documents_loaded: number  // 原始文件数量
  chunks_loaded?: number    // 文档片段数量
  documents_dir: string
  errors?: string[]
}

/**
 * 检索知识库
 */
export async function searchKnowledgeBase(
  request: SearchRequest
): Promise<SearchResponse> {
  return apiPost<SearchResponse>('/api/smartreport/knowledge-base/search', request)
}

/**
 * 初始化知识库（从 documents 目录加载文档）
 */
export async function initializeKnowledgeBase(
  request: InitializeKnowledgeBaseRequest = {}
): Promise<InitializeKnowledgeBaseResponse> {
  return apiPost<InitializeKnowledgeBaseResponse>(
    '/api/smartreport/knowledge-base/initialize',
    request
  )
}

// ===== 联网检索 API =====

export interface WebSearchRequest {
  query: string
  k?: number
}

export interface WebSearchResult {
  title: string
  content: string
  url: string
  source: string
}

export interface WebSearchResponse {
  results: WebSearchResult[]
  query: string
  total: number
}

/**
 * 联网检索（使用 Tavily API）
 */
export async function webSearch(
  request: WebSearchRequest
): Promise<WebSearchResponse> {
  return apiPost<WebSearchResponse>('/api/smartreport/web-search/search', request)
}

// ===== Deep Research 工作流 API =====

export interface DeepResearchRequest {
  requirement: string
  task_id?: string
  outline?: DeepResearchOutline
}

export interface CancelDeepResearchRequest {
  task_id: string
}

export interface DeepResearchSection {
  level1_title: string
  level2_titles: string[]  // 改为二级标题列表
  index: number
  section_id: string
}

export interface DeepResearchOutline {
  title: string
  sections: Array<{
    level1_title: string
    level2_titles: string[]
  }>
  estimated_words: number
  outline_markdown: string
}

export interface DeepResearchWrittenSection {
  level1_title: string
  level2_titles: string[]  // 改为二级标题列表
  content: string
  section_id: string
  citations?: Citation[]
}

export interface DeepResearchResponse {
  task_id: string
  outline: DeepResearchOutline
  sections: DeepResearchSection[]
  all_written_sections: DeepResearchWrittenSection[]
  is_complete: boolean
}

/**
 * 流式事件类型
 */
export interface DeepResearchStreamEvent {
  type: 'node_start' | 'node_end' | 'state_update' | 'step_progress' | 'error' | 'complete'
  node?: string
  task_id?: string
  timestamp?: number  // 后端时间戳（毫秒）
  // 步骤进度字段（当 type='step_progress' 时）
  step?: number  // 当前步骤（1-based）
  total?: number  // 总步骤数
  message?: string  // 步骤描述消息
  // 步骤数据字段（当 type='step_progress' 时的额外数据）
  data?: {
    search_queries?: string[]  // 检索问句
    retrieval_results?: Array<{  // 检索结果
      source: string
      title: string
      url: string
      snippet: string
    }>
    filtered_results?: Array<{  // 筛选结果
      source: string
      title: string
      url: string
      snippet: string
    }>
    history_sections?: string[]  // 历史章节标题
    is_additional_retrieval?: boolean  // 是否为额外检索
    additional_search_queries?: string[]  // 额外检索问句
    additional_retrieval_results?: Array<{  // 额外检索结果
      source: string
      title: string
      url: string
      snippet: string
    }>
    additional_filtered_results?: Array<{  // 额外筛选结果
      source: string
      title: string
      url: string
      snippet: string
    }>
  }
  // 节点状态字段（当 type='node_start' | 'node_end' | 'state_update' 时）
  state?: {
    task_id?: string
    current_section_index?: number
    outline?: DeepResearchOutline
    sections?: DeepResearchSection[]
    all_written_sections?: DeepResearchWrittenSection[]
    is_complete?: boolean
    current_section?: DeepResearchSection
    search_results?: any[]
    history_sections?: string[]
    info_sufficiency_evaluation?: {
      sufficient: boolean
      missing_points?: string[]
    }
    written_content?: string  // 写作内容（用于字数统计）
    sections?: DeepResearchSection[]  // 所有章节列表（用于索引计算）
  }
  error?: string
}

/**
 * 运行 Deep Research 工作流（流式）
 * 使用 fetch 读取 Server-Sent Events 流
 */
export function runDeepResearchStream(
  request: DeepResearchRequest,
  onEvent: (event: DeepResearchStreamEvent) => void,
  onError?: (error: Error) => void,
  onComplete?: () => void
): () => void {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001'
  const url = `${baseUrl}/api/smartreport/deep-research/run`

  const controller = new AbortController()
  
  // 使用 fetch 来发送 POST 请求并读取 SSE 流
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, ${errorText}`)
      }
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        throw new Error('Response body is not readable')
      }
      
      let buffer = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim() // 移除 "data: " 前缀并去除空白
            if (!data) continue
            
            try {
              const event: DeepResearchStreamEvent = JSON.parse(data)
              onEvent(event)
              
              if (event.type === 'complete') {
                onComplete?.()
                return
              } else if (event.type === 'error') {
                onError?.(new Error(event.error || 'Unknown error'))
                return
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e, data)
            }
          }
        }
      }
      
      // 处理剩余的 buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim()
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6).trim()
          if (data) {
            try {
              const event: DeepResearchStreamEvent = JSON.parse(data)
              onEvent(event)
              
              if (event.type === 'complete') {
                onComplete?.()
                return
              }
            } catch (e) {
              console.error('Failed to parse final SSE event:', e, data)
            }
          }
        }
      }
      
      onComplete?.()
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError?.(error)
      }
    })
  
  // 返回取消函数
  return () => {
    controller.abort()
  }
}

/**
 * 运行 Deep Research 工作流（同步版本，已废弃，建议使用流式版本）
 */
export async function runDeepResearch(
  request: DeepResearchRequest
): Promise<DeepResearchResponse> {
  return apiPost<DeepResearchResponse>('/api/smartreport/deep-research/run', request)
}

/**
 * 仅生成 Deep Research 大纲（不执行完整工作流）
 */
export interface GenerateDeepResearchOutlineRequest {
  requirement: string
}

export interface GenerateDeepResearchOutlineResponse {
  title: string
  sections: Array<{
    level1_title: string
    level2_titles: string[]
  }>
  estimated_words: number
  outline_markdown: string
}

export async function generateDeepResearchOutline(
  request: GenerateDeepResearchOutlineRequest
): Promise<GenerateDeepResearchOutlineResponse> {
  return apiPost<GenerateDeepResearchOutlineResponse>(
    '/api/smartreport/deep-research/generate-outline',
    request
  )
}

