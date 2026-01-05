/**
 * 智能问数工具 API
 * 封装该工具的所有 API 调用
 */

import { apiPost, apiPostFormData } from '../../shared/api/client'

export interface AnalysisResult {
  note?: string
  errorMessage?: string
  stored_file_path?: string
  sheets?: Record<
    string,
    {
      file_name: string
      file_path: string
      sheets: Record<
        string,
        {
          summary?: { total_rows?: number; total_columns?: number }
        }
      >
    }
  >
}

export interface CodeGenerationRequest {
  question: string
  file_path: string
  sheets?: AnalysisResult['sheets']
  history?: string
  custom_system_prompt?: string
  custom_user_prompt?: string
}

export interface CodeGenerationResponse {
  code: string
}

export interface CodeExecutionRequest {
  code: string
}

export interface CodeExecutionResponse {
  result?: unknown
  stdout?: string
  errorMessage?: string
}

export interface SummarizationRequest {
  question: string
  result: unknown
  custom_system_prompt?: string
  custom_user_prompt?: string
}

export interface SummarizationResponse {
  markdown: string
}

/**
 * 分析 Excel 文件
 */
export async function analyzeExcel(file: File): Promise<AnalysisResult> {
  const formData = new FormData()
  formData.append('file', file)
  return apiPostFormData<AnalysisResult>('/api/analyze', formData)
}

/**
 * 生成代码
 */
export async function generateCode(
  request: CodeGenerationRequest
): Promise<CodeGenerationResponse> {
  return apiPost<CodeGenerationResponse>('/api/generate-code', request)
}

/**
 * 执行代码
 */
export async function executeCode(
  request: CodeExecutionRequest
): Promise<CodeExecutionResponse> {
  return apiPost<CodeExecutionResponse>('/api/execute-code', request)
}

/**
 * 总结结果
 */
export async function summarizeResult(
  request: SummarizationRequest
): Promise<SummarizationResponse> {
  return apiPost<SummarizationResponse>('/api/summarize-result', request)
}

